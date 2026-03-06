import { useEffect, useRef, useState, useCallback } from 'react';
import { Place } from '../types';

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

interface Props {
  places: Place[];
  activeCategories: Set<string>;
  userLocation: { lat: number; lng: number } | null;
  onSelectPlace: (place: Place) => void;
}

export function MapView({ places, activeCategories, userLocation, onSelectPlace }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center = userLocation ?? { lat: 48.8566, lng: 2.3522 }; // Default: Paris

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapId: 'places-map',
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
    });

    mapInstanceRef.current = map;
    setMapReady(true);
  }, [userLocation]);

  // Update markers when places or filters change
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    for (const marker of markersRef.current) {
      marker.map = null;
    }
    markersRef.current = [];

    const filtered = places.filter(
      (p) => p.lat && p.lng && activeCategories.has(p.category),
    );

    for (const place of filtered) {
      const pin = document.createElement('div');
      pin.style.width = '14px';
      pin.style.height = '14px';
      pin.style.borderRadius = '50%';
      pin.style.background = CATEGORY_COLORS[place.category] ?? CATEGORY_COLORS['other'] ?? '#708090';
      pin.style.border = '2px solid #fff';
      pin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
      pin.style.cursor = 'pointer';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: Number(place.lat), lng: Number(place.lng) },
        content: pin,
        title: place.name,
      });

      marker.addListener('click', () => onSelectPlace(place));
      markersRef.current.push(marker);
    }
  }, [places, activeCategories, onSelectPlace]);

  useEffect(() => {
    if (mapReady) updateMarkers();
  }, [mapReady, updateMarkers]);

  // User location blue dot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    // Remove previous user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.map = null;
    }

    const dot = document.createElement('div');
    dot.style.width = '14px';
    dot.style.height = '14px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#4285F4';
    dot.style.border = '3px solid #fff';
    dot.style.boxShadow = '0 0 6px rgba(66,133,244,0.5)';

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: userLocation,
      content: dot,
      title: 'Your location',
      zIndex: 9999,
    });

    userMarkerRef.current = marker;
    map.panTo(userLocation);
  }, [userLocation]);

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
    />
  );
}
