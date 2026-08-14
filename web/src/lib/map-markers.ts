// Modern category map markers: a colored pin (circle + tail) with a white
// Lucide-style glyph matching the establishment type. Rendered as inline SVG
// data URIs so there are no extra network requests and colors stay in the
// Field Journal palette.

interface MarkerDef {
  color: string;
  // Lucide-style 24x24 stroke paths
  paths: string[];
  circles?: Array<{ cx: number; cy: number; r: number }>;
}

const MARKERS: Record<string, MarkerDef> = {
  restaurant: {
    color: '#D95D39', // terracotta
    paths: [
      'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2',
      'M7 2v20',
      'M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
    ],
  },
  cafe: {
    color: '#C77F1F', // roasted amber
    paths: [
      'M17 8h1a4 4 0 1 1 0 8h-1',
      'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z',
      'M6 2v2', 'M10 2v2', 'M14 2v2',
    ],
  },
  bar: {
    color: '#BE185D', // wine
    paths: [
      'M8 22h8',
      'M7 10h10',
      'M12 15v7',
      'M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z',
    ],
  },
  hotel: {
    color: '#4A6B8A', // lake blue
    paths: [
      'M2 4v16',
      'M2 8h18a2 2 0 0 1 2 2v10',
      'M2 17h20',
      'M6 8v9',
    ],
  },
  viewpoint: {
    color: '#0E7490', // teal
    paths: [
      'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
    ],
    circles: [{ cx: 12, cy: 13, r: 3 }],
  },
  nature: {
    color: '#2F855A', // forest
    paths: [
      'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
      'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
    ],
  },
  shopping: {
    color: '#7C3AED', // plum
    paths: [
      'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z',
      'M3 6h18',
      'M16 10a4 4 0 0 1-8 0',
    ],
  },
  museum: {
    color: '#6D6A63', // stone
    paths: [
      'M3 22h18',
      'M6 18v-8', 'M10 18v-8', 'M14 18v-8', 'M18 18v-8',
      'M2 9h20', 'm2 9 10-7 10 7',
    ],
  },
  'hidden-gem': {
    color: '#E9A23B', // amber
    paths: [
      'M6 3h12l4 6-10 13L2 9Z',
      'M11 3 8 9l4 13 4-13-3-6',
      'M2 9h20',
    ],
  },
  other: {
    color: '#2C2A26', // warm ink
    paths: [
      'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z',
    ],
    circles: [{ cx: 12, cy: 10, r: 3 }],
  },
  // Temp "you clicked here" marker — brand terracotta with a plus.
  new: {
    color: '#D95D39',
    paths: ['M5 12h14', 'M12 5v14'],
  },
};

// 40x48 pin: 16r circle with a white ring, small tail, soft shadow.
// Glyph is the 24x24 icon scaled 0.75 and centered in the circle.
export function categoryMarkerUrl(category?: string | null): string {
  const def = MARKERS[category || ''] || MARKERS.other;
  const glyph = [
    ...def.paths.map(d => `<path d="${d}"/>`),
    ...(def.circles || []).map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`),
  ].join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">` +
    `<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#3A2E25" flood-opacity="0.35"/>` +
    `</filter></defs>` +
    `<g filter="url(#s)">` +
    `<path d="M14 33 L20 44 L26 33 Z" fill="${def.color}"/>` +
    `<circle cx="20" cy="19" r="16" fill="${def.color}" stroke="#FFFFFF" stroke-width="2.5"/>` +
    `</g>` +
    `<g transform="translate(11,10) scale(0.75)" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    glyph +
    `</g>` +
    `</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const MARKER_SIZE = { width: 40, height: 48 };
export const MARKER_ANCHOR = { x: 20, y: 44 };
