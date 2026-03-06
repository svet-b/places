import { Place } from '../types';

interface Props {
  place: Place;
  onClose: () => void;
  onToggleVisited: (place: Place) => void;
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

export function PlaceDetail({ place, onClose, onToggleVisited }: Props) {
  const color = CATEGORY_COLORS[place.category] ?? CATEGORY_COLORS.other;
  const mapsUrl =
    place.google_maps_url ||
    (place.lat && place.lng
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : null);

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
        maxHeight: '60vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
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

      {place.notes && (
        <p style={{ margin: '8px 0', fontSize: 14, color: '#333', fontStyle: 'italic' }}>{place.notes}</p>
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
    </div>
  );
}
