import { Place, NewPlace } from '../types';

const API_URL = import.meta.env.VITE_API_URL as string;
const API_KEY = import.meta.env.VITE_API_KEY as string;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<T>;
}

export function getPlaces(): Promise<Place[]> {
  return request<Place[]>('/places');
}

export function createPlace(place: NewPlace): Promise<Place> {
  return request<Place>('/places', {
    method: 'POST',
    body: JSON.stringify(place),
  });
}

export function updatePlace(id: string, updates: Partial<Place>): Promise<Place> {
  return request<Place>(`/places/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deletePlace(id: string): Promise<void> {
  return fetch(`${API_URL}/places/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  }).then((resp) => {
    if (!resp.ok) throw new Error(`API error ${resp.status}`);
  });
}

export interface AnalyzeResult {
  merged: {
    name: string;
    category: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    google_place_id: string;
    google_maps_url: string;
    source: string;
    notes: string;
  };
}

export function analyzeScreenshot(imageBase64: string): Promise<AnalyzeResult> {
  return request<AnalyzeResult>('/analyze-screenshot', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64 }),
  });
}

export interface ResolvedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_maps_url: string;
  city: string;
}

export function resolveUrl(url: string): Promise<ResolvedPlace> {
  return request<ResolvedPlace>('/resolve-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function uploadImage(imageBase64: string, filename: string): Promise<{ url: string }> {
  return request<{ url: string }>('/upload-image', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, filename }),
  });
}
