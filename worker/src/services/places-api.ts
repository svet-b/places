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

  // Try to extract city from address components
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
