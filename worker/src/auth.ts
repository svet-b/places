import { Context, Next } from 'hono';
import { Env } from './index';

const JWT_ALG = { name: 'HMAC', hash: 'SHA-256' };
const JWT_EXPIRY_DAYS = 30;

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    JWT_ALG,
    false,
    ['sign', 'verify'],
  );
}

function base64url(data: ArrayBuffer | string): string {
  const str = typeof data === 'string' ? btoa(data) : btoa(String.fromCharCode(...new Uint8Array(data)));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (str.length % 4)) % 4);
  return atob(padded);
}

export async function createJwt(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iat: now,
    exp: now + JWT_EXPIRY_DAYS * 86400,
  }));

  const key = await getSigningKey(env.API_KEY);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${payload}`));

  return `${header}.${payload}.${base64url(sig)}`;
}

export async function verifyJwt(env: Env, token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const key = await getSigningKey(env.API_KEY);
    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = Uint8Array.from(base64urlDecode(parts[2]), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('HMAC', key, signature, sigInput);
    if (!valid) return false;

    const payload = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;

    return true;
  } catch {
    return false;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const header = c.req.header('Authorization');
  if (!header) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = header.replace('Bearer ', '');

  // Support both JWT and legacy API key during transition
  if (token === c.env.API_KEY) {
    await next();
    return;
  }

  const valid = await verifyJwt(c.env, token);
  if (!valid) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
