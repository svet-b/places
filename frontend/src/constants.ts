import {
  Coffee,
  UtensilsCrossed,
  Wine,
  Croissant,
  ShoppingBag,
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
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#E89030' },
  { id: 'bakery', label: 'Bakery', icon: Croissant, color: '#E03E52' },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: '#7C3AED' },
  { id: 'bar', label: 'Bar', icon: Wine, color: '#0EA5E9' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, color: '#22C55E' },
  { id: 'other', label: 'Other', icon: MapPin, color: '#94A3B8' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type Category = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<string, CategoryDef>;
