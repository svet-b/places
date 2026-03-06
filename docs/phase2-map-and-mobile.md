# Phase 2 — Map and Mobile Experience

Goal: Add a Google Maps view with category-colored markers, geolocation, filtering, and make the app installable as a PWA on iPhone.

**Depends on:** Phase 1 complete (places load from backend, basic list view works).

---

## Step 1: Add Google Maps to the Frontend

**Setup:**
- Get a Maps JavaScript API key from Google Cloud Console (separate from the service account key)
- Restrict it to your frontend domain(s) via HTTP referrer restrictions
- Add `VITE_GOOGLE_MAPS_KEY` to `.env`

**Dependencies:**
- `@vis.gl/react-google-maps` (lightweight React wrapper for Google Maps) — or load the Maps JS API directly via a script tag and use refs

### Implementation details

**MapView.tsx:**
- Full-screen map component (takes up the main content area)
- On mount, center on a default location (e.g. Paris: 48.8566, 2.3522) or the user's geolocation
- Render a marker for each place from the places array (passed as prop or from shared state)
- Each marker is colored by category. Define a color map:
  - coffee: brown, restaurant: red, bar: purple, bakery: orange, shop: blue, park: green, culture: yellow, other: gray
- Use `AdvancedMarkerElement` with a colored circle/pin SVG for the marker content
- On marker tap, show a bottom sheet / card overlay with place name, category, address, and a "Details" link

---

## Step 2: Geolocation

**useGeolocation.ts hook:**
- Call `navigator.geolocation.getCurrentPosition()` on mount
- Return `{ lat, lng, error, loading }`
- Store permission state so the prompt only fires once

**Integration:**
- When geolocation is available, center the map on the user's position
- Show a "my location" blue dot marker on the map
- In list view (later), enable "sort by distance" using Haversine formula against the user's position

---

## Step 3: Category Filter

**CategoryFilter.tsx:**
- Horizontal scrollable row of pill buttons, one per category + "All"
- Active filter highlighted; tap to toggle
- Support multiple active categories (or single-select — simpler)
- This component is shared between MapView and ListView

**State:**
- Lift `activeCategories` to the parent (App or a context) so both views share the filter
- Filter the places array before passing to MapView or ListView

---

## Step 4: Place Detail Panel

**PlaceDetail.tsx:**
- Slide-up panel or full-screen overlay showing all metadata for a place
- Fields: name, category, cuisine, address, source, list, notes, visited status, date added
- "Open in Google Maps" button → deep link to `google_maps_url` or `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
- Screenshot preview if `screenshot_url` exists (rendered as an image)
- Close button to return to map/list

**Navigation:**
- Tapping a marker on the map or a row in the list opens PlaceDetail
- Use simple state management (e.g. `selectedPlaceId`) rather than a router for now

---

## Step 5: Bottom Navigation

**BottomNav.tsx:**
- Fixed bottom bar with two tabs: Map and List
- Active tab highlighted
- Tapping switches between MapView and ListView
- Style for mobile: large tap targets, safe area insets for iPhone notch/home indicator

---

## Step 6: PWA Setup

**manifest.json** (in `frontend/public/`):
```json
{
  "name": "Places",
  "short_name": "Places",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a1a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker:**
- Use `vite-plugin-pwa` to auto-generate a service worker that caches the app shell (HTML, JS, CSS)
- Configure with `registerType: 'autoUpdate'` for seamless updates
- No runtime caching of API calls yet (that comes in Phase 5)

**Icons:**
- Generate 192x192 and 512x512 PNG icons (simple pin/map icon with the app's theme color)
- Place in `frontend/public/icons/`

**Meta tags in index.html:**
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- `<link rel="apple-touch-icon" href="/icons/icon-192.png">`

---

## Step 7: Mobile Styling Polish

- Ensure full-height layout (`100dvh` for dynamic viewport height on iOS)
- Add `safe-area-inset-*` padding to bottom nav and top bar
- Map should fill available space between filter bar and bottom nav
- Test touch interactions: marker tap, filter pill scroll, list scroll
- Add Tailwind if not done in Phase 1

---

## Testing

1. Run locally on desktop, verify map loads with markers
2. Open on iPhone (same network or deployed) via Safari
3. Tap Share > "Add to Home Screen"
4. Launch from home screen — should open without Safari chrome
5. Verify geolocation prompt appears and map centers on your location
6. Verify category filter works on both map and list views
7. Verify tapping a marker shows place details

---

## Definition of Done

- [ ] Map view renders with colored markers for all places
- [ ] Tapping a marker shows a summary card / bottom sheet
- [ ] Category filter pills filter both map markers and list
- [ ] Geolocation centers the map on the user's position
- [ ] Place detail panel shows all metadata with "Open in Google Maps" link
- [ ] Bottom nav switches between Map and List views
- [ ] App is installable as PWA on iPhone (manifest + service worker)
- [ ] App looks good on mobile (full height, safe areas, touch-friendly)
