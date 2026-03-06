import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './auth';
import placesRoutes from './routes/places';
import analyzeRoutes from './routes/analyze';
import uploadRoutes from './routes/upload';

export type Env = {
  API_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  SPREADSHEET_ID: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
  SCREENSHOTS_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Public route: serve screenshots without auth
app.get('/screenshots/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.SCREENSHOTS_BUCKET.get(key);
  if (!object) return c.notFound();
  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=31536000');
  return new Response(object.body, { headers });
});

app.use('*', authMiddleware);

app.route('/', placesRoutes);
app.route('/', analyzeRoutes);
app.route('/', uploadRoutes);

app.get('/', (c) => c.json({ status: 'ok' }));

export default app;
