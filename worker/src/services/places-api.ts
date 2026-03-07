import { Env } from '../index';

interface ResolvedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_maps_url: string;
  city: string;
}

export async function resolvePlace(env: Env, name: string, city?: string): Promise<ResolvedPlace | null> {
  const query = city ? `${name} ${city}` : name;

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.googleMapsUri,places.addressComponents',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Places API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as {
    places?: {
      displayName: { text: string };
      formattedAddress: string;
      location: { latitude: number; longitude: number };
      id: string;
      googleMapsUri: string;
      addressComponents?: { types: string[]; longText: string }[];
    }[];
  };

  const place = data.places?.[0];
  if (!place) return null;

  const cityComponent = place.addressComponents?.find(
    (c) => c.types.includes('locality'),
  );

  return {
    name: place.displayName.text,
    address: place.formattedAddress,
    lat: place.location.latitude,
    lng: place.location.longitude,
    google_place_id: place.id,
    google_maps_url: place.googleMapsUri,
    city: cityComponent?.longText ?? city ?? '',
  };
}

export interface HoursPeriod {
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number };
}

export interface PlaceHoursInfo {
  openNow: boolean | null;
  periods: HoursPeriod[] | null;
}

// Separate caches with different TTLs
const openNowCache = new Map<string, { openNow: boolean | null; fetchedAt: number }>();
const periodsCache = new Map<string, { periods: HoursPeriod[] | null; fetchedAt: number }>();
const OPEN_NOW_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PERIODS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getPlaceHours(
  env: Env,
  placeIds: string[],
): Promise<Record<string, PlaceHoursInfo>> {
  const now = Date.now();
  const result: Record<string, PlaceHoursInfo> = {};
  const toFetchOpenNow: string[] = [];
  const toFetchPeriods: string[] = [];

  for (const id of placeIds) {
    const cachedNow = openNowCache.get(id);
    const cachedPeriods = periodsCache.get(id);
    const nowValid = cachedNow && now - cachedNow.fetchedAt < OPEN_NOW_TTL_MS;
    const periodsValid = cachedPeriods && now - cachedPeriods.fetchedAt < PERIODS_TTL_MS;

    if (nowValid && periodsValid) {
      result[id] = { openNow: cachedNow.openNow, periods: cachedPeriods.periods };
    } else {
      if (!nowValid) toFetchOpenNow.push(id);
      if (!periodsValid) toFetchPeriods.push(id);
    }
  }

  // Combine IDs that need any fetch — we'll get both fields in one API call
  const toFetch = [...new Set([...toFetchOpenNow, ...toFetchPeriods])];

  const batchSize = 10;
  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (placeId) => {
        try {
          const resp = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
              headers: {
                'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': 'currentOpeningHours.openNow,regularOpeningHours.periods',
              },
            },
          );
          if (!resp.ok) return { placeId, openNow: null as boolean | null, periods: null as HoursPeriod[] | null };
          const data = (await resp.json()) as {
            currentOpeningHours?: { openNow?: boolean };
            regularOpeningHours?: {
              periods?: { open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }[];
            };
          };
          const openNow = data.currentOpeningHours?.openNow ?? null;
          const periods: HoursPeriod[] | null = data.regularOpeningHours?.periods
            ?.filter((p): p is { open: { day: number; hour: number; minute: number }; close: { day: number; hour: number; minute: number } } => !!p.close)
            ?? null;
          return { placeId, openNow, periods };
        } catch {
          return { placeId, openNow: null as boolean | null, periods: null as HoursPeriod[] | null };
        }
      }),
    );
    for (const { placeId, openNow, periods } of results) {
      openNowCache.set(placeId, { openNow, fetchedAt: now });
      periodsCache.set(placeId, { periods, fetchedAt: now });

      // Merge with any existing cached data
      const existingNow = openNowCache.get(placeId)!;
      const existingPeriods = periodsCache.get(placeId)!;
      result[placeId] = { openNow: existingNow.openNow, periods: existingPeriods.periods };
    }
  }

  // Fill in any IDs that had partial cache hits
  for (const id of placeIds) {
    if (!result[id]) {
      const cachedNow = openNowCache.get(id);
      const cachedPeriods = periodsCache.get(id);
      result[id] = {
        openNow: cachedNow?.openNow ?? null,
        periods: cachedPeriods?.periods ?? null,
      };
    }
  }

  return result;
}

export async function resolveMapsUrl(env: Env, url: string): Promise<ResolvedPlace | null> {
  // Follow redirects to get the final URL (handles maps.app.goo.gl short links)
  let finalUrl = url;
  if (url.includes('goo.gl') || url.includes('maps.app')) {
    const resp = await fetch(url, { redirect: 'follow' });
    finalUrl = resp.url;
  }

  // Try to extract a place name or search query from the URL
  let searchQuery = '';

  // Check for ?q= parameter (common in short link redirects)
  try {
    const parsed = new URL(finalUrl);
    const qParam = parsed.searchParams.get('q');
    if (qParam) {
      searchQuery = qParam;
    }
  } catch {
    // not a valid URL, continue with regex
  }

  // URLs like: /place/Place+Name/...
  if (!searchQuery) {
    const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
    if (placeMatch) {
      searchQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }
  }

  // URLs like: /search/query/...
  if (!searchQuery) {
    const searchMatch = finalUrl.match(/\/search\/([^/@]+)/);
    if (searchMatch) {
      searchQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    }
  }

  // Try to extract coordinates as fallback
  const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (!searchQuery && coordMatch) {
    searchQuery = `${coordMatch[1]},${coordMatch[2]}`;
  }

  if (!searchQuery) {
    searchQuery = url;
  }

  return resolvePlace(env, searchQuery);
}
