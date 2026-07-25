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

interface RawPlace {
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  id: string;
  googleMapsUri: string;
  addressComponents?: { types: string[]; longText: string }[];
  primaryType?: string;
}

const PLACE_FIELDS =
  'places.displayName,places.formattedAddress,places.location,places.id,places.googleMapsUri,places.addressComponents,places.primaryType';

function toResolvedPlace(place: RawPlace, fallbackCity?: string): ResolvedPlace {
  const cityComponent = place.addressComponents?.find((c) => c.types.includes('locality'));
  return {
    name: place.displayName.text,
    address: place.formattedAddress,
    lat: place.location.latitude,
    lng: place.location.longitude,
    google_place_id: place.id,
    google_maps_url: place.googleMapsUri,
    city: cityComponent?.longText ?? fallbackCity ?? '',
    primary_type: place.primaryType,
  };
}

async function placesRequest(env: Env, endpoint: string, body: unknown): Promise<RawPlace | null> {
  const resp = await fetch(`https://places.googleapis.com/v1/places:${endpoint}`, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': PLACE_FIELDS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Places API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { places?: RawPlace[] };
  return data.places?.[0] ?? null;
}

export async function resolvePlace(
  env: Env,
  name: string,
  city?: string,
  near?: { lat: number; lng: number },
): Promise<ResolvedPlace | null> {
  // Coordinates from the source beat a city name: they disambiguate chains and
  // places whose city we guessed wrong.
  const body: Record<string, unknown> = { textQuery: near ? name : city ? `${name} ${city}` : name };
  if (near) {
    body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 2000 } };
  }

  const place = await placesRequest(env, 'searchText', body);
  return place ? toResolvedPlace(place, city) : null;
}

// Used when a Maps URL gives us a pin but no usable name
async function resolveNearby(env: Env, lat: number, lng: number, radius: number): Promise<ResolvedPlace | null> {
  const place = await placesRequest(env, 'searchNearby', {
    locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    rankPreference: 'DISTANCE',
    maxResultCount: 1,
  });
  return place ? toResolvedPlace(place) : null;
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

// maps.app.goo.gl serves a desktop browser an interstitial page (HTTP 200) and
// only redirects for other clients, so don't claim to be a desktop browser.
// These links are shared from the phone app; ask as the phone app's platform.
const SHORTLINK_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Every URL in the redirect chain, first to last. The useful details are spread
// across hops: the ?q= name arrives on the first redirect, coordinates often
// only on a later one.
async function expandUrl(url: string, maxHops = 5): Promise<string[]> {
  const chain = [url];
  let current = url;
  for (let hop = 0; hop < maxHops; hop++) {
    const resp = await fetch(current, {
      redirect: 'manual',
      headers: { 'User-Agent': SHORTLINK_UA, 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const location = resp.headers.get('location');
    if (!location) break;
    current = new URL(location, current).toString();
    chain.push(current);
  }
  return chain;
}

// A shared pin's ?q= is "<name>, <descriptive address>/<postal address>", which
// matches nothing as a single text query. Try the parts that stand a chance.
function queriesFromQ(q: string): string[] {
  const queries: string[] = [];
  const slash = q.indexOf('/');
  if (slash !== -1) {
    const name = q.slice(0, slash).split(',')[0]!.trim();
    const address = q.slice(slash + 1).trim();
    if (name && address) queries.push(`${name}, ${address}`);
  }
  queries.push(q);
  return queries;
}

interface MapsUrlHints {
  queries: string[];
  lat?: number;
  lng?: number;
}

function parseMapsUrl(url: string): MapsUrlHints {
  const hints: MapsUrlHints = { queries: [] };

  try {
    const q = new URL(url).searchParams.get('q');
    if (q) {
      const asCoords = q.match(/^\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (asCoords) {
        hints.lat = Number(asCoords[1]);
        hints.lng = Number(asCoords[2]);
      } else {
        hints.queries.push(...queriesFromQ(q));
      }
    }
  } catch {
    // Not a parseable URL — fall through to the regexes
  }

  // /place/Place+Name/... — often empty (/place//data=...) on shortened links
  const placeMatch = url.match(/\/place\/([^/@?]+)/);
  if (placeMatch && placeMatch[1] !== 'unnamed') {
    hints.queries.push(decodeURIComponent(placeMatch[1]!.replace(/\+/g, ' ')));
  }

  const searchMatch = url.match(/\/search\/([^/@?]+)/);
  if (searchMatch) {
    hints.queries.push(decodeURIComponent(searchMatch[1]!.replace(/\+/g, ' ')));
  }

  // !3d/!4d is the pin itself; @lat,lng is only where the camera happened to
  // be, so prefer the former.
  const pin = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const camera = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coords = pin ?? camera;
  if (coords && hints.lat === undefined) {
    hints.lat = Number(coords[1]);
    hints.lng = Number(coords[2]);
  }

  return hints;
}

function isShortLink(url: string): boolean {
  try {
    return /(^|\.)(goo\.gl|g\.co)$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export async function resolveMapsUrl(env: Env, url: string): Promise<ResolvedPlace | null> {
  // A full maps.google.com URL already carries everything we can learn
  const chain = isShortLink(url) ? await expandUrl(url) : [url];

  const queries: string[] = [];
  let lat: number | undefined;
  let lng: number | undefined;
  for (const hop of chain) {
    const hints = parseMapsUrl(hop);
    for (const q of hints.queries) if (!queries.includes(q)) queries.push(q);
    if (lat === undefined && hints.lat !== undefined) {
      lat = hints.lat;
      lng = hints.lng;
    }
  }

  console.log(`resolve-url: ${url} -> ${chain[chain.length - 1]} at=${lat ?? '-'},${lng ?? '-'} queries=${JSON.stringify(queries)}`);

  const near = lat !== undefined && lng !== undefined ? { lat, lng: lng! } : undefined;

  for (const query of queries) {
    const byName = await resolvePlace(env, query, undefined, near);
    if (byName) return byName;
  }

  // Nothing matched by name, but a pin's coordinates are exact: take the
  // nearest establishment, widening once if need be.
  if (near) {
    for (const radius of [40, 150]) {
      const byLocation = await resolveNearby(env, near.lat, near.lng, radius);
      if (byLocation) return byLocation;
    }
  }

  if (queries.length === 0 && !near) {
    throw new Error("That link didn't contain a place — try opening it and sharing the full URL");
  }

  return null;
}
