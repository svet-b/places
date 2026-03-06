import { Env } from '../index';

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
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Look at this screenshot and extract information about a place (restaurant, cafe, bar, shop, etc.) that is being shown or recommended.

Return a JSON object with these fields (use null for any you can't determine):
{
  "name": "place name",
  "category": "one of: coffee, restaurant, bar, bakery, shop, park, culture, other",
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
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API error: ${resp.status} ${text}`);
  }

  const data = (await resp.json()) as {
    content: { type: string; text: string }[];
  };

  const text = data.content.find((c) => c.type === 'text')?.text ?? '';

  try {
    // Extract JSON from the response (handle markdown code blocks)
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
