# Phase 5 — Polish

Goal: Improve the UX with autocomplete, offline resilience, sorting, multi-city support, and performance tuning.

**Depends on:** Phase 4 complete (all core features working).

---

## Step 1: Google Places Autocomplete in Manual Add Flow

**In AddPlaceModal.tsx:**
- Replace the plain address text input with a Google Places Autocomplete field
- Use the Maps JavaScript API's `Place Autocomplete` widget (or the `useMapsLibrary('places')` hook if using `@vis.gl/react-google-maps`)
- When the user selects a suggestion:
  - Auto-fill `address`, `lat`, `lng`, `google_place_id`, `google_maps_url`
  - Optionally auto-fill `name` if the user hasn't typed one yet
  - Optionally auto-fill `city` from the address components

**API key:** Reuses the same `VITE_GOOGLE_MAPS_KEY` (already loaded for the map). The Autocomplete API must be enabled in Google Cloud Console (it's part of the Places API).

**UX considerations:**
- Debounce input by ~300ms before querying
- Bias results to the user's current location (if geolocation available)
- Show "Powered by Google" attribution as required by TOS

---

## Step 2: Offline Support

**Goal:** If the user adds or edits a place while offline (or the backend is down), queue the operation and replay it when connectivity returns.

**Implementation in usePlaces.ts:**

1. **Pending operations queue:**
   - Maintain an array of pending operations: `{ type: 'create' | 'update' | 'delete', data: any, retries: number }`
   - Store in memory (lost on app close) — or in `localStorage` for persistence across sessions

2. **On mutation failure:**
   - Instead of reverting immediately, add the operation to the pending queue
   - Keep the optimistic UI state
   - Show a subtle indicator (e.g. a small badge or banner): "1 change pending sync"

3. **On connectivity restore:**
   - Listen for the `online` event on `window`
   - Flush the pending queue: replay each operation sequentially
   - On success, remove from queue
   - On repeated failure (3 retries), revert the optimistic change and show a toast

4. **Sync status indicator:**
   - Small icon in the header or bottom nav: green check (synced) / yellow dot (pending) / red dot (failed)

---

## Step 3: Sorting in List View

**In ListView.tsx, add a sort dropdown or segmented control:**

Sort options:
- **Date added** (newest first) — default. Sort by `date_added` descending.
- **Name** (A-Z) — alphabetical by `name`.
- **Distance** (nearest first) — requires geolocation. Calculate Haversine distance from user position to each place's `lat`/`lng`. Sort ascending. Show distance label on each card (e.g. "1.2 km").

**Haversine utility:**
```ts
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Returns distance in kilometers
}
```

- If geolocation is unavailable, gray out / hide the distance sort option.
- Persist the user's sort preference in `localStorage`.

---

## Step 4: Multi-City Support

**City filter:**
- Derive the list of cities from the data: `[...new Set(places.map(p => p.city).filter(Boolean))]`
- Add a city selector (dropdown or pills) above the category filter
- Default to "All cities" or auto-detect based on geolocation (find the closest city in the dataset)
- When a city is selected, filter places to that city only
- The map should re-center to the selected city's bounds (compute from the places in that city)

**Implementation:**
- Add `activeCity: string | null` to the shared filter state
- Filter chain: city filter → category filter → search query → sort

---

## Step 5: Pull-to-Refresh

**In the list view:**
- Implement pull-to-refresh gesture to re-fetch all places from the backend
- Replace the local state with the fresh data
- Use a library like `react-pull-to-refresh` or implement with touch event handlers

**In the map view:**
- Add a manual "Refresh" button (floating action button or in the header)
- Same behavior: re-fetch and replace local state

**On refresh:**
- Merge with any pending local operations (don't lose unsynced changes)
- Show a brief loading indicator

---

## Step 6: Performance Tuning

**Lazy-load the map:**
- Don't load the Google Maps JS API on app start
- Load it only when the user switches to the map tab for the first time
- Use dynamic `import()` or the `@vis.gl/react-google-maps` lazy loading

**Debounce search:**
- In the list view search input, debounce filtering by ~200ms
- Prevents excessive re-renders on fast typing

**Image lazy loading:**
- Screenshot previews in the list or detail view should use `loading="lazy"` on `<img>` tags
- Consider thumbnail generation (or just use Drive's thumbnail URL)

**Marker clustering (if needed):**
- If a city has 100+ places, markers will overlap
- Use `@googlemaps/markerclusterer` to cluster nearby markers at low zoom levels
- Only implement if the map feels cluttered — premature optimization otherwise

---

## Testing

1. **Autocomplete:** Type a place name in the add form, verify suggestions appear, select one, verify fields auto-fill
2. **Offline:** Enable airplane mode, add a place, verify it appears in UI with pending indicator. Disable airplane mode, verify it syncs
3. **Sorting:** Switch between sort modes, verify order changes. Test distance sort with geolocation
4. **Multi-city:** Add places in different cities, verify city filter works and map re-centers
5. **Pull-to-refresh:** Add a place directly in Google Sheets (not via the app), pull-to-refresh, verify it appears
6. **Performance:** Check that the map loads quickly and doesn't block the initial render

---

## Definition of Done

- [ ] Address autocomplete works in the manual add flow (fills address, coordinates, place ID)
- [ ] Failed writes are queued and replayed on reconnect
- [ ] Sync status indicator shows pending/synced/error state
- [ ] List view supports sorting by date, name, and distance
- [ ] City filter lets you scope the view to one city
- [ ] Pull-to-refresh re-fetches data from the backend
- [ ] Map lazy-loads (doesn't block initial render)
- [ ] Search input is debounced
- [ ] App feels polished and responsive on iPhone
