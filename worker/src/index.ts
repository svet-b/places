import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, createJwt } from './auth';
import placesRoutes from './routes/places';
import analyzeRoutes from './routes/analyze';
import uploadRoutes from './routes/upload';

export type Env = {
  API_KEY: string;
  AUTH_PASSWORD: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  SPREADSHEET_ID: string;
  ANTHROPIC_API_KEY: string;
  GOOGLE_PLACES_API_KEY: string;
  GOOGLE_MAPS_KEY: string;
  SCREENSHOTS_BUCKET: R2Bucket;
};

const ALLOWED_ORIGINS = [
  'https://places-9x5.pages.dev',
  'http://localhost:5173',
];

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin) => ALLOWED_ORIGINS.includes(origin) ? origin : '',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400,
}));

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

// Public route: login
app.post('/login', async (c) => {
  const body = await c.req.json<{ password: string }>();

  if (!body.password || body.password !== c.env.AUTH_PASSWORD) {
    return c.json({ error: 'Invalid password' }, 401);
  }

  const token = await createJwt(c.env);
  return c.json({ token });
});

// All routes below require auth
app.use('*', authMiddleware);

// Authenticated route: return frontend config (API keys)
app.get('/config', (c) => {
  return c.json({
    googleMapsKey: c.env.GOOGLE_MAPS_KEY,
  });
});

app.route('/', placesRoutes);
app.route('/', analyzeRoutes);
app.route('/', uploadRoutes);

app.get('/', (c) => c.json({ status: 'ok' }));

export default app;
