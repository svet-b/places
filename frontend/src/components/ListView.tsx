import { Place } from '../types';
import { CATEGORY_MAP } from '../constants';

interface Props {
  places: Place[];
  onSelectPlace?: (place: Place) => void;
  userLocation?: { lat: number; lng: number } | null;
  showDistance?: boolean;
}

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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#999' }}>
        <span style={{ fontSize: 32, marginBottom: 12 }}>📍</span>
        <p style={{ margin: 0, fontSize: 14 }}>No places match your filters</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {places.map((place) => {
        const cat = CATEGORY_MAP[place.category] ?? CATEGORY_MAP['other']!;
        const dist =
          showDistance && userLocation && place.lat && place.lng
            ? haversineDistance(userLocation.lat, userLocation.lng, Number(place.lat), Number(place.lng))
            : null;

        return (
          <li
            key={place.id}
            onClick={() => onSelectPlace?.(place)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              cursor: onSelectPlace ? 'pointer' : undefined,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                background: `${cat.color}15`,
                border: `1px solid ${cat.color}30`,
                flexShrink: 0,
              }}
            >
              {cat.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {place.name}
                </div>
                {dist !== null && (
                  <span style={{ fontSize: 12, color: '#999', flexShrink: 0, marginLeft: 8 }}>
                    {formatDistance(dist)}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 12,
                color: '#888',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {[place.address, place.city].filter(Boolean).join(' · ')}
              </div>
              {place.notes && (
                <div style={{
                  fontSize: 12,
                  color: '#aaa',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {place.notes}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <span style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 6,
                background: `${cat.color}15`,
                color: cat.color,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}>
                {cat.label}
              </span>
              {place.visited && (
                <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>visited</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
