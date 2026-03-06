import { Place } from '../types';

interface Props {
  places: Place[];
  onSelectPlace?: (place: Place) => void;
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

export function ListView({ places, onSelectPlace }: Props) {
  if (places.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No places yet. Add one to get started!</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {places.map((place) => (
        <li
          key={place.id}
          onClick={() => onSelectPlace?.(place)}
          style={{
            padding: 12,
            borderBottom: '1px solid #eee',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            cursor: onSelectPlace ? 'pointer' : undefined,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: CATEGORY_COLORS[place.category] ?? CATEGORY_COLORS.other,
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{place.name}</div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {[place.category, place.address, place.city].filter(Boolean).join(' · ')}
            </div>
            {place.notes && (
              <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{place.notes}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
