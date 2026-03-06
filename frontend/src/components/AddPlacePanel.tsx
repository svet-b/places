import { useState, useRef, useEffect } from 'react';
import { NewPlace } from '../types';
import { CATEGORIES } from '../constants';
import * as api from '../api/client';

interface Props {
  onSubmit: (place: NewPlace, imageBase64?: string) => void;
  onCancel: () => void;
  mapsLoaded: boolean;
}

async function compressImage(file: File, maxSize = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl.replace(/^data:image\/[^;]+;base64,/, ''));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

interface PlaceIdentity {
  name: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_maps_url: string;
  city: string;
}

export function AddPlacePanel({ onSubmit, onCancel, mapsLoaded }: Props) {
  // Place identity (populated by screenshot/URL/search)
  const [identity, setIdentity] = useState<PlaceIdentity | null>(null);

  // Screenshot state
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // URL state
  const [mapsUrl, setMapsUrl] = useState('');
  const [resolvingUrl, setResolvingUrl] = useState(false);

  // Metadata (user-editable)
  const [priority, setPriority] = useState(2);
  const [category, setCategory] = useState('restaurant');
  const [cuisine, setCuisine] = useState('');
  const [source, setSource] = useState('');
  const [list, setList] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Set up Google Places Autocomplete on the search input
  useEffect(() => {
    if (!mapsLoaded || !searchInputRef.current || autocompleteRef.current) return;
    if (!google.maps.places?.Autocomplete) return;

    const ac = new google.maps.places.Autocomplete(searchInputRef.current, {
      types: ['establishment'],
      fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components', 'url'],
      componentRestrictions: { country: 'fr' },
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;

      const cityComp = place.address_components?.find(
        (c) => c.types.includes('locality'),
      );

      setIdentity({
        name: place.name ?? '',
        address: place.formatted_address ?? '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        google_place_id: place.place_id ?? '',
        google_maps_url: place.url ?? '',
        city: cityComp?.long_name ?? 'Paris',
      });
    });

    autocompleteRef.current = ac;
  }, [mapsLoaded]);

  // Screenshot handling
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    try {
      const base64 = await compressImage(file);
      setImageBase64(base64);
    } catch {
      setError('Failed to process image');
    }
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await api.analyzeScreenshot(imageBase64);
      const m = result.merged;
      setIdentity({
        name: m.name,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        google_place_id: m.google_place_id,
        google_maps_url: m.google_maps_url,
        city: m.city || 'Paris',
      });
      if (m.category) setCategory(m.category);
      if (m.source) setSource(m.source);
      if (m.notes) setNotes(m.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  // URL handling
  async function handleResolveUrl() {
    if (!mapsUrl.trim()) return;
    setResolvingUrl(true);
    setError(null);
    try {
      const resolved = await api.resolveUrl(mapsUrl.trim());
      setIdentity({
        name: resolved.name,
        address: resolved.address,
        lat: resolved.lat,
        lng: resolved.lng,
        google_place_id: resolved.google_place_id,
        google_maps_url: resolved.google_maps_url,
        city: resolved.city || 'Paris',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve URL');
    } finally {
      setResolvingUrl(false);
    }
  }

  function handleSave() {
    if (!identity?.name?.trim()) return;
    onSubmit(
      {
        name: identity.name.trim(),
        category,
        cuisine,
        address: identity.address,
        city: identity.city || 'Paris',
        lat: identity.lat,
        lng: identity.lng,
        google_place_id: identity.google_place_id,
        google_maps_url: identity.google_maps_url,
        source,
        list,
        notes,
        priority,
      },
      imageBase64 ?? undefined,
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: '#444',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: '1px solid #eee',
  };

  const identified = identity !== null;

  return (
    <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 12, marginBottom: 16, maxHeight: '70vh', overflowY: 'auto' }}>
      {!identified ? (
        <>
          {/* Step 1: Identify the place */}
          <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#333' }}>
            Find the place
          </p>

          {/* Screenshot upload */}
          <div style={sectionStyle}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {!imagePreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 8,
                  border: '2px dashed #ccc',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#666',
                }}
              >
                Upload screenshot
              </button>
            ) : (
              <div>
                <img
                  src={imagePreview}
                  alt="Screenshot"
                  style={{
                    width: '100%',
                    maxHeight: 150,
                    objectFit: 'contain',
                    borderRadius: 8,
                    opacity: analyzing ? 0.5 : 1,
                  }}
                />
                {analyzing ? (
                  <p style={{ textAlign: 'center', color: '#666', fontSize: 13, margin: '8px 0 0' }}>
                    Analyzing...
                  </p>
                ) : (
                  <button
                    onClick={handleAnalyze}
                    style={{
                      width: '100%',
                      padding: 8,
                      borderRadius: 6,
                      border: 'none',
                      background: '#111',
                      color: '#fff',
                      fontSize: 13,
                      cursor: 'pointer',
                      marginTop: 8,
                    }}
                  >
                    Analyze Screenshot
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Google Maps URL */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Google Maps URL</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="Paste a Google Maps link"
              />
              <button
                onClick={handleResolveUrl}
                disabled={!mapsUrl.trim() || resolvingUrl}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#111',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                  opacity: mapsUrl.trim() && !resolvingUrl ? 1 : 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {resolvingUrl ? '...' : 'Go'}
              </button>
            </div>
          </div>

          {/* Google Maps search */}
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Search by name</label>
            <input
              ref={searchInputRef}
              style={inputStyle}
              placeholder="Search for a place..."
            />
          </div>

          {error && (
            <p style={{ color: '#c00', fontSize: 13, margin: '8px 0' }}>{error}</p>
          )}

          <button
            onClick={onCancel}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ccc',
              background: '#fff',
              fontSize: 14,
              cursor: 'pointer',
              marginTop: 8,
            }}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          {/* Step 2: Review & add metadata */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>{identity.name}</p>
            {identity.address && (
              <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{identity.address}</p>
            )}
            <button
              onClick={() => setIdentity(null)}
              style={{
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid #ddd',
                background: '#fff',
                fontSize: 12,
                cursor: 'pointer',
                color: '#666',
              }}
            >
              Change place
            </button>
          </div>

          {imagePreview && (
            <img
              src={imagePreview}
              alt="Screenshot"
              style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 8, marginBottom: 12 }}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Category</label>
                <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                  <option value={1}>1 (High)</option>
                  <option value={2}>2 (Medium)</option>
                  <option value={3}>3 (Low)</option>
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Cuisine</label>
              <input style={inputStyle} value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Italian, French, etc." />
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <input style={inputStyle} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram — @account" />
            </div>
            <div>
              <label style={labelStyle}>List</label>
              <input style={inputStyle} value={list} onChange={(e) => setList(e.target.value)} placeholder="50 best coffee shops in Paris" />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tiny but excellent"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: 'none',
                  background: '#111',
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Save Place
              </button>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid #ccc',
                  background: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: '#c00', fontSize: 13, margin: '8px 0' }}>{error}</p>
          )}
        </>
      )}
    </div>
  );
}
