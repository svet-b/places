import { useEffect, useState, useCallback } from 'react';
import { Place, NewPlace } from './types';
import { getPlaces, createPlace } from './api/client';
import { CATEGORIES } from './constants';
import { useGeolocation } from './hooks/useGeolocation';
import { loadGoogleMaps } from './loadMaps';
import { ListView } from './components/ListView';
import { MapView } from './components/MapView';
import { AddPlaceForm } from './components/AddPlaceForm';
import { CategoryFilter } from './components/CategoryFilter';
import { PlaceDetail } from './components/PlaceDetail';
import { BottomNav } from './components/BottomNav';

export function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('list');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const geo = useGeolocation();

  useEffect(() => {
    getPlaces()
      .then(setPlaces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(() => {
        // Maps will just not be available
      });
  }, []);

  async function handleAdd(newPlace: NewPlace) {
    try {
      const created = await createPlace(newPlace);
      setPlaces((prev) => [created, ...prev]);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add place');
    }
  }

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

  function handleToggleVisited(place: Place) {
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === place.id ? { ...p, visited: !p.visited } : p,
      ),
    );
    setSelectedPlace((prev) =>
      prev?.id === place.id ? { ...prev, visited: !prev.visited } : prev,
    );
    // TODO: persist via PUT /places/:id in Phase 3
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

      {/* Error */}
      {error && (
        <div style={{ padding: 12, margin: '0 16px', background: '#fee', color: '#c00', borderRadius: 8 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

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
        />
      )}

      {/* Bottom navigation */}
      <BottomNav view={view} onChangeView={setView} />
    </div>
  );
}
