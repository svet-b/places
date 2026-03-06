import { Hono } from 'hono';
import { Env } from '../index';
import { uploadImage } from '../services/drive';

const app = new Hono<{ Bindings: Env }>();

app.post('/upload-image', async (c) => {
  const body = await c.req.json<{ image: string; filename: string }>();

  if (!body.image || !body.filename) {
    return c.json({ error: 'image and filename are required' }, 400);
  }

  // Strip data URL prefix if present
  const base64 = body.image.replace(/^data:image\/[^;]+;base64,/, '');

  const url = await uploadImage(c.env, base64, body.filename);
  return c.json({ url });
});

export default app;
