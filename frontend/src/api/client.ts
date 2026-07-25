import { Place, NewPlace } from '../types';

const API_URL = import.meta.env.VITE_API_URL as string;
const TOKEN_KEY = 'places-auth-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(password: string): Promise<void> {
  const resp = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!resp.ok) {
    throw new Error('Invalid password');
  }

  const data = (await resp.json()) as { token: string };
  setToken(data.token);
}

export async function getConfig(): Promise<{ googleMapsKey: string; spreadsheetUrl?: string }> {
  return request<{ googleMapsKey: string; spreadsheetUrl?: string }>('/config');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const resp = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (resp.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired');
  }

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
  const token = getToken();
  return fetch(`${API_URL}/places/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((resp) => {
    if (resp.status === 401) {
      clearToken();
      window.location.reload();
      throw new Error('Session expired');
    }
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

// `city` is a hint for place resolution, used when the post/screenshot itself
// doesn't say which city the place is in.
export function analyzeInstagram(url: string, city?: string): Promise<AnalyzeResult> {
  return request<AnalyzeResult>('/analyze-instagram', {
    method: 'POST',
    body: JSON.stringify({ url, city }),
  });
}

export function analyzeScreenshot(imageBase64: string, city?: string): Promise<AnalyzeResult> {
  return request<AnalyzeResult>('/analyze-screenshot', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, city }),
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
  primary_type?: string;
}

export function resolveUrl(url: string): Promise<ResolvedPlace> {
  return request<ResolvedPlace>('/resolve-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export interface HoursPeriod {
  open: { day: number; hour: number; minute: number };
  close: { day: number; hour: number; minute: number };
}

export interface PlaceHoursInfo {
  openNow: boolean | null;
  periods: HoursPeriod[] | null;
  alwaysOpen?: boolean;
}

// The worker makes one Google call per uncached place, so it caps a batch at
// 50. Stay under that — callers should chunk with HOURS_BATCH_SIZE.
export const HOURS_BATCH_SIZE = 40;

export function getPlaceHours(placeIds: string[]): Promise<Record<string, PlaceHoursInfo>> {
  return request<Record<string, PlaceHoursInfo>>('/places/hours', {
    method: 'POST',
    body: JSON.stringify({ placeIds }),
  });
}

export interface FillMissingResult {
  total: number;
  matched: number;
  failed: number;
  failures: string[];
}

export function fillMissingData(): Promise<FillMissingResult> {
  return request<FillMissingResult>('/places/fill-missing', {
    method: 'POST',
  });
}

export function uploadImage(imageBase64: string, filename: string): Promise<{ url: string }> {
  return request<{ url: string }>('/upload-image', {
    method: 'POST',
    body: JSON.stringify({ image: imageBase64, filename }),
  });
}
