# Phase 1 — Core Loop (Read/Write Places via Sheets)

Goal: A working end-to-end loop where you can view and add places, persisted in Google Sheets.

---

## Prerequisites (manual setup, before any code)

1. **Google Cloud project**
   - Create a new project in Google Cloud Console
   - Enable these APIs: Google Sheets API, Google Drive API, Places API (New)
   - Create a service account (IAM > Service Accounts), download the JSON key

2. **Google Sheet**
   - Create a new Google Sheet
   - Rename the first tab to `places`
   - Add the header row (row 1): `id | name | priority | category | cuisine | address | lat | lng | google_place_id | google_maps_url | source | list | notes | visited | date_added | screenshot_url | city`
   - Share the sheet with the service account email as Editor
   - Note the spreadsheet ID from the URL

3. **Cloudflare account**
   - Sign up at cloudflare.com (free tier is fine)
   - Install Wrangler CLI: `npm install -g wrangler && wrangler login`

---

## Step 1: Scaffold the Cloudflare Worker

Create the `worker/` directory with Hono.

```
worker/
├── src/
│   ├── index.ts          # Hono app entry + CORS
│   ├── auth.ts           # API key middleware
│   ├── routes/
│   │   └── places.ts     # GET /places, POST /places
│   └── services/
│       └── sheets.ts     # Google Sheets read/write helpers
├── wrangler.toml
├── package.json
└── tsconfig.json
```

**wrangler.toml** should define:
- `name = "places-api"`
- `compatibility_date` = current date
- Bindings: none yet (secrets added via `wrangler secret put`)

**Dependencies:**
- `hono` — routing framework
- **No Google SDK.** The Node.js `google-auth-library` and `googleapis` packages do not work in the Cloudflare Workers runtime (no Node.js `crypto`, `fs`, `child_process`). Instead, implement service account auth manually: build a JWT, sign it with the Web Crypto API (RS256 via `crypto.subtle.importKey` + `crypto.subtle.sign`), and exchange it for an access token. All Google API calls use plain `fetch` with that token.

**Secrets to set** (via `wrangler secret put <NAME>`):
- `API_KEY` — a random string you generate (e.g. `openssl rand -hex 32`)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — from the JSON key
- `GOOGLE_PRIVATE_KEY` — from the JSON key (the RSA private key PEM)
- `SPREADSHEET_ID` — the Google Sheet ID

### Implementation details

**auth.ts**: Hono middleware that checks `Authorization: Bearer <key>` against `env.API_KEY`. Return 401 if mismatch.

**sheets.ts**:
- `getAccessToken(env)`: Sign a JWT with the service account credentials using Web Crypto API (RS256), exchange it for a Google OAuth2 access token via `https://oauth2.googleapis.com/token`. Cache the token for ~55 minutes.
- `getPlaces(env)`: Call `GET https://sheets.googleapis.com/v4/spreadsheets/{id}/values/places!A:Q` with the access token. Parse the response: first row = headers, remaining rows = data. Return as an array of place objects.
- `appendPlace(env, place)`: Call `POST https://sheets.googleapis.com/v4/spreadsheets/{id}/values/places!A:Q:append?valueInputOption=RAW` with the place data as a row array (ordered to match columns).

**routes/places.ts**:
- `GET /places` — calls `getPlaces()`, returns JSON array
- `POST /places` — validates body, calls `appendPlace()`, returns the created place

**index.ts**: Create Hono app, apply CORS middleware (allow frontend origin), apply auth middleware, mount places routes.

---

## Step 2: Scaffold the React Frontend

Create the `frontend/` directory with Vite + React + TypeScript.

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts (or CSS-only for now)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   └── client.ts       # fetch wrapper with auth header
│   ├── types.ts             # Place type definition
│   ├── constants.ts         # Categories, API URL
│   └── components/
│       └── ListView.tsx     # Simple list of places
└── package.json
```

**Dependencies:**
- `react`, `react-dom`
- `tailwindcss` (or skip styling for now, add in Phase 2)

**Environment variables** (in `.env`):
- `VITE_API_URL` — the Worker URL (e.g. `https://places-api.<you>.workers.dev`)
- `VITE_API_KEY` — the same API key set in the Worker

### Implementation details

**types.ts**: Define the `Place` interface matching the sheet schema. All fields are strings except `lat`/`lng` (number), `priority` (number), `visited` (boolean).

**constants.ts**: Category list (`coffee`, `restaurant`, `bar`, `bakery`, `shop`, `park`, `culture`, `other`).

**api/client.ts**: A thin wrapper around `fetch` that:
- Prepends `VITE_API_URL` to paths
- Adds `Authorization: Bearer ${VITE_API_KEY}` header
- Adds `Content-Type: application/json`
- Exports `getPlaces()` and `createPlace(place)` functions

**App.tsx**: On mount, call `getPlaces()` and store in state. Render a simple `ListView` showing place names, categories, and addresses. Include a basic "Add Place" button that opens a form with fields for name, category, address, city, source, notes. On submit, call `createPlace()` and prepend to local state.

---

## Step 3: Deploy and Verify

1. **Deploy the Worker:**
   ```sh
   cd worker
   npm install
   wrangler secret put API_KEY
   wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
   wrangler secret put GOOGLE_PRIVATE_KEY
   wrangler secret put SPREADSHEET_ID
   wrangler deploy
   ```
   Test with curl: `curl -H "Authorization: Bearer <key>" https://places-api.<you>.workers.dev/places`

2. **Run the frontend locally:**
   ```sh
   cd frontend
   npm install
   npm run dev
   ```
   Verify places load from the sheet. Add a place and confirm it appears in Google Sheets.

3. **Deploy the frontend:**
   - Option A: Cloudflare Pages (`npx wrangler pages deploy dist/`)
   - Option B: Vercel (`vercel --prod`)
   - Set environment variables in the hosting platform's dashboard

---

## Definition of Done

- [ ] `GET /places` returns all rows from Google Sheets as JSON
- [ ] `POST /places` appends a new row to Google Sheets
- [ ] Frontend loads and displays places on mount
- [ ] Frontend has a form to add a new place (name, category, address, city at minimum)
- [ ] Adding a place updates the UI immediately and persists to Sheets
- [ ] Both frontend and backend are deployed and accessible via HTTPS
- [ ] API key auth works (unauthenticated requests get 401)
