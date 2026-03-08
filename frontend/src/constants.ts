import {
  Coffee,
  UtensilsCrossed,
  Wine,
  Croissant,
  ShoppingBag,
  TreePine,
  Drama,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const CATEGORIES: readonly CategoryDef[] = [
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#C06014' },
  { id: 'bakery', label: 'Bakery', icon: Croissant, color: '#E89030' },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: '#E03E52' },
  { id: 'bar', label: 'Bar', icon: Wine, color: '#7C3AED' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, color: '#0EA5E9' },
  { id: 'park', label: 'Park', icon: TreePine, color: '#22C55E' },
  { id: 'culture', label: 'Culture', icon: Drama, color: '#6366F1' },
  { id: 'other', label: 'Other', icon: MapPin, color: '#94A3B8' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type Category = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<string, CategoryDef>;
