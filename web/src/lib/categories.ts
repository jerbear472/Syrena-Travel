// Shared category metadata: label, brand-palette color, subtle tint, and
// Lucide icon. Single source of truth for place-category styling across the
// Guide, My Places, trip views, and modals — matches lib/map-markers.ts.
import {
  Utensils, Coffee, Wine, Hotel, Camera, Leaf, ShoppingBag,
  Landmark, Gem, MapPin, Users, type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  label: string;
  color: string;   // solid — icons, accents
  subtle: string;  // tint — chip/tile backgrounds
  Icon: LucideIcon;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  restaurant:      { label: 'Restaurant',      color: '#D95D39', subtle: '#FBE9E2', Icon: Utensils },
  cafe:            { label: 'Café',            color: '#C77F1F', subtle: '#FCF1DE', Icon: Coffee },
  coffee:          { label: 'Café',            color: '#C77F1F', subtle: '#FCF1DE', Icon: Coffee },
  bar:             { label: 'Bar',             color: '#BE185D', subtle: '#FBE7F0', Icon: Wine },
  hotel:           { label: 'Hotel',           color: '#4A6B8A', subtle: '#EBF1F6', Icon: Hotel },
  viewpoint:       { label: 'Viewpoint',       color: '#0E7490', subtle: '#E6F3F6', Icon: Camera },
  nature:          { label: 'Nature',          color: '#2F855A', subtle: '#EDF7EF', Icon: Leaf },
  shopping:        { label: 'Shopping',        color: '#7C3AED', subtle: '#F1EAFD', Icon: ShoppingBag },
  museum:          { label: 'Museum',          color: '#6D6A63', subtle: '#F3F0EA', Icon: Landmark },
  'hidden-gem':    { label: 'Hidden Gem',      color: '#E9A23B', subtle: '#FCF1DE', Icon: Gem },
  'people-watching': { label: 'People Watching', color: '#6C8BA8', subtle: '#EBF1F6', Icon: Users },
  other:           { label: 'Place',           color: '#2C2A26', subtle: '#F2EDE2', Icon: MapPin },
};

export function categoryMeta(category?: string | null): CategoryMeta {
  return CATEGORY_META[category || ''] || CATEGORY_META.other;
}
