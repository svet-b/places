export const CATEGORIES = [
  { id: 'coffee', label: 'Coffee', emoji: '\u2615', color: '#8B4513' },
  { id: 'restaurant', label: 'Restaurant', emoji: '\uD83C\uDF7D\uFE0F', color: '#DC143C' },
  { id: 'bar', label: 'Bar', emoji: '\uD83C\uDF78', color: '#4B0082' },
  { id: 'bakery', label: 'Bakery', emoji: '\uD83E\uDD50', color: '#D2691E' },
  { id: 'shop', label: 'Shop', emoji: '\uD83D\uDECD\uFE0F', color: '#2E8B57' },
  { id: 'park', label: 'Park', emoji: '\uD83C\uDF3F', color: '#228B22' },
  { id: 'culture', label: 'Culture', emoji: '\uD83C\uDFAD', color: '#4169E1' },
  { id: 'other', label: 'Other', emoji: '\uD83D\uDCCD', color: '#708090' },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type Category = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<string, (typeof CATEGORIES)[number]>;
