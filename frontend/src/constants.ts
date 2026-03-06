export const CATEGORIES = [
  'coffee',
  'restaurant',
  'bar',
  'bakery',
  'shop',
  'park',
  'culture',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];
