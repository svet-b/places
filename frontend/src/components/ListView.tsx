import { MapPinned } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-15 px-5 text-muted-foreground">
        <MapPinned className="h-8 w-8 mb-3 opacity-50" />
        <p className="text-sm">No places match your filters</p>
      </div>
    );
  }

  return (
    <ul className="list-none p-0 m-0">
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
            className="px-4 py-3 border-b border-border/50 flex gap-3 items-center cursor-pointer hover:bg-accent transition-colors"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: `${cat.color}15`,
                border: `1px solid ${cat.color}30`,
              }}
            >
              <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <div className="font-semibold text-sm truncate">{place.name}</div>
                {dist !== null && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatDistance(dist)}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {[place.address, place.city].filter(Boolean).join(' · ')}
              </div>
              {place.notes && (
                <div className="text-xs text-muted-foreground/60 mt-0.5 truncate">{place.notes}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide"
                style={{
                  background: `${cat.color}15`,
                  color: cat.color,
                }}
              >
                {cat.label}
              </span>
              {place.visited && (
                <span className="text-[10px] text-green-500 font-semibold">visited</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
