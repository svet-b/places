import { Env } from '../index';

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const HEADERS = [
  'id', 'name', 'priority', 'category', 'cuisine', 'address',
  'lat', 'lng', 'google_place_id', 'google_maps_url', 'source',
  'list', 'notes', 'visited', 'date_added', 'screenshot_url', 'city',
] as const;

type Place = Record<(typeof HEADERS)[number], string>;

// In-memory token cache (per isolate)
let cachedToken: { token: string; expiry: number } | null = null;

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Normalize literal \n sequences to actual newlines, then strip PEM headers
  const pemContents = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function createSignedJwt(env: Env): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPES,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(env.GOOGLE_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64url(signature)}`;
}

export async function getAccessToken(env: Env): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (cachedToken && Date.now() < cachedToken.expiry) {
    return cachedToken.token;
  }

  const jwt = await createSignedJwt(env);

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to get access token: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    token: data.access_token,
    // Cache for expires_in minus 5 minutes
    expiry: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}

export async function getPlaces(env: Env): Promise<Place[]> {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/places!A:Q`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sheets API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { values?: string[][] };
  const rows = data.values;
  if (!rows || rows.length < 2) {
    return [];
  }

  // First row is headers, rest are data
  const headerRow = rows[0];
  return rows.slice(1).map((row) => {
    const place: Record<string, string> = {};
    headerRow.forEach((key, i) => {
      place[key] = row[i] ?? '';
    });
    return place as Place;
  });
}

export async function updatePlace(env: Env, id: string, updates: Partial<Place>): Promise<Place | null> {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/places!A:Q`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sheets API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { values?: string[][] };
  const rows = data.values;
  if (!rows || rows.length < 2) return null;

  const headerRow = rows[0];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return null;

  // Merge updates into existing row
  const existingPlace: Record<string, string> = {};
  headerRow.forEach((key, i) => {
    existingPlace[key] = rows[rowIndex][i] ?? '';
  });

  for (const [key, value] of Object.entries(updates)) {
    if (key in existingPlace) {
      existingPlace[key] = String(value ?? '');
    }
  }

  const updatedRow = HEADERS.map((key) => existingPlace[key] ?? '');
  const range = `places!A${rowIndex + 1}:Q${rowIndex + 1}`;
  const updateUrl = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`;

  const updateResp = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [updatedRow] }),
  });

  if (!updateResp.ok) {
    const text = await updateResp.text();
    throw new Error(`Sheets API error: ${updateResp.status} ${text}`);
  }

  return existingPlace as Place;
}

export async function deletePlace(env: Env, id: string): Promise<boolean> {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/places!A:Q`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sheets API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as { values?: string[][] };
  const rows = data.values;
  if (!rows || rows.length < 2) return false;

  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return false;

  // Need the sheet's numeric ID for deleteDimension
  const metaUrl = `${SHEETS_BASE}/${env.SPREADSHEET_ID}?fields=sheets.properties`;
  const metaResp = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const metaData = (await metaResp.json()) as {
    sheets: { properties: { sheetId: number; title: string } }[];
  };
  const sheet = metaData.sheets.find((s) => s.properties.title === 'places');
  const sheetId = sheet?.properties.sheetId ?? 0;

  const deleteUrl = `${SHEETS_BASE}/${env.SPREADSHEET_ID}:batchUpdate`;
  const deleteResp = await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    }),
  });

  if (!deleteResp.ok) {
    const text = await deleteResp.text();
    throw new Error(`Sheets API error: ${deleteResp.status} ${text}`);
  }

  return true;
}

export async function appendPlace(env: Env, place: Partial<Place>): Promise<Partial<Place>> {
  const token = await getAccessToken(env);
  const url = `${SHEETS_BASE}/${env.SPREADSHEET_ID}/values/places!A:Q:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  // Build row in column order
  const row = HEADERS.map((key) => place[key] ?? '');

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Sheets API error: ${resp.status} ${text}`);
  }

  return place;
}
