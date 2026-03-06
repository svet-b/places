import { Hono } from 'hono';
import { Env } from '../index';
import { analyzeScreenshot } from '../services/vision';
import { resolvePlace, resolveMapsUrl } from '../services/places-api';

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
      // Always include city context for better results
      const city = analysis.city || 'Paris';
      resolved = await resolvePlace(c.env, analysis.name, city);
    } catch (e) {
      console.error('Place resolution failed:', e);
    }
  }

  return c.json({
    analysis,
    resolved,
    merged: {
      name: resolved?.name ?? analysis.name ?? '',
      category: analysis.category ?? 'other',
      address: resolved?.address ?? analysis.address_hint ?? '',
      city: resolved?.city ?? analysis.city ?? 'Paris',
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

  const resolved = await resolvePlace(c.env, body.name, body.city || 'Paris');
  if (!resolved) {
    return c.json({ error: 'Place not found' }, 404);
  }

  return c.json(resolved);
});

app.post('/resolve-url', async (c) => {
  const body = await c.req.json<{ url: string }>();

  if (!body.url) {
    return c.json({ error: 'url is required' }, 400);
  }

  try {
    const resolved = await resolveMapsUrl(c.env, body.url);
    if (!resolved) {
      return c.json({ error: 'Could not resolve URL' }, 404);
    }
    return c.json(resolved);
  } catch (e) {
    console.error('URL resolution failed:', e);
    return c.json({ error: 'Failed to resolve URL' }, 500);
  }
});

export default app;
