# Places — Architecture & Implementation Plan

## Overview

Places is a personal, mobile-first web app for managing categorized lists of places (restaurants, cafés, bars, etc.) with metadata, backed by Google Sheets as the persistent store. It supports adding places manually or by uploading screenshots (e.g. from Instagram), which are analyzed by an LLM to extract place information.

The app is deployed as a React PWA (installable on iPhone home screen) with a lightweight backend API that mediates access to Google Sheets, Google Drive, Google Places, and the Claude Vision API.


## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   iPhone / Browser               │
│                                                  │
│   React PWA (Vite + React + Google Maps JS)      │
│   ├── Map view (category-colored pins)           │
│   ├── List view (search, filter, sort)           │
│   ├── Place detail (metadata, screenshot, etc.)  │
│   └── Add place (manual or screenshot upload)    │
│                                                  │
│   On load: fetches all places → local state      │
│   On edit: optimistic UI → async PATCH to API    │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS + API key header
                       ▼
┌─────────────────────────────────────────────────┐
│              Backend API (Cloudflare Workers)     │
│              or (Fly.io + Hono/FastAPI)           │
│                                                  │
│   Auth: pre-shared API key in Authorization hdr  │
│                                                  │
│   Routes:                                        │
│   GET  /places         → read full sheet         │
│   POST /places         → append row              │
│   PUT  /places/:id     → update row              │
│   DEL  /places/:id     → delete row              │
│   POST /analyze-screenshot → Claude Vision       │
│   POST /resolve-place  → Google Places lookup    │
│   POST /upload-image   → Google Drive upload     │
│                                                  │
└──┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
 Google     Google     Google     Claude
 Sheets     Drive      Places     Vision
 API        API        API        API
```


## Data Model

### Google Sheet: "Places"

Single sheet (tab) named `places` with the following columns:

| Column | Type    | Example                             | Notes                                    |
|--------|---------|-------------------------------------|------------------------------------------|
| id     | string  | `a1b2c3d4`                          | Random 8-char alphanumeric, generated client-side |
| name   | string  | `Boot Café`                         |                                          |
| category | string | `coffee`                           | One of: coffee, restaurant, bar, bakery, shop, park, culture, other |
| address | string | `19 Rue du Pont aux Choux, 75003`  |                                          |
| lat    | number  | `48.8634`                           | From Google Places API                   |
| lng    | number  | `2.3631`                            | From Google Places API                   |
| google_place_id | string | `ChIJ...`                    | Optional, from Places API                |
| source | string  | `Instagram — @specialtycoffee`      | Free text: who/where the recommendation came from |
| notes  | string  | `Tiny but excellent`                | Personal notes                           |
| visited | boolean | `FALSE`                            | Whether you've been                      |
| date_added | date | `2026-01-28`                       | ISO date string                          |
| screenshot_url | string | `https://drive.google.com/...` | Google Drive link to uploaded screenshot  |
| city   | string  | `Paris`                             | Enables multi-city support               |

This schema is intentionally flat. Google Sheets is the source of truth, and you can add columns freely (e.g. `price_range`, `cuisine`, `rating`) without changing backend code — the API just reads/writes rows generically.


## Frontend

### Stack

- **Vite** + **React** (TypeScript)
- **Google Maps JavaScript API** for the map (free tier: 28,000 map loads/month)
- **Tailwind CSS** for styling
- Service worker + `manifest.json` for PWA installability

### Key Design Decisions

**Full dataset in memory.** On app load, `GET /places` returns the complete list (a few hundred rows ≈ ~50KB JSON). All filtering, searching, and spatial queries run client-side against this local array. No pagination needed.

**Optimistic UI with async sync.** When the user adds, edits, or deletes a place, the local state updates immediately. A background request fires to the backend to persist the change in Google Sheets. If the request fails, show a toast and revert. This makes the app feel instant despite Sheets API latency.

**Geolocation for "near me."** On map load, request the browser's geolocation (the PWA permission flow handles this). Center the map on the user's position and optionally sort the list view by distance.

### PWA Setup

The app needs three things to be installable on iPhone:

1. A `manifest.json` with `display: "standalone"`, app name, icons, and theme color
2. A service worker (Vite PWA plugin handles this) for offline caching of the app shell
3. HTTPS (automatic on Cloudflare Pages / Vercel)

After deploying, open the URL in Safari → Share → "Add to Home Screen." The app launches in its own window without browser chrome.

**Limitation:** PWAs on iOS don't support push notifications reliably. If a Sheets write fails while offline, the app should queue it and retry on reconnect (a simple array of pending operations in memory, flushed on `online` event).

### Screens

1. **Map view** — Google Maps with custom markers colored by category. Tapping a pin shows a bottom sheet with place summary. Category filter pills across the top.
2. **List view** — Scrollable list of place cards, searchable and filterable. Sort by date added, name, or distance from current location.
3. **Place detail** — Full metadata, visited toggle, screenshot preview, "Open in Google Maps" deep link.
4. **Add place (manual)** — Category picker, name/address field with Google Places Autocomplete, source, notes.
5. **Add place (screenshot)** — Image upload → "Analyze" button → LLM extracts info → Google Places resolves it → user reviews/edits → save.


## Backend

### Option A: Cloudflare Workers (recommended)

Cloudflare Workers are a good fit here: zero cold starts, free tier covers 100K requests/day, automatic HTTPS, and global edge deployment.

**Stack:** Hono (lightweight TS framework for Workers) + Google APIs client.

**Deployment:** `wrangler deploy` from a `worker/` directory. Secrets (API keys, Google service account credentials) stored in Workers Secrets.

**Tradeoff:** Must be TypeScript/JavaScript. No filesystem (no SQLite). If you later want SQLite, Cloudflare D1 is available.

### Option B: Fly.io

A small VM running a Hono (Node.js) or FastAPI (Python) server. Persistent volume available if you ever want SQLite alongside Sheets.

**Deployment:** `fly launch` + `fly deploy`. Secrets via `fly secrets set`.

**Tradeoff:** ~200ms cold start on free tier (can keep-alive with a health check cron). More operational surface than Workers.

### Recommendation

Start with Cloudflare Workers — it's simpler to deploy, has no cold starts, and the free tier is generous. If you hit a wall (need SQLite, Python, etc.), migrating to Fly.io is straightforward since the API interface is identical.

### Authentication

Single pre-shared API key, sent as `Authorization: Bearer <key>` on every request. The backend validates this as middleware:

```ts
// Hono middleware
app.use('*', async (c, next) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (key !== c.env.API_KEY) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});
```

The key is stored as an environment variable on the backend and baked into the frontend at build time via Vite's `VITE_API_KEY` env var. Since you're the only user, this is sufficient. HTTPS ensures the key isn't visible in transit.

### Google Sheets Integration

**Authentication:** Use a Google Cloud service account. Create a service account in the Google Cloud Console, download the JSON key, share the Google Sheet with the service account's email address (as editor), and store the JSON key as a backend secret.

**Reading:** `GET /places` calls Sheets API `spreadsheets.values.get` for the range `places!A:M` and returns the rows as JSON objects (mapping header row to keys).

**Writing:** `POST /places` calls `spreadsheets.values.append`. `PUT /places/:id` finds the row by scanning the `id` column, then calls `spreadsheets.values.update` on that specific row range. `DELETE /places/:id` finds the row and calls `spreadsheets.batchUpdate` with a `deleteDimension` request.

**Performance note:** The Sheets API typically responds in 200–500ms. Since the frontend works against local state and syncs asynchronously, this latency is invisible to the user.

### Screenshot Analysis Flow

```
1. User uploads image in frontend
2. Frontend sends image (base64) to POST /analyze-screenshot
3. Backend sends image to Claude Vision API with prompt:
   "Extract the place name, type, city, and any other details
    from this screenshot. Return JSON:
    { name, category, city, address_hint, source_account }"
4. Backend receives structured response
5. Backend calls POST /resolve-place with the extracted name + city
6. /resolve-place hits Google Places API Text Search:
   query = "{name} {city}"
   → returns address, lat/lng, google_place_id
7. Backend returns merged result to frontend
8. Frontend pre-fills the add-place form for user review
```

**Claude Vision prompt design:** The prompt should handle various screenshot types — Instagram posts (look for location tag and account name), Instagram Stories (look for location sticker, mention stickers), Google Maps screenshots, TikTok, blog screenshots. The LLM is good at this without exhaustive instructions; a few-shot prompt with 2–3 examples of different formats works well.

**Error handling:** If the LLM can't identify a place, return partial results and let the user fill in the rest manually. If Google Places can't resolve it, let the user enter the address and geocode it separately.

### Google Drive for Screenshots

When a place is saved with a screenshot:

1. Backend uploads the image to a specific Google Drive folder via the Drive API (`files.create` with the image as media)
2. Sets sharing to "anyone with the link can view" (so the frontend can display it without auth)
3. Stores the Drive file URL in the `screenshot_url` column

Use the same service account as Sheets. Create a dedicated "Places Screenshots" folder in Drive and share it with the service account.


## Google Cloud Setup

You'll need a Google Cloud project with three APIs enabled:

1. **Google Sheets API** — reading/writing the place list
2. **Google Drive API** — uploading screenshots
3. **Google Places API (New)** — resolving place names to addresses/coordinates, and Autocomplete in the frontend

Plus a **Maps JavaScript API** key for the frontend map (this is a separate API key with HTTP referrer restrictions, safe to expose client-side).

### Service Account

- Create in Google Cloud Console → IAM → Service Accounts
- Download JSON key
- Share the Google Sheet with `<service-account>@<project>.iam.gserviceaccount.com` as Editor
- Share the Drive folder similarly
- Store the JSON key as a backend secret (Cloudflare Workers secret or Fly.io secret)

### API Key for Frontend

- Create a separate API key restricted to Maps JavaScript API
- Add HTTP referrer restriction (your domain)
- Expose via `VITE_GOOGLE_MAPS_KEY` env var


## Project Structure

```
places/
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── manifest.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts          # API client with auth header
│   │   ├── components/
│   │   │   ├── MapView.tsx
│   │   │   ├── ListView.tsx
│   │   │   ├── PlaceDetail.tsx
│   │   │   ├── AddPlaceModal.tsx
│   │   │   ├── ScreenshotUpload.tsx
│   │   │   ├── CategoryFilter.tsx
│   │   │   └── BottomNav.tsx
│   │   ├── hooks/
│   │   │   ├── usePlaces.ts       # State + sync logic
│   │   │   └── useGeolocation.ts
│   │   ├── types.ts
│   │   └── constants.ts
│   └── public/
│       └── icons/
├── worker/                         # Cloudflare Workers backend
│   ├── src/
│   │   ├── index.ts               # Hono app entry
│   │   ├── routes/
│   │   │   ├── places.ts
│   │   │   ├── analyze.ts
│   │   │   └── upload.ts
│   │   ├── services/
│   │   │   ├── sheets.ts          # Google Sheets read/write
│   │   │   ├── drive.ts           # Google Drive upload
│   │   │   ├── places-api.ts      # Google Places resolution
│   │   │   └── vision.ts          # Claude Vision API
│   │   └── auth.ts                # API key middleware
│   ├── wrangler.toml
│   └── package.json
└── README.md
```


## Implementation Sequence

### Phase 1 — Core loop (read/write places via Sheets)

1. Set up Google Cloud project, service account, enable APIs
2. Create the Google Sheet with the schema above
3. Scaffold the Cloudflare Worker with Hono
4. Implement `GET /places` (read sheet → JSON) and `POST /places` (append row)
5. Scaffold the Vite + React frontend with a basic list view
6. Wire frontend to backend: load places on mount, add a place manually
7. Deploy worker (`wrangler deploy`) and frontend (Cloudflare Pages)

### Phase 2 — Map and mobile experience

1. Add Google Maps JavaScript API to the frontend
2. Implement MapView with custom markers (category colors)
3. Add geolocation ("near me" centering)
4. Add category filter pills (shared between map and list views)
5. Implement place detail panel
6. Add PWA manifest + service worker
7. Test on iPhone via "Add to Home Screen"

### Phase 3 — Edit and delete

1. Implement `PUT /places/:id` and `DELETE /places/:id` on backend
2. Add edit flow in frontend (inline editing in detail view)
3. Add visited toggle
4. Implement optimistic updates with error recovery

### Phase 4 — Screenshot analysis

1. Implement `POST /analyze-screenshot` (Claude Vision API)
2. Implement `POST /resolve-place` (Google Places Text Search)
3. Implement `POST /upload-image` (Google Drive upload)
4. Build the screenshot upload UI in frontend
5. Wire up the full flow: upload → analyze → resolve → review → save

### Phase 5 — Polish

1. Add Google Places Autocomplete to the manual add flow
2. Offline support (queue failed writes, replay on reconnect)
3. Add sorting (by distance, date, name) to list view
4. Multi-city support (city filter in the UI)
5. Pull-to-refresh to re-sync from Sheets
6. Performance tuning (lazy load map, debounce search)
