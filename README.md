# Mari's list

A PWA for keeping track of places to eat and drink. `frontend/` is Vite + React on
Cloudflare Pages, `worker/` is a Cloudflare Worker (Hono) backed by a Google Sheet.

- Architecture: [architecture.md](architecture.md)
- Secrets, APIs and manual deploys: [AGENTS.md](AGENTS.md)

## Running locally

Needs Node 22+ and a Cloudflare login (`npx wrangler login`).

### 1. Worker

```sh
cd worker
npx wrangler dev --remote --var DEV_NO_AUTH:1
```

Serves on `http://localhost:8787`.

`--remote` runs the Worker on Cloudflare's edge, so it uses the real secrets and R2
binding — no local copies of the service account key or API keys are needed.

`DEV_NO_AUTH:1` skips the password/JWT check (see `authMiddleware` in
[worker/src/auth.ts](worker/src/auth.ts)). It can only arrive via this flag:
`wrangler.toml` declares no vars and nothing sets it as a deployed secret, so
production always authenticates.

> **`--remote` uses live data.** The Worker reads and writes the real Google Sheet.
> Browsing is safe; adding, editing or deleting a place from localhost changes your
> actual list.

### 2. Frontend

```sh
echo 'VITE_API_URL=http://localhost:8787' > frontend/.env.local
```

```sh
cd frontend && npm run dev
```

Serves on `http://localhost:5173`. `.env.local` is gitignored and takes priority over
`.env`, which keeps pointing at the deployed Worker.

### 3. Skip the login screen

The app shows the login screen whenever localStorage has no token. With `DEV_NO_AUTH`
the Worker ignores the token entirely, so any value gets you in — paste this in the
browser console at `http://localhost:5173`:

```js
localStorage.setItem('places-auth-token', 'dev'); location.reload();
```

### Google Maps key

The Maps JS key is restricted by HTTP referrer. `http://localhost:5173/*` has to be in
the allowed referrers for that key in the Google Cloud console, or the map area shows
"Oops! Something went wrong" and the console logs `RefererNotAllowedMapError`. The rest
of the app works regardless.

### Things that look broken but aren't

- **Empty map and list on a fresh load.** No categories are selected until you pick
  them from the Categories filter; the selection isn't persisted across reloads.
- **A stale frontend after deploying.** An installed PWA keeps running its old
  JavaScript until the new service worker takes over. `src/main.tsx` reloads on
  `controllerchange`, but a build that changes that logic needs one manual refresh.

## Checks

```sh
cd frontend && npx tsc --noEmit && npm run build
```

```sh
cd worker && npx tsc --noEmit
```

There is no test suite. For anything map- or Places-API-shaped, run it locally and
verify in the browser — the DOM measurements that catch marker anchoring bugs can't be
done any other way.

## Deploying

Pushing to `main` deploys both the Worker and the frontend via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). Watch a run with:

```sh
gh run watch $(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')
```

Production Worker logs:

```sh
cd worker && npx wrangler tail --format pretty
```
