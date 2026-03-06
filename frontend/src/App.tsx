import { useEffect, useState } from 'react';
import { Place, NewPlace } from './types';
import { getPlaces, createPlace } from './api/client';
import { ListView } from './components/ListView';
import { AddPlaceForm } from './components/AddPlaceForm';

export function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getPlaces()
      .then(setPlaces)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
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

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Places</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {showForm ? 'Cancel' : '+ Add Place'}
        </button>
      </header>

      {error && (
        <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 8, marginBottom: 16 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      )}

      {showForm && <AddPlaceForm onSubmit={handleAdd} />}

      {loading ? (
        <p>Loading places...</p>
      ) : (
        <ListView places={places} />
      )}
    </div>
  );
}
