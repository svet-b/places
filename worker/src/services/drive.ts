import { Env } from '../index';
import { getAccessToken } from './sheets';

export async function uploadImage(env: Env, imageBase64: string, filename: string): Promise<string> {
  const token = await getAccessToken(env);

  // Decode base64 to binary
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Build multipart request
  const boundary = 'places_upload_boundary';
  const metadata = JSON.stringify({
    name: filename,
    parents: [env.DRIVE_FOLDER_ID],
  });

  const body = new Uint8Array(
    [
      ...new TextEncoder().encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      ...bytes,
      ...new TextEncoder().encode(`\r\n--${boundary}--`),
    ],
  );

  const uploadResp = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!uploadResp.ok) {
    const text = await uploadResp.text();
    throw new Error(`Drive upload error: ${uploadResp.status} ${text}`);
  }

  const file = (await uploadResp.json()) as { id: string };

  // Make file publicly viewable
  await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'anyone', role: 'reader' }),
  });

  return `https://drive.google.com/uc?id=${file.id}`;
}
