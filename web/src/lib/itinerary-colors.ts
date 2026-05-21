// Palette for up to 10 days. Picked for visual distinction on a map AND on
// white cards. Order matters: Day 1 is the navy brand color.
export const DAY_COLORS = [
  '#1E3A5F', // 1 — Navy (brand)
  '#B8860B', // 2 — Antique gold (brand accent)
  '#C2410C', // 3 — Burnt orange
  '#2F855A', // 4 — Forest green
  '#7C3AED', // 5 — Plum
  '#0E7490', // 6 — Teal
  '#BE185D', // 7 — Magenta
  '#65A30D', // 8 — Olive
  '#475569', // 9 — Slate
  '#9333EA', // 10 — Violet
];

export function dayColor(dayNumber: number): string {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
}
