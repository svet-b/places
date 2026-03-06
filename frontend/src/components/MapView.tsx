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
  const labelsRef = useRef<HTMLDivElement[]>([]);
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

  // Determine which labels to show based on visible markers and zoom
  const updateLabelVisibility = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const zoom = map.getZoom() ?? 13;
    const bounds = map.getBounds();

    // At low zoom, hide all labels; at high zoom, show all
    if (zoom < 13) {
      for (const label of labelsRef.current) {
        label.style.display = 'none';
      }
      return;
    }

    // Collect visible marker screen positions
    const projection = map.getProjection();
    if (!projection || !bounds) {
      // Show all if we can't compute positions
      for (const label of labelsRef.current) {
        label.style.display = '';
      }
      return;
    }

    // At zoom >= 16, show all labels
    if (zoom >= 16) {
      for (const label of labelsRef.current) {
        label.style.display = '';
      }
      return;
    }

    // For medium zoom (13-15), thin out labels to avoid overlap
    // Use a grid-based approach: only show one label per grid cell
    const scale = 1 << zoom;
    const cellSize = zoom >= 15 ? 4 : zoom >= 14 ? 8 : 16;
    const occupied = new Set<string>();

    for (let i = 0; i < markersRef.current.length; i++) {
      const marker = markersRef.current[i];
      const label = labelsRef.current[i];
      if (!marker || !label) continue;

      const pos = marker.position;
      if (!pos) { label.style.display = 'none'; continue; }

      const latLng = pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos.lat as number, pos.lng as number);

      if (!bounds.contains(latLng)) {
        label.style.display = 'none';
        continue;
      }

      const worldPoint = projection.fromLatLngToPoint(latLng);
      if (!worldPoint) { label.style.display = 'none'; continue; }

      const px = Math.floor((worldPoint.x * scale) / cellSize);
      const py = Math.floor((worldPoint.y * scale) / cellSize);
      const key = `${px},${py}`;

      if (occupied.has(key)) {
        label.style.display = 'none';
      } else {
        occupied.add(key);
        label.style.display = '';
      }
    }
  }, []);

  // Update markers when places or filters change
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    for (const marker of markersRef.current) {
      marker.map = null;
    }
    markersRef.current = [];
    labelsRef.current = [];

    const filtered = places.filter(
      (p) => p.lat && p.lng && activeCategories.has(p.category),
    );

    for (const place of filtered) {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.cursor = 'pointer';

      const pin = document.createElement('div');
      pin.style.width = '14px';
      pin.style.height = '14px';
      pin.style.borderRadius = '50%';
      pin.style.background = CATEGORY_COLORS[place.category] ?? CATEGORY_COLORS['other'] ?? '#708090';
      pin.style.border = '2px solid #fff';
      pin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
      pin.style.flexShrink = '0';

      const label = document.createElement('div');
      label.textContent = place.name;
      label.style.fontSize = '11px';
      label.style.fontWeight = '600';
      label.style.color = '#333';
      label.style.background = 'rgba(255,255,255,0.85)';
      label.style.padding = '1px 4px';
      label.style.borderRadius = '3px';
      label.style.marginTop = '2px';
      label.style.whiteSpace = 'nowrap';
      label.style.maxWidth = '120px';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.pointerEvents = 'none';

      container.appendChild(pin);
      container.appendChild(label);
      labelsRef.current.push(label);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: Number(place.lat), lng: Number(place.lng) },
        content: container,
        title: place.name,
      });

      marker.addListener('click', () => onSelectPlace(place));
      markersRef.current.push(marker);
    }

    updateLabelVisibility();
  }, [places, activeCategories, onSelectPlace, updateLabelVisibility]);

  useEffect(() => {
    if (mapReady) updateMarkers();
  }, [mapReady, updateMarkers]);

  // Update label visibility on zoom/pan
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const zoomListener = map.addListener('zoom_changed', updateLabelVisibility);
    const idleListener = map.addListener('idle', updateLabelVisibility);

    return () => {
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(idleListener);
    };
  }, [mapReady, updateLabelVisibility]);

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
