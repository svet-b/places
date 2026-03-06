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
  DRIVE_FOLDER_ID: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());
app.use('*', authMiddleware);

app.route('/', placesRoutes);
app.route('/', analyzeRoutes);
app.route('/', uploadRoutes);

app.get('/', (c) => c.json({ status: 'ok' }));

export default app;
