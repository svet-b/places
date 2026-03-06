import { useEffect, useState, useCallback } from 'react';
import { Place, NewPlace } from './types';
import * as api from './api/client';
import { CATEGORIES } from './constants';
import { useGeolocation } from './hooks/useGeolocation';
import { loadGoogleMaps } from './loadMaps';
import { ListView } from './components/ListView';
import { MapView } from './components/MapView';
import { AddPlaceForm } from './components/AddPlaceForm';
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

export function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('list');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const geo = useGeolocation();

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

  const handleAdd = useCallback(async (newPlace: NewPlace) => {
    const place: Place = {
      id: generateId(),
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
      city: newPlace.city ?? '',
    };

    // Optimistic add
    setPlaces((prev) => [place, ...prev]);
    setShowForm(false);

    try {
      await api.createPlace(place);
    } catch {
      setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      setToast('Failed to add place');
    }
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<Place>) => {
    // Save snapshot for rollback
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

    // Update selectedPlace if it's the one being edited
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

  const filteredPlaces = places.filter((p) => activeCategories.has(p.category));

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
        }}
      >
        <h1 style={{ fontSize: 20, margin: 0 }}>Places</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: 'none',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </header>

      {/* Category filter */}
      <div style={{ padding: '0 16px', flexShrink: 0 }}>
        <CategoryFilter activeCategories={activeCategories} onToggle={handleToggleCategory} />
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ padding: '0 16px' }}>
          <AddPlaceForm onSubmit={handleAdd} />
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 56 }}>
        {loading ? (
          <p style={{ padding: 16, color: '#888' }}>Loading places...</p>
        ) : view === 'list' ? (
          <ListView places={filteredPlaces} onSelectPlace={handleSelectPlace} />
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
