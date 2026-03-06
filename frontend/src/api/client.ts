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
