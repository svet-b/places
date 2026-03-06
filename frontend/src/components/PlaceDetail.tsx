import { useState } from 'react';
import { Place } from '../types';
import { CATEGORIES } from '../constants';

interface Props {
  place: Place;
  onClose: () => void;
  onToggleVisited: (place: Place) => void;
  onUpdate: (id: string, updates: Partial<Place>) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  coffee: '#8B4513',
  restaurant: '#DC143C',
  bar: '#4B0082',
  bakery: '#D2691E',
  shop: '#2E8B57',
  park: '#228B22',
  culture: '#4169E1',
  other: '#708090',
};

export function PlaceDetail({ place, onClose, onToggleVisited, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    name: place.name,
    category: place.category,
    priority: place.priority,
    cuisine: place.cuisine,
    address: place.address,
    city: place.city,
    source: place.source,
    list: place.list,
    notes: place.notes,
  });

  const color = CATEGORY_COLORS[place.category] ?? CATEGORY_COLORS.other;
  const mapsUrl =
    place.google_maps_url ||
    (place.lat && place.lng
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : null);

  function handleSave() {
    const changes: Partial<Place> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value !== place[key as keyof Place]) {
        (changes as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(changes).length > 0) {
      onUpdate(place.id, changes);
    }
    setEditing(false);
  }

  function handleDelete() {
    onDelete(place.id);
    onClose();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 6,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 2,
    fontSize: 12,
    fontWeight: 500,
    color: '#888',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        padding: 20,
        zIndex: 1000,
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          ) : (
            <>
              <h2 style={{ margin: 0, fontSize: 20 }}>{place.name}</h2>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: 12,
                  background: color,
                  color: '#fff',
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {place.category}
              </span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#999',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {editing ? (
        /* Edit mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
              <option value={1}>1 (High)</option>
              <option value={2}>2 (Medium)</option>
              <option value={3}>3 (Low)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Cuisine</label>
            <input style={inputStyle} value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Source</label>
            <input style={inputStyle} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>List</label>
            <input style={inputStyle} value={form.list} onChange={(e) => setForm({ ...form, list: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: 'none',
                background: '#111',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* View mode */
        <>
          {place.address && (
            <p style={{ margin: '8px 0', fontSize: 14, color: '#555' }}>{place.address}</p>
          )}

          {place.city && (
            <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>{place.city}</p>
          )}

          {place.cuisine && (
            <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>Cuisine: {place.cuisine}</p>
          )}

          {place.source && (
            <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>Source: {place.source}</p>
          )}

          {place.list && (
            <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>List: {place.list}</p>
          )}

          {place.notes && (
            <p style={{ margin: '8px 0', fontSize: 14, color: '#333', fontStyle: 'italic' }}>{place.notes}</p>
          )}

          {place.screenshot_url && (
            <img
              src={place.screenshot_url}
              alt="Screenshot"
              loading="lazy"
              style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginTop: 8 }}
            />
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={() => onToggleVisited(place)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ccc',
                background: place.visited ? '#e8f5e9' : '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {place.visited ? 'Visited ✓' : 'Mark visited'}
            </button>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: 'none',
                  background: '#111',
                  color: '#fff',
                  textAlign: 'center',
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                Open in Maps
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => setEditing(true)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #fcc',
                background: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                color: '#c00',
              }}
            >
              Delete
            </button>
          </div>

          {/* Delete confirmation */}
          {confirmDelete && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: '#fff5f5',
                borderRadius: 8,
                border: '1px solid #fcc',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 14 }}>Delete "{place.name}"?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 6,
                    border: 'none',
                    background: '#c00',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
