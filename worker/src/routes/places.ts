import { Hono } from 'hono';
import { Env } from '../index';
import { getPlaces, appendPlace, updatePlace, deletePlace, generateId } from '../services/sheets';
import { getPlaceHours, resolvePlace } from '../services/places-api';

const app = new Hono<{ Bindings: Env }>();

app.get('/places', async (c) => {
  const places = await getPlaces(c.env);
  return c.json(places);
});

app.post('/places', async (c) => {
  const body = await c.req.json();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  if (body.google_place_id) {
    const existing = await getPlaces(c.env);
    const dupe = existing.find((p) => p.google_place_id === body.google_place_id);
    if (dupe) {
      return c.json({ error: 'duplicate', existing_id: dupe.id, existing_name: dupe.name }, 409);
    }
  }

  const place = {
    id: body.id || generateId(),
    name: body.name,
    priority: body.priority ?? '',
    category: (body.category ?? 'other').toLowerCase(),
    cuisine: body.cuisine ?? '',
    address: body.address ?? '',
    lat: body.lat ?? '',
    lng: body.lng ?? '',
    google_place_id: body.google_place_id ?? '',
    google_maps_url: body.google_maps_url ?? '',
    source: body.source ?? '',
    list: body.list ?? '',
    notes: body.notes ?? '',
    visited: body.visited ?? 'no',
    date_added: body.date_added || new Date().toISOString().split('T')[0],
    screenshot_url: body.screenshot_url ?? '',
    city: body.city ?? '',
  };

  const created = await appendPlace(c.env, place);
  return c.json(created, 201);
});

app.put('/places/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const updated = await updatePlace(c.env, id, body);
  if (!updated) {
    return c.json({ error: 'Place not found' }, 404);
  }

  return c.json(updated);
});

app.post('/places/hours', async (c) => {
  const body = await c.req.json<{ placeIds: string[] }>();
  if (!Array.isArray(body.placeIds) || body.placeIds.length === 0) {
    return c.json({ error: 'placeIds array is required' }, 400);
  }
  // One Google subrequest per uncached place, so the batch has to stay under
  // the Workers per-request subrequest limit. The client chunks to match; if
  // something sends more, say so rather than silently dropping the tail.
  const MAX_IDS = 50;
  if (body.placeIds.length > MAX_IDS) {
    console.warn(`hours: ${body.placeIds.length} ids requested, max is ${MAX_IDS}`);
    return c.json({ error: `Too many placeIds (max ${MAX_IDS})` }, 400);
  }
  const hours = await getPlaceHours(c.env, body.placeIds);
  return c.json(hours);
});

app.post('/places/fill-missing', async (c) => {
  const places = await getPlaces(c.env);
  const missing = places.filter((p) => !p.google_place_id);

  let matched = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const place of missing) {
    try {
      const resolved = await resolvePlace(c.env, place.name, place.city || undefined);
      if (resolved) {
        await updatePlace(c.env, place.id, {
          name: resolved.name,
          address: resolved.address,
          lat: String(resolved.lat),
          lng: String(resolved.lng),
          google_place_id: resolved.google_place_id,
          google_maps_url: resolved.google_maps_url,
        });
        matched++;
      } else {
        failed++;
        failures.push(place.name);
      }
    } catch {
      failed++;
      failures.push(place.name);
    }
  }

  return c.json({ total: missing.length, matched, failed, failures });
});

app.delete('/places/:id', async (c) => {
  const id = c.req.param('id');

  const deleted = await deletePlace(c.env, id);
  if (!deleted) {
    return c.json({ error: 'Place not found' }, 404);
  }

  return c.body(null, 204);
});

export default app;
