import { Context, Next } from 'hono';
import { Env } from './index';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header('Authorization');
  if (!header) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = header.replace('Bearer ', '');
  if (token !== c.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
