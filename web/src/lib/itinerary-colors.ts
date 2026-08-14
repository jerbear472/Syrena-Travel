// Mirror of PocketCompass/src/lib/itineraryColors.ts. Keep these in sync.
// Day 1 = brand terracotta, Day 2 = brand amber, then 8 distinct hues.
// Picked for visual distinction on a map AND on white cards.
export const DAY_COLORS = [
  '#D95D39', // 1 — Terracotta (brand)
  '#E9A23B', // 2 — Amber (brand accent)
  '#4A6B8A', // 3 — Lake blue
  '#2F855A', // 4 — Forest green
  '#7C3AED', // 5 — Plum
  '#0E7490', // 6 — Teal
  '#BE185D', // 7 — Magenta
  '#65A30D', // 8 — Olive
  '#6D6A63', // 9 — Stone
  '#9333EA', // 10 — Violet
];

export function dayColor(dayNumber: number): string {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
}
