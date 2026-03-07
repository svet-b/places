import { useState } from 'react';
import { Place } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../constants';

interface Props {
  place: Place;
  onClose: () => void;
  onToggleVisited: (place: Place) => void;
  onUpdate: (id: string, updates: Partial<Place>) => void;
  onDelete: (id: string) => void;
}

export function PlaceDetail({ place, onClose, onToggleVisited, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [screenshotEnlarged, setScreenshotEnlarged] = useState(false);
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

  const cat = CATEGORY_MAP[place.category] ?? CATEGORY_MAP['other']!;
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
    padding: 8,
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#999',
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
        maxHeight: '75vh',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${cat.color}15`,
                  border: `1px solid ${cat.color}30`,
                }}>
                  {cat.emoji}
                </div>
                <span style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 8,
                  background: `${cat.color}15`,
                  color: cat.color,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}>
                  {cat.label}
                </span>
              </div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{place.name}</h2>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#f5f5f5',
            border: 'none',
            width: 32,
            height: 32,
            borderRadius: 8,
            fontSize: 18,
            cursor: 'pointer',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flexShrink: 0,
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
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
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
                flex: 1, padding: 10, borderRadius: 8,
                border: 'none', background: '#111', color: '#fff',
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
              }}
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                flex: 1, padding: 10, borderRadius: 8,
                border: '1px solid #ddd', background: '#fff',
                cursor: 'pointer', fontSize: 14,
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
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>{place.address}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {place.cuisine && <Field label="Cuisine" value={place.cuisine} />}
            {place.source && <Field label="Source" value={place.source} />}
            {place.list && <Field label="List" value={place.list} />}
            {place.notes && <Field label="Notes" value={place.notes} />}
            {place.date_added && <Field label="Added" value={place.date_added} />}
          </div>

          {/* Visited toggle */}
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => onToggleVisited(place)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 10,
                border: `1.5px solid ${place.visited ? '#22C55E40' : '#ddd'}`,
                background: place.visited ? 'rgba(34,197,94,0.08)' : '#fafafa',
                color: place.visited ? '#22C55E' : '#666',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                width: '100%',
                justifyContent: 'center',
              }}
            >
              {place.visited ? '✓ Visited' : 'Mark as visited'}
            </button>
          </div>

          {place.screenshot_url && (
            <>
              <img
                src={place.screenshot_url}
                alt="Screenshot"
                loading="lazy"
                onClick={() => setScreenshotEnlarged(true)}
                style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginTop: 12, cursor: 'pointer' }}
              />
              {screenshotEnlarged && (
                <div
                  onClick={() => setScreenshotEnlarged(false)}
                  style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  <img src={place.screenshot_url} alt="Screenshot" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }} />
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, padding: 10, borderRadius: 8,
                  border: 'none', background: '#111', color: '#fff',
                  textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in Maps
              </a>
            )}
            <button
              onClick={() => setEditing(true)}
              style={{
                flex: 1, padding: 10, borderRadius: 8,
                border: '1px solid #ddd', background: '#fff',
                cursor: 'pointer', fontSize: 13,
              }}
            >
              Edit
            </button>
          </div>

          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              marginTop: 8, padding: 10, borderRadius: 8,
              border: '1px solid rgba(232,93,74,0.2)', background: 'rgba(232,93,74,0.05)',
              cursor: 'pointer', fontSize: 12, color: '#E85D4A', fontWeight: 600,
              width: '100%',
            }}
          >
            Remove
          </button>

          {confirmDelete && (
            <div style={{ marginTop: 12, padding: 12, background: '#fff5f5', borderRadius: 8, border: '1px solid #fcc' }}>
              <p style={{ margin: '0 0 8px', fontSize: 14 }}>Delete &ldquo;{place.name}&rdquo;?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDelete}
                  style={{
                    flex: 1, padding: 8, borderRadius: 6,
                    border: 'none', background: '#c00', color: '#fff',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, padding: 8, borderRadius: 6,
                    border: '1px solid #ccc', background: '#fff',
                    cursor: 'pointer', fontSize: 13,
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 3, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: '#333' }}>{value}</div>
    </div>
  );
}
