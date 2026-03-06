import { Hono } from 'hono';
import { Env } from '../index';
import { getPlaces, appendPlace, updatePlace, deletePlace } from '../services/sheets';

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

  const place = {
    id: body.id || generateId(),
    name: body.name,
    priority: body.priority ?? '',
    category: body.category ?? 'other',
    cuisine: body.cuisine ?? '',
    address: body.address ?? '',
    lat: body.lat ?? '',
    lng: body.lng ?? '',
    google_place_id: body.google_place_id ?? '',
    google_maps_url: body.google_maps_url ?? '',
    source: body.source ?? '',
    list: body.list ?? '',
    notes: body.notes ?? '',
    visited: body.visited ?? 'FALSE',
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

app.delete('/places/:id', async (c) => {
  const id = c.req.param('id');

  const deleted = await deletePlace(c.env, id);
  if (!deleted) {
    return c.json({ error: 'Place not found' }, 404);
  }

  return c.body(null, 204);
});

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    id += chars[b % chars.length];
  }
  return id;
}

export default app;
