import { Hono } from 'hono';
import { Env } from '../index';
import { analyzeScreenshot } from '../services/vision';
import { resolvePlace } from '../services/places-api';

const app = new Hono<{ Bindings: Env }>();

app.post('/analyze-screenshot', async (c) => {
  const body = await c.req.json<{ image: string }>();

  if (!body.image) {
    return c.json({ error: 'image is required' }, 400);
  }

  // Strip data URL prefix if present
  const base64 = body.image.replace(/^data:image\/[^;]+;base64,/, '');

  // Analyze with Claude Vision
  const analysis = await analyzeScreenshot(c.env, base64);

  // Try to resolve via Google Places if we got a name
  let resolved = null;
  if (analysis.name) {
    try {
      resolved = await resolvePlace(c.env, analysis.name, analysis.city ?? undefined);
    } catch {
      // Resolution failed — return analysis only
    }
  }

  return c.json({
    analysis,
    resolved,
    merged: {
      name: resolved?.name ?? analysis.name ?? '',
      category: analysis.category ?? 'other',
      address: resolved?.address ?? analysis.address_hint ?? '',
      city: resolved?.city ?? analysis.city ?? '',
      lat: resolved?.lat ?? 0,
      lng: resolved?.lng ?? 0,
      google_place_id: resolved?.google_place_id ?? '',
      google_maps_url: resolved?.google_maps_url ?? '',
      source: [analysis.source_platform, analysis.source_account].filter(Boolean).join(' — '),
      notes: analysis.notes ?? '',
    },
  });
});

app.post('/resolve-place', async (c) => {
  const body = await c.req.json<{ name: string; city?: string }>();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const resolved = await resolvePlace(c.env, body.name, body.city);
  if (!resolved) {
    return c.json({ error: 'Place not found' }, 404);
  }

  return c.json(resolved);
});

export default app;
