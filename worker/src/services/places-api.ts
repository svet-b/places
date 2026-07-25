import { Env } from '../index';

interface ResolvedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_maps_url: string;
  city: string;
  primary_type?: string;
}

export async function resolvePlace(env: Env, name: string, city?: string): Promise<ResolvedPlace | null> {
  const query = city ? `${name} ${city}` : name;

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.id,places.googleMapsUri,places.addressComponents,places.primaryType',
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
      primaryType?: string;
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
    primary_type: place.primaryType,
  };
}

export interface HoursPeriod {
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number };
}

export interface PlaceHoursInfo {
  openNow: boolean | null;
  periods: HoursPeriod[] | null;
  // Google reports a 24/7 place as a single period with no close time, which
  // no list of periods can express — flag it instead.
  alwaysOpen?: boolean;
}

// Separate caches with different TTLs
const openNowCache = new Map<string, { openNow: boolean | null; fetchedAt: number }>();
const periodsCache = new Map<string, { periods: HoursPeriod[] | null; alwaysOpen: boolean; fetchedAt: number }>();
const OPEN_NOW_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PERIODS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type HoursFetch =
  | { status: 'ok'; openNow: boolean | null; periods: HoursPeriod[] | null; alwaysOpen: boolean }
  // Google answered, but has no hours for this place (or the id is stale) — a
  // real answer, safe to cache.
  | { status: 'no-data' }
  // Transient: rate limit, 5xx, network. Must NOT be cached as "no hours",
  // otherwise one blip hides an open place for the rest of the TTL.
  | { status: 'failed' };

async function fetchHours(env: Env, placeId: string): Promise<HoursFetch> {
  let resp: Response;
  try {
    resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'currentOpeningHours.openNow,regularOpeningHours.periods',
      },
    });
  } catch (e) {
    console.error(`hours: network error for ${placeId}`, e);
    return { status: 'failed' };
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`hours: ${resp.status} for ${placeId} ${body.slice(0, 200)}`);
    return resp.status === 429 || resp.status >= 500 ? { status: 'failed' } : { status: 'no-data' };
  }

  try {
    const data = (await resp.json()) as {
      currentOpeningHours?: { openNow?: boolean };
      regularOpeningHours?: {
        periods?: { open: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }[];
      };
    };
    const rawPeriods = data.regularOpeningHours?.periods;
    return {
      status: 'ok',
      openNow: data.currentOpeningHours?.openNow ?? null,
      periods: rawPeriods?.filter((p): p is HoursPeriod => !!p.close) ?? null,
      alwaysOpen: !!rawPeriods?.some((p) => !p.close),
    };
  } catch (e) {
    console.error(`hours: bad response body for ${placeId}`, e);
    return { status: 'failed' };
  }
}

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
      result[id] = {
        openNow: cachedNow.openNow,
        periods: cachedPeriods.periods,
        alwaysOpen: cachedPeriods.alwaysOpen,
      };
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
      batch.map(async (placeId) => ({ placeId, fetched: await fetchHours(env, placeId) })),
    );
    for (const { placeId, fetched } of results) {
      if (fetched.status === 'ok') {
        openNowCache.set(placeId, { openNow: fetched.openNow, fetchedAt: now });
        periodsCache.set(placeId, { periods: fetched.periods, alwaysOpen: fetched.alwaysOpen, fetchedAt: now });
      } else if (fetched.status === 'no-data') {
        openNowCache.set(placeId, { openNow: null, fetchedAt: now });
        periodsCache.set(placeId, { periods: null, alwaysOpen: false, fetchedAt: now });
      }
      // 'failed' leaves the cache untouched, so the next request retries and
      // any previously fetched (stale) hours below are still served.
    }
  }

  // Fill in IDs still missing: partial cache hits, and anything whose refresh
  // failed but that we have older data for. IDs we know nothing about are left
  // out entirely — the client shows them as unknown rather than as closed.
  for (const id of placeIds) {
    if (result[id]) continue;
    const cachedNow = openNowCache.get(id);
    const cachedPeriods = periodsCache.get(id);
    if (!cachedNow && !cachedPeriods) continue;
    result[id] = {
      openNow: cachedNow?.openNow ?? null,
      periods: cachedPeriods?.periods ?? null,
      alwaysOpen: cachedPeriods?.alwaysOpen ?? false,
    };
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
