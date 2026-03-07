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
  { id: 'coffee', label: 'Coffee', icon: Coffee, color: '#8B4513' },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, color: '#DC143C' },
  { id: 'bar', label: 'Bar', icon: Wine, color: '#4B0082' },
  { id: 'bakery', label: 'Bakery', icon: Croissant, color: '#D2691E' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, color: '#2E8B57' },
  { id: 'park', label: 'Park', icon: TreePine, color: '#228B22' },
  { id: 'culture', label: 'Culture', icon: Drama, color: '#4169E1' },
  { id: 'other', label: 'Other', icon: MapPin, color: '#708090' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type Category = (typeof CATEGORIES)[number]['id'];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<string, CategoryDef>;
