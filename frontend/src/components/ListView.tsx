import { Place } from '../types';

interface Props {
  places: Place[];
  onSelectPlace?: (place: Place) => void;
  userLocation?: { lat: number; lng: number } | null;
  showDistance?: boolean;
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

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function ListView({ places, onSelectPlace, userLocation, showDistance }: Props) {
  if (places.length === 0) {
    return <p style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No places yet. Add one to get started!</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {places.map((place) => {
        const dist =
          showDistance && userLocation && place.lat && place.lng
            ? haversineDistance(userLocation.lat, userLocation.lng, Number(place.lat), Number(place.lng))
            : null;

        return (
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
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 600 }}>{place.name}</div>
                {dist !== null && (
                  <span style={{ fontSize: 12, color: '#999', flexShrink: 0, marginLeft: 8 }}>
                    {formatDistance(dist)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#666' }}>
                {[place.category, place.address, place.city].filter(Boolean).join(' · ')}
              </div>
              {place.notes && (
                <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{place.notes}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
