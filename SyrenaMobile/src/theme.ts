// Syrena Travel Theme - Exact match with web app
// Based on web/tailwind.config.js

export const colors = {
  // Muted Blue Rustic Palette - Siren & Lyre Theme
  cream: '#F5F7FA',
  offWhite: '#EEF2F6',
  seaMist: '#DFE6ED',
  stoneBlue: '#C8D4DF',
  driftwood: '#A8B8C7',
  oceanGrey: '#7A8FA3',
  deepTeal: '#597387',
  midnightBlue: '#3D5568',
  oceanDepth: '#2A3F50',
  charcoalBlue: '#1F2D3A',
  sageBlue: '#7C9AA5',
  aquaMist: '#95B5BC',
  seafoam: '#6B8B95',
  // Accent colors for siren theme
  sirenGold: '#B8A688',
  lyreBronze: '#9B8470',
  // Additional colors for UI elements
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const fonts = {
  // Serif fonts - for headings and elegant text
  serif: {
    regular: 'Lora-Regular',
    italic: 'Lora-Italic',
  },
  // Display fonts - for large titles
  display: {
    regular: 'CrimsonPro-Regular',
    italic: 'CrimsonPro-Italic',
  },
  // Sans fonts - for body text and UI
  sans: {
    regular: 'Inter-Regular',
  },
};

export const shadows = {
  rusticSm: {
    shadowColor: colors.oceanDepth,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  rusticMd: {
    shadowColor: colors.oceanDepth,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  rusticLg: {
    shadowColor: colors.oceanDepth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  rusticXl: {
    shadowColor: colors.oceanDepth,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const theme = {
  colors,
  fonts,
  shadows,
  spacing,
  borderRadius,
  fontSize,
};

export default theme;
