import { Env } from '../index';
import { getAccessToken } from './sheets';

interface AnalysisResult {
  name: string | null;
  category: string | null;
  city: string | null;
  address_hint: string | null;
  source_account: string | null;
  source_platform: string | null;
  notes: string | null;
}

export async function analyzeScreenshot(env: Env, imageBase64: string): Promise<AnalysisResult> {
  const accessToken = await getAccessToken(env);
  const resp = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                text: `Look at this screenshot and extract information about a place (restaurant, cafe, bar, shop, etc.) that is being shown or recommended.

Return a JSON object with these fields (use null for any you can't determine):
{
  "name": "place name",
  "category": "one of: coffee, restaurant, bar, bakery, shop, other",
  "city": "city name",
  "address_hint": "any address or location info visible",
  "source_account": "social media account name if visible (e.g. @username)",
  "source_platform": "platform name if identifiable (e.g. Instagram, TikTok, Google Maps)",
  "notes": "any other relevant details (cuisine type, what they're known for, etc.)"
}

Return ONLY the JSON object, no other text.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AnalysisResult;
  } catch {
    return {
      name: null,
      category: null,
      city: null,
      address_hint: null,
      source_account: null,
      source_platform: null,
      notes: text || null,
    };
  }
}

export async function analyzeInstagramPost(env: Env, html: string, url: string): Promise<AnalysisResult> {
  const accessToken = await getAccessToken(env);

  // Extract useful text from HTML: meta tags and visible text are most valuable
  // Truncate to avoid exceeding token limits
  const truncated = html.slice(0, 30000);

  const resp = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `This is the HTML content of an Instagram post (URL: ${url}). Extract information about any place (restaurant, cafe, bar, shop, etc.) mentioned or recommended in this post.

The HTML may contain OpenGraph meta tags, JSON-LD data, or post captions with useful information. Look for place names, locations, and descriptions.

Return a JSON object with these fields (use null for any you can't determine):
{
  "name": "place name",
  "category": "one of: coffee, restaurant, bar, bakery, shop, other",
  "city": "city name",
  "address_hint": "any address or location info visible",
  "source_account": "Instagram account name (e.g. @username)",
  "source_platform": "Instagram",
  "notes": "any other relevant details (cuisine type, what they're known for, etc.)"
}

Return ONLY the JSON object, no other text. If more than one place is mentioned, return the first or main one being recommended.

HTML content:
${truncated}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    return JSON.parse(jsonMatch[0]) as AnalysisResult;
  } catch {
    return {
      name: null,
      category: null,
      city: null,
      address_hint: null,
      source_account: null,
      source_platform: null,
      notes: text || null,
    };
  }
}
