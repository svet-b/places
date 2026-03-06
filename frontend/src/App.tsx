import { useEffect, useState, useCallback, useMemo } from 'react';
import { Place, NewPlace } from './types';
import * as api from './api/client';
import { useGeolocation } from './hooks/useGeolocation';
import { loadGoogleMaps } from './loadMaps';
import { ListView } from './components/ListView';
import { MapView } from './components/MapView';
import { AddPlacePanel } from './components/AddPlacePanel';
import { CategoryFilter } from './components/CategoryFilter';
import { PlaceDetail } from './components/PlaceDetail';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    id += chars[b % chars.length];
  }
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

  const geo = useGeolocation();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem('places-sort', sortMode);
  }, [sortMode]);

  useEffect(() => {
    api.getPlaces()
      .then(setPlaces)
      .catch((e) => setToast(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.getPlaces();
      setPlaces(fresh);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to refresh');
    }
  }, []);

  // Derive city list from data
  const cities = useMemo(
    () => [...new Set(places.map((p) => p.city).filter(Boolean))].sort(),
    [places],
  );

  // Filter + sort
  const filteredPlaces = useMemo(() => {
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
  }, [places, activeCategories, activeCity, debouncedSearch, sortMode, geo.location]);

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

    // Upload screenshot in background if provided
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

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          borderBottom: '1px solid #eee',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0, flexShrink: 0 }}>Places</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={refresh}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: showAdd ? '#666' : '#111',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </header>

      {/* City filter + Category filter */}
      <div style={{ padding: '0 16px', flexShrink: 0 }}>
        {cities.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 0' }}>
            <button
              onClick={() => setActiveCity(null)}
              style={{
                padding: '3px 10px',
                borderRadius: 16,
                border: '1px solid #ddd',
                background: activeCity === null ? '#111' : '#fff',
                color: activeCity === null ? '#fff' : '#333',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              All cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => setActiveCity(activeCity === city ? null : city)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 16,
                  border: '1px solid #ddd',
                  background: activeCity === city ? '#111' : '#fff',
                  color: activeCity === city ? '#fff' : '#333',
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {city}
              </button>
            ))}
          </div>
        )}
        <CategoryFilter activeCategories={activeCategories} onToggle={handleToggleCategory} />
      </div>

      {/* Add place panel */}
      {showAdd && (
        <div style={{ padding: '0 16px', flexShrink: 0 }}>
          <AddPlacePanel
            onSubmit={handleAdd}
            onCancel={() => setShowAdd(false)}
            mapsLoaded={mapsLoaded}
          />
        </div>
      )}

      {/* Search + sort (list view only) */}
      {view === 'list' && !showAdd && (
        <div style={{ padding: '4px 16px 0', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{
              padding: '6px 8px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 13,
              background: '#fff',
            }}
          >
            <option value="date">Newest</option>
            <option value="name">A-Z</option>
            {geo.location && <option value="distance">Nearest</option>}
          </select>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 56 }}>
        {loading ? (
          <p style={{ padding: 16, color: '#888' }}>Loading places...</p>
        ) : view === 'list' ? (
          <ListView
            places={filteredPlaces}
            onSelectPlace={handleSelectPlace}
            userLocation={geo.location}
            showDistance={sortMode === 'distance'}
          />
        ) : mapsLoaded ? (
          <MapView
            places={places}
            activeCategories={activeCategories}
            userLocation={geo.location}
            onSelectPlace={handleSelectPlace}
          />
        ) : (
          <p style={{ padding: 16, color: '#888' }}>Loading map...</p>
        )}
      </div>

      {/* Place detail bottom sheet */}
      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onToggleVisited={handleToggleVisited}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Bottom navigation */}
      <BottomNav view={view} onChangeView={setView} />
    </div>
  );
}
