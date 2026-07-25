import { useEffect, useRef, useState, useCallback } from 'react';
import { Place } from '../types';
import { CATEGORY_MAP } from '../constants';

interface Props {
  places: Place[];
  userLocation: { lat: number; lng: number } | null;
  onSelectPlace: (place: Place) => void;
  // Fired when panning/zooming settles, so callers can scope work (e.g.
  // fetching opening hours) to what's actually on screen.
  onViewportChange?: (bounds: google.maps.LatLngBoundsLiteral | null) => void;
}

export function MapView({ places, userLocation, onSelectPlace, onViewportChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerPlacesRef = useRef<Place[]>([]);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const labelsRef = useRef<HTMLDivElement[]>([]);
  const pinsRef = useRef<{ container: HTMLDivElement; pin: HTMLDivElement; label: HTMLDivElement }[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const LABEL_VISIBILITY_THRESHOLD = 35;

  // Held in a ref so a changing callback identity doesn't re-register listeners
  const onViewportChangeRef = useRef(onViewportChange);
  useEffect(() => { onViewportChangeRef.current = onViewportChange; });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const center = userLocation ?? { lat: 48.8566, lng: 2.3522 };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapId: 'fe583e5529650df6d49e1616',
      disableDefaultUI: true,
      zoomControl: false,
      gestureHandling: 'greedy',
    });

    mapInstanceRef.current = map;
    setMapReady(true);
  }, [userLocation]);

  const updateLabelVisibility = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) {
      for (const label of labelsRef.current) label.style.display = '';
      return;
    }

    let visibleCount = 0;

    for (let i = 0; i < markersRef.current.length; i++) {
      const marker = markersRef.current[i];
      const label = labelsRef.current[i];
      if (!marker || !label) continue;

      const pos = marker.position;
      if (!pos) { label.style.display = 'none'; continue; }

      const latLng = pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos.lat as number, pos.lng as number);
      if (bounds.contains(latLng)) {
        visibleCount++;
      } else {
        label.style.display = 'none';
      }
    }

    const showLabels = visibleCount <= LABEL_VISIBILITY_THRESHOLD;

    for (let i = 0; i < markersRef.current.length; i++) {
      const marker = markersRef.current[i];
      const label = labelsRef.current[i];
      if (!marker || !label) continue;

      const pos = marker.position;
      if (!pos) {
        label.style.display = 'none';
        continue;
      }

      const latLng = pos instanceof google.maps.LatLng ? pos : new google.maps.LatLng(pos.lat as number, pos.lng as number);
      if (!bounds.contains(latLng)) {
        label.style.display = 'none';
        continue;
      }

      label.style.display = showLabels ? '' : 'none';
    }
  }, []);

  const updatePinSizes = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const zoom = map.getZoom() ?? 13;
    // 20px at zoom 16+, scale down to 12px at zoom 10
    const size = Math.max(12, Math.min(20, 8 + (zoom - 10) * (8 / 6)));
    const border = Math.max(1.5, Math.min(2.5, 1.0 + (zoom - 10) * (1 / 6)));
    const px = `${Math.round(size)}px`;
    const labelTop = `${Math.round(size / 2) + 26}px`;
    for (const { pin, label } of pinsRef.current) {
      pin.style.width = px;
      pin.style.height = px;
      pin.style.borderWidth = `${border.toFixed(1)}px`;
      label.style.top = labelTop;
    }
  }, []);

  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.map = null;
    markersRef.current = [];
    markerPlacesRef.current = [];
    labelsRef.current = [];
    pinsRef.current = [];

    const filtered = places.filter((p) => p.lat && p.lng);

    for (const place of filtered) {
      const catColor = (CATEGORY_MAP[place.category] ?? CATEGORY_MAP['other']!).color;

      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.width = '44px';
      container.style.height = '44px';
      container.style.cursor = 'pointer';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      // AdvancedMarkerElement pins custom content by its bottom centre, which
      // would leave the dot half a container above the coordinates — a fixed
      // pixel offset, so it covers more ground the further you zoom out. Push
      // the content down by half its height to put the dot on the position.
      container.style.transform = 'translateY(50%)';

      const visitedStatus = (place.visited ?? '').toLowerCase();
      const fadedFill = `${catColor}66`;
      const fadedOutline = '#9ca3af';
      const backgroundColor = visitedStatus === 'disliked' ? fadedFill : catColor;
      const borderColor = visitedStatus === 'liked' ? '#444' : visitedStatus === 'disliked' ? fadedOutline : '#fff';
      const pin = document.createElement('div');
      pin.style.width = '20px';
      pin.style.height = '20px';
      pin.style.flexShrink = '0';
      pin.style.borderRadius = '50%';
      pin.style.background = backgroundColor;
      pin.style.border = `2.5px solid ${borderColor}`;
      pin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.35)';

      const label = document.createElement('div');
      label.textContent = place.name;
      label.style.position = 'absolute';
      label.style.top = '34px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.fontSize = '12.5px';
      label.style.fontWeight = '600';
      label.style.color = '#1a1a1a';
      label.style.background = 'rgba(255,255,255,0.92)';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '4px';
      label.style.whiteSpace = 'nowrap';
      label.style.maxWidth = '140px';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.pointerEvents = 'none';
      label.style.boxShadow = '0 1px 3px rgba(0,0,0,0.15)';

      container.appendChild(pin);
      container.appendChild(label);
      labelsRef.current.push(label);
      pinsRef.current.push({ container, pin, label });

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: Number(place.lat), lng: Number(place.lng) },
        content: container,
        title: place.name,
      });

      marker.addListener('click', () => onSelectPlace(place));
      markersRef.current.push(marker);
      markerPlacesRef.current.push(place);
    }

    updateLabelVisibility();
    updatePinSizes();
  }, [places, onSelectPlace, updateLabelVisibility, updatePinSizes]);

  useEffect(() => {
    if (mapReady) updateMarkers();
  }, [mapReady, updateMarkers]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    function onZoomOrIdle() {
      updateLabelVisibility();
      updatePinSizes();
      onViewportChangeRef.current?.(map!.getBounds()?.toJSON() ?? null);
    }
    const zoomListener = map.addListener('zoom_changed', onZoomOrIdle);
    const idleListener = map.addListener('idle', onZoomOrIdle);

    return () => {
      google.maps.event.removeListener(zoomListener);
      google.maps.event.removeListener(idleListener);
    };
  }, [mapReady, updateLabelVisibility, updatePinSizes]);

  // Double-tap-and-drag to zoom (like native Google Maps app)
  useEffect(() => {
    const el = wrapperRef.current;
    const map = mapInstanceRef.current;
    if (!el || !map || !mapReady) return;

    let lastTapTime = 0;
    let lastTapY = 0;
    let isDraggingZoom = false;
    let startY = 0;
    let startZoom = 0;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch) { isDraggingZoom = false; return; }
      const now = Date.now();
      const y = touch.clientY;
      if (now - lastTapTime < 300 && Math.abs(y - lastTapY) < 40) {
        isDraggingZoom = true;
        startY = y;
        startZoom = map?.getZoom() ?? 13;
        e.preventDefault();
      } else {
        isDraggingZoom = false;
      }
      lastTapTime = now;
      lastTapY = y;
    }

    function onTouchMove(e: TouchEvent) {
      const touch = e.touches[0];
      if (!isDraggingZoom || e.touches.length !== 1 || !touch) return;
      e.preventDefault();
      const delta = touch.clientY - startY;
      // drag down = zoom in, drag up = zoom out (matches Google Maps convention)
      const rawZoom = startZoom + delta / 60;
      const newZoom = Math.round(Math.max(1, Math.min(21, rawZoom)) * 100) / 100;
      map?.setZoom(newZoom);
    }

    function onTouchEnd() { isDraggingZoom = false; }

    el.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
    el.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    el.addEventListener('touchend', onTouchEnd, { capture: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart, { capture: true });
      el.removeEventListener('touchmove', onTouchMove, { capture: true });
      el.removeEventListener('touchend', onTouchEnd, { capture: true });
    };
  }, [mapReady]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.map = null;

    const dot = document.createElement('div');
    dot.style.width = '14px';
    dot.style.height = '14px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#4285F4';
    dot.style.border = '3px solid #fff';
    dot.style.boxShadow = '0 0 6px rgba(66,133,244,0.5)';
    // Centre the dot on the position rather than sitting it on top (see above)
    dot.style.transform = 'translateY(50%)';

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
    <div ref={wrapperRef} className="w-full h-full min-h-[400px]">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
