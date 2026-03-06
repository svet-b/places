# Places — Developer Notes

## Project Structure

- `frontend/` — Vite + React + TypeScript PWA
- `worker/` — Cloudflare Workers backend with Hono
- `docs/` — Phase-by-phase implementation plans

## Key Technical Details

### Cloudflare Workers + Google APIs

The worker authenticates with Google APIs using a **service account**. Since the Node.js `google-auth-library` and `googleapis` packages do NOT work in the Workers runtime, all Google API auth is implemented manually:

1. Build a JWT from the service account credentials
2. Sign it using Web Crypto API (`crypto.subtle.importKey` + `crypto.subtle.sign` with RSASSA-PKCS1-v1_5 / SHA-256)
3. Exchange the JWT for an access token via `https://oauth2.googleapis.com/token`
4. Use the access token in `Authorization: Bearer` headers on all Google API calls (Sheets, Drive, Places)

**Private key gotcha:** When setting the service account private key via `wrangler secret put GOOGLE_PRIVATE_KEY`, the PEM's newlines get stored as literal `\n` strings. The code in `worker/src/services/sheets.ts` normalizes these with `.replace(/\\n/g, '\n')` before decoding. Without this, `atob()` will fail with `InvalidCharacterError`.

### Deployment

**Worker:**
```sh
cd worker
npx wrangler deploy
```

Secrets (set once via `npx wrangler secret put <NAME>`):
- `API_KEY` — pre-shared auth key (same value goes in frontend .env)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — `client_email` from service account JSON
- `GOOGLE_PRIVATE_KEY` — `private_key` from service account JSON
- `SPREADSHEET_ID` — from the Google Sheets URL

**Frontend:**
```sh
cd frontend
npm run build
npx wrangler pages deploy dist/ --project-name=places --commit-dirty=true
```

- The Cloudflare Pages project name is `places` (NOT `places-9x5` — that's the domain)
- The permanent URL is `https://places-9x5.pages.dev` — each deploy also gets a unique hash URL but use the permanent one
- `wrangler` is a devDependency, not installed globally — always use `npx wrangler`

**Frontend environment variables** (in `frontend/.env`, gitignored):
- `VITE_API_URL` — worker URL: `https://places-api.mari-places.workers.dev`
- `VITE_API_KEY` — must match the `API_KEY` worker secret
- `VITE_GOOGLE_MAPS_KEY` — Maps JavaScript API key (separate from the backend service account)

### Google Cloud API Keys

Two separate keys are used:
1. **Service account** (backend) — for Sheets, Drive, Places APIs. Credentials stored as worker secrets.
2. **Maps JavaScript API key** (frontend) — restricted to Maps JS API with HTTP referrer restrictions on the domain. This is a different API from "Places API" — both must be enabled separately in Google Cloud Console.
