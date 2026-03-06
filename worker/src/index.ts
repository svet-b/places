import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './auth';
import placesRoutes from './routes/places';

export type Env = {
  API_KEY: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  SPREADSHEET_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());
app.use('*', authMiddleware);

app.route('/', placesRoutes);

app.get('/', (c) => c.json({ status: 'ok' }));

export default app;
