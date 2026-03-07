import { useEffect, useState, useCallback, useMemo } from 'react';
import { Place, NewPlace } from './types';
import * as api from './api/client';

import { useGeolocation } from './hooks/useGeolocation';
import { loadGoogleMaps } from './loadMaps';
import { ListView } from './components/ListView';
import { MapView } from './components/MapView';
import { AddPlacePanel } from './components/AddPlacePanel';
import { CategoryFilter } from './components/CategoryFilter';
import { MapCategoryFilter } from './components/MapCategoryFilter';
import { OpenHoursFilter, HoursFilterMode, isOpenAtTime } from './components/OpenHoursFilter';
import { PlaceDetail } from './components/PlaceDetail';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RefreshCw, X, Loader2 } from 'lucide-react';

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      onLogin();
    } catch {
      setError('Invalid password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-dvh flex items-center justify-center bg-muted">
      <form onSubmit={handleSubmit} className="bg-background p-8 rounded-2xl shadow-lg w-[300px] text-center">
        <h1 className="text-2xl font-semibold mb-6">Places</h1>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-3"
        />
        {error && <p className="text-destructive text-xs mb-3">{error}</p>}
        <Button type="submit" disabled={loading || !password} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </div>
  );
}

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type SortMode = 'date' | 'name' | 'distance';

export function App() {
  const [authed, setAuthed] = useState(() => !!api.getToken());
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(
    () => (localStorage.getItem('places-sort') as SortMode) || 'date',
  );
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hoursFilterMode, setHoursFilterMode] = useState<HoursFilterMode>('off');
  const [hoursDateTime, setHoursDateTime] = useState<Date | null>(null);
  const [placeHours, setPlaceHours] = useState<Record<string, api.PlaceHoursInfo>>({});
  const [hoursLoading, setHoursLoading] = useState(false);

  const geo = useGeolocation();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('places-sort', sortMode);
  }, [sortMode]);

  useEffect(() => {
    if (!authed) return;
    api.getConfig()
      .then(({ googleMapsKey }) => loadGoogleMaps(googleMapsKey))
      .then(() => setMapsLoaded(true))
      .catch(() => {});
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    api.getPlaces()
      .then(setPlaces)
      .catch((e) => setToast(e.message))
      .finally(() => setLoading(false));
  }, [authed]);

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.getPlaces();
      setPlaces(fresh);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to refresh');
    }
  }, []);

  const cities = useMemo(
    () => [...new Set(places.map((p) => p.city).filter(Boolean))].sort(),
    [places],
  );

  // Places before open-now filtering (used to determine which IDs to query)
  const preFilteredPlaces = useMemo(() => {
    let result = places.filter((p) => activeCategories.has(p.category));

    if (activeCity) {
      result = result.filter((p) => p.city === activeCity);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.cuisine.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          p.source.toLowerCase().includes(q),
      );
    }

    return result;
  }, [places, activeCategories, activeCity, debouncedSearch]);

  // Fetch place hours when filter is activated
  useEffect(() => {
    if (hoursFilterMode === 'off') return;
    const ids = preFilteredPlaces
      .map((p) => p.google_place_id)
      .filter(Boolean);
    if (ids.length === 0) return;

    const uncached = ids.filter((id) => !(id in placeHours));
    if (uncached.length === 0) return;

    setHoursLoading(true);
    api.getPlaceHours(uncached)
      .then((hours) => {
        setPlaceHours((prev) => ({ ...prev, ...hours }));
      })
      .catch(() => setToast('Failed to check opening hours'))
      .finally(() => setHoursLoading(false));
  }, [hoursFilterMode, preFilteredPlaces]);

  const filteredPlaces = useMemo(() => {
    let result = preFilteredPlaces;

    if (hoursFilterMode === 'now') {
      result = result.filter((p) => {
        if (!p.google_place_id) return false;
        return placeHours[p.google_place_id]?.openNow === true;
      });
    } else if (hoursFilterMode === 'at' && hoursDateTime) {
      result = result.filter((p) => {
        if (!p.google_place_id) return false;
        const info = placeHours[p.google_place_id];
        if (!info?.periods) return false;
        return isOpenAtTime(info.periods, hoursDateTime);
      });
    }

    if (sortMode === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'distance' && geo.location) {
      result = [...result].sort((a, b) => {
        const da = a.lat && a.lng ? haversineDistance(geo.location!.lat, geo.location!.lng, Number(a.lat), Number(a.lng)) : Infinity;
        const db = b.lat && b.lng ? haversineDistance(geo.location!.lat, geo.location!.lng, Number(b.lat), Number(b.lng)) : Infinity;
        return da - db;
      });
    } else {
      result = [...result].sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));
    }

    return result;
  }, [preFilteredPlaces, hoursFilterMode, placeHours, hoursDateTime, sortMode, geo.location]);

  const handleAdd = useCallback(async (newPlace: NewPlace, imageBase64?: string) => {
    const id = generateId();
    const place: Place = {
      id,
      name: newPlace.name,
      priority: newPlace.priority ?? 2,
      category: newPlace.category || 'other',
      cuisine: newPlace.cuisine ?? '',
      address: newPlace.address ?? '',
      lat: newPlace.lat ?? 0,
      lng: newPlace.lng ?? 0,
      google_place_id: newPlace.google_place_id ?? '',
      google_maps_url: newPlace.google_maps_url ?? '',
      source: newPlace.source ?? '',
      list: newPlace.list ?? '',
      notes: newPlace.notes ?? '',
      visited: false,
      date_added: new Date().toISOString().split('T')[0] ?? '',
      screenshot_url: '',
      city: newPlace.city || 'Paris',
    };

    setPlaces((prev) => [place, ...prev]);
    setShowAdd(false);

    try {
      await api.createPlace(place);
    } catch {
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      setToast('Failed to add place');
      return;
    }

    if (imageBase64) {
      try {
        const { url } = await api.uploadImage(imageBase64, `${id}.jpg`);
        await api.updatePlace(id, { screenshot_url: url });
        setPlaces((prev) =>
          prev.map((p) => (p.id === id ? { ...p, screenshot_url: url } : p)),
        );
      } catch {
        setToast('Place saved but screenshot upload failed');
      }
    }
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<Place>) => {
    let snapshot: Place | undefined;

    setPlaces((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          snapshot = p;
          return { ...p, ...updates };
        }
        return p;
      }),
    );

    setSelectedPlace((prev) => {
      if (prev?.id === id) {
        return { ...prev, ...updates };
      }
      return prev;
    });

    api.updatePlace(id, updates).catch(() => {
      if (snapshot) {
        setPlaces((prev) => prev.map((p) => (p.id === id ? snapshot! : p)));
        setSelectedPlace((prev) => (prev?.id === id ? snapshot! : prev));
      }
      setToast('Failed to save changes');
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    let snapshot: Place | undefined;
    let index = -1;

    setPlaces((prev) => {
      index = prev.findIndex((p) => p.id === id);
      if (index !== -1) snapshot = prev[index];
      return prev.filter((p) => p.id !== id);
    });

    api.deletePlace(id).catch(() => {
      if (snapshot) {
        setPlaces((prev) => {
          const next = [...prev];
          next.splice(index, 0, snapshot!);
          return next;
        });
      }
      setToast('Failed to delete place');
    });
  }, []);

  const handleToggleVisited = useCallback((place: Place) => {
    handleUpdate(place.id, { visited: !place.visited });
  }, [handleUpdate]);

  function handleToggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  const handleSelectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 pt-[max(12px,env(safe-area-inset-top))] border-b border-border shrink-0 gap-2">
        <h1 className="text-lg font-semibold shrink-0">Places</h1>
        <div className="flex gap-1.5">
          <Button variant="outline" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {showAdd && (
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </header>

      {/* Inline filters (list view) */}
      {view === 'list' && (
        <div className="shrink-0">
          {cities.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto py-1.5 px-4">
              <button
                onClick={() => setActiveCity(null)}
                className={`px-2.5 py-0.5 rounded-full border text-xs cursor-pointer whitespace-nowrap transition-colors ${
                  activeCity === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                }`}
              >
                All cities
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setActiveCity(activeCity === city ? null : city)}
                  className={`px-2.5 py-0.5 rounded-full border text-xs cursor-pointer whitespace-nowrap transition-colors ${
                    activeCity === city
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-4 shrink-0">
            <CategoryFilter activeCategories={activeCategories} onToggle={handleToggleCategory} />
          </div>
          <div className="px-4 pb-2">
            <OpenHoursFilter
              variant="inline"
              mode={hoursFilterMode}
              onChangeMode={(mode) => {
                setHoursFilterMode(mode);
                if (mode === 'now') setPlaceHours({});
              }}
              selectedDateTime={hoursDateTime}
              onChangeDateTime={setHoursDateTime}
              loading={hoursLoading}
            />
          </div>
        </div>
      )}

      {/* Add place panel */}
      {showAdd && (
        <div className="px-4 shrink-0">
          <AddPlacePanel
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            mapsLoaded={mapsLoaded}
          />
        </div>
      )}

      {/* Search + sort (list view only) */}
      {view === 'list' && !showAdd && (
        <div className="px-4 pt-1 flex gap-2 shrink-0">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1"
          />
          <Select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="w-auto"
          >
            <option value="date">Newest</option>
            <option value="name">A-Z</option>
            {geo.location && <option value="distance">Nearest</option>}
          </Select>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto pb-14 relative">
        {/* Floating map filters */}
        {view === 'map' && !loading && (
          <div className="absolute top-2 left-3 z-10 flex gap-2 items-start">
            <MapCategoryFilter activeCategories={activeCategories} onToggle={handleToggleCategory} />
            <OpenHoursFilter
              variant="floating"
              mode={hoursFilterMode}
              onChangeMode={(mode) => {
                setHoursFilterMode(mode);
                if (mode === 'now') setPlaceHours({});
              }}
              selectedDateTime={hoursDateTime}
              onChangeDateTime={setHoursDateTime}
              loading={hoursLoading}
            />
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading places...
          </div>
        ) : view === 'list' ? (
          <ListView
            places={filteredPlaces}
            onSelectPlace={handleSelectPlace}
            userLocation={geo.location}
            showDistance={sortMode === 'distance'}
          />
        ) : mapsLoaded ? (
          <MapView
            places={hoursFilterMode !== 'off' ? filteredPlaces : places}
            activeCategories={activeCategories}
            userLocation={geo.location}
            onSelectPlace={handleSelectPlace}
          />
        ) : (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading map...
          </div>
        )}
      </div>

      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onToggleVisited={handleToggleVisited}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BottomNav view={view} onChangeView={setView} onAdd={() => setShowAdd(true)} />
    </div>
  );
}
