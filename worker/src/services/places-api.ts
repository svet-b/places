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

export async function resolveMapsUrl(env: Env, url: string): Promise<ResolvedPlace | null> {
  // Follow redirects to get the final URL (handles maps.app.goo.gl short links)
  let finalUrl = url;
  if (url.includes('goo.gl') || url.includes('maps.app')) {
    const resp = await fetch(url, { redirect: 'follow' });
    finalUrl = resp.url;
  }

  // Try to extract a place name or search query from the URL
  // URLs look like: https://www.google.com/maps/place/Place+Name/...
  // or: https://www.google.com/maps/search/query/...
  let searchQuery = '';

  const placeMatch = finalUrl.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    searchQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  const searchMatch = finalUrl.match(/\/search\/([^/@]+)/);
  if (!searchQuery && searchMatch) {
    searchQuery = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
  }

  // Try to extract coordinates as additional context
  const coordMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  if (!searchQuery && coordMatch) {
    // If we only have coordinates, use reverse geocoding via text search
    searchQuery = `${coordMatch[1]},${coordMatch[2]}`;
  }

  if (!searchQuery) {
    // Last resort: use the whole URL as a text search query
    searchQuery = url;
  }

  return resolvePlace(env, searchQuery);
}
