import { useState, useRef } from 'react';
import { NewPlace } from '../types';
import { CATEGORIES } from '../constants';
import * as api from '../api/client';

interface Props {
  onSubmit: (place: NewPlace, imageBase64?: string) => void;
  onCancel: () => void;
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

export function ScreenshotUpload({ onSubmit, onCancel }: Props) {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'restaurant',
    address: '',
    city: '',
    source: '',
    notes: '',
    lat: 0,
    lng: 0,
    google_place_id: '',
    google_maps_url: '',
  });
  const [analyzed, setAnalyzed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setForm({
        name: m.name,
        category: m.category || 'restaurant',
        address: m.address,
        city: m.city,
        source: m.source,
        notes: m.notes,
        lat: m.lat,
        lng: m.lng,
        google_place_id: m.google_place_id,
        google_maps_url: m.google_maps_url,
      });
      setAnalyzed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSave() {
    if (!form.name.trim()) return;
    onSubmit(
      {
        name: form.name.trim(),
        category: form.category,
        address: form.address,
        city: form.city,
        source: form.source,
        notes: form.notes,
        lat: form.lat,
        lng: form.lng,
        google_place_id: form.google_place_id,
        google_maps_url: form.google_maps_url,
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

  return (
    <div style={{ padding: 16, background: '#f9f9f9', borderRadius: 12, marginBottom: 24 }}>
      {/* Image upload / preview */}
      {!imagePreview ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%',
              padding: 24,
              borderRadius: 8,
              border: '2px dashed #ccc',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              color: '#666',
            }}
          >
            Tap to select screenshot
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <img
            src={imagePreview}
            alt="Screenshot"
            style={{
              width: '100%',
              maxHeight: 200,
              objectFit: 'contain',
              borderRadius: 8,
              opacity: analyzing ? 0.5 : 1,
            }}
          />
          {analyzing && (
            <p style={{ textAlign: 'center', color: '#666', fontSize: 14, margin: '8px 0' }}>
              Analyzing screenshot...
            </p>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: '#c00', fontSize: 13, margin: '8px 0' }}>{error}</p>
      )}

      {/* Analyze button (before analysis) */}
      {imageBase64 && !analyzed && !analyzing && (
        <button
          onClick={handleAnalyze}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: 'none',
            background: '#111',
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Analyze Screenshot
        </button>
      )}

      {/* Review form (after analysis) */}
      {analyzed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: 'none',
                background: '#111',
                color: '#fff',
                fontSize: 14,
                cursor: 'pointer',
                opacity: form.name.trim() ? 1 : 0.5,
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
      )}

      {/* Cancel button when no analysis yet */}
      {!analyzed && (
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
      )}
    </div>
  );
}
