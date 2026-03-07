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

// In-memory cache: google_place_id -> { openNow: boolean | null, fetchedAt: number }
const openStatusCache = new Map<string, { openNow: boolean | null; fetchedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getOpenStatus(
  env: Env,
  placeIds: string[],
): Promise<Record<string, boolean | null>> {
  const now = Date.now();
  const result: Record<string, boolean | null> = {};
  const toFetch: string[] = [];

  for (const id of placeIds) {
    const cached = openStatusCache.get(id);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      result[id] = cached.openNow;
    } else {
      toFetch.push(id);
    }
  }

  // Fetch in parallel, max 10 concurrent to be safe
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
                'X-Goog-FieldMask': 'currentOpeningHours.openNow',
              },
            },
          );
          if (!resp.ok) return { placeId, openNow: null as boolean | null };
          const data = (await resp.json()) as {
            currentOpeningHours?: { openNow?: boolean };
          };
          const openNow = data.currentOpeningHours?.openNow ?? null;
          return { placeId, openNow };
        } catch {
          return { placeId, openNow: null as boolean | null };
        }
      }),
    );
    for (const { placeId, openNow } of results) {
      result[placeId] = openNow;
      openStatusCache.set(placeId, { openNow, fetchedAt: now });
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
