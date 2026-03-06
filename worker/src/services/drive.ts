import { Env } from '../index';

export async function uploadImage(env: Env, imageBase64: string, filename: string): Promise<string> {
  // Decode base64 to binary
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to R2
  await env.SCREENSHOTS_BUCKET.put(filename, bytes, {
    httpMetadata: { contentType: 'image/jpeg' },
  });

  // Return the public URL (served by the /screenshots/:key route)
  const workerUrl = 'https://places-api.mari-places.workers.dev';
  return `${workerUrl}/screenshots/${filename}`;
}
