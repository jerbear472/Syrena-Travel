// Syrena Travel - Classic Luxury Design System
// Deep Navy & Antique Gold for a premium travel experience

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Deep Navy & Gold Color Palette
export const lightColors = {
  // Primary brand colors - Deep Navy
  primary: '#1E3A5F', // Deep Navy
  primaryLight: '#2D4A6F',
  primaryDark: '#152A45',
  primarySubtle: '#E8EDF3',

  // Accent colors - Antique Gold
  accent: '#B8860B', // Antique Gold
  accentLight: '#D4A84B',
  accentDark: '#8B6914',
  accentSubtle: '#FBF6E8',

  // Secondary palette - Warm Slate
  secondary: '#64748B',
  secondaryLight: '#94A3B8',
  secondaryDark: '#475569',
  secondarySubtle: '#F1F5F9',

  // Neutral scale - Clean and sophisticated
  background: '#FAFBFC', // Cool white
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',

  // Text hierarchy - Rich and readable
  textPrimary: '#1A202C', // Deep charcoal
  textSecondary: '#4A5568',
  textTertiary: '#718096',
  textInverse: '#FFFFFF',
  textSubtle: '#A0AEC0',

  // Semantic colors - Classic and clear
  success: '#2F855A', // Rich green
  successLight: '#48BB78',
  successDark: '#276749',
  successSubtle: '#F0FFF4',

  error: '#C53030', // Deep red
  errorLight: '#FC8181',
  errorDark: '#9B2C2C',
  errorSubtle: '#FFF5F5',

  warning: '#B8860B', // Same as gold accent
  warningLight: '#D4A84B',
  warningDark: '#8B6914',
  warningSubtle: '#FBF6E8',

  info: '#1E3A5F', // Same as primary
  infoLight: '#2D4A6F',
  infoDark: '#152A45',
  infoSubtle: '#E8EDF3',

  // Special effects
  overlay: 'rgba(30, 58, 95, 0.5)',
  overlayLight: 'rgba(30, 58, 95, 0.1)',
  shadow: 'rgba(30, 58, 95, 0.12)',

  // Glassmorphism effect
  glass: 'rgba(255, 255, 255, 0.92)',
  glassSubtle: 'rgba(255, 255, 255, 0.75)',

  // Gradient colors
  gradientStart: '#1E3A5F',
  gradientEnd: '#B8860B',

  // Legacy color aliases for backwards compatibility
  cream: '#FAFBFC',
  offWhite: '#FFFFFF',
  seaMist: '#E2E8F0',
  oceanGrey: '#64748B',
  midnightBlue: '#1A202C',
  deepTeal: '#1E3A5F',
  oceanBlue: '#1E3A5F',
  oceanDepth: '#152A45',
  aquaMist: '#E8EDF3',
  coral: '#B8860B',
  stoneBlue: '#64748B',
  driftwood: '#94A3B8',
  seafoam: '#F0FFF4',
  sageBlue: '#64748B',
};

export const darkColors = {
  // Primary brand colors - Navy for dark mode
  primary: '#5B7BA3', // Lighter navy for visibility
  primaryLight: '#7A9BBF',
  primaryDark: '#3D5A7F',
  primarySubtle: '#1A2535',

  // Accent colors - Bright gold on dark
  accent: '#D4A84B', // Bright gold
  accentLight: '#E8C47A',
  accentDark: '#B8860B',
  accentSubtle: '#352D1A',

  // Secondary palette
  secondary: '#94A3B8',
  secondaryLight: '#CBD5E1',
  secondaryDark: '#64748B',
  secondarySubtle: '#1E293B',

  // Neutral scale - Deep navy dark
  background: '#0F1620', // Very deep navy
  surface: '#1A2332', // Dark navy
  surfaceElevated: '#243044', // Lighter navy
  border: '#3D4A5C',
  borderSubtle: '#2D3A4C',

  // Text hierarchy
  textPrimary: '#F7FAFC', // Cool white
  textSecondary: '#E2E8F0',
  textTertiary: '#CBD5E1',
  textInverse: '#0F1620',
  textSubtle: '#64748B',

  // Semantic colors
  success: '#48BB78',
  successLight: '#68D391',
  successDark: '#2F855A',
  successSubtle: '#1C3D2D',

  error: '#FC8181',
  errorLight: '#FEB2B2',
  errorDark: '#C53030',
  errorSubtle: '#3D1C1C',

  warning: '#D4A84B',
  warningLight: '#E8C47A',
  warningDark: '#B8860B',
  warningSubtle: '#352D1A',

  info: '#5B7BA3',
  infoLight: '#7A9BBF',
  infoDark: '#3D5A7F',
  infoSubtle: '#1A2535',

  // Special effects
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  shadow: 'rgba(0, 0, 0, 0.4)',

  // Glassmorphism effect
  glass: 'rgba(26, 35, 50, 0.92)',
  glassSubtle: 'rgba(26, 35, 50, 0.75)',

  // Gradient colors
  gradientStart: '#5B7BA3',
  gradientEnd: '#D4A84B',

  // Legacy color aliases for backwards compatibility
  cream: '#1A2332',
  offWhite: '#0F1620',
  seaMist: '#3D4A5C',
  oceanGrey: '#94A3B8',
  midnightBlue: '#F7FAFC',
  deepTeal: '#5B7BA3',
  oceanBlue: '#5B7BA3',
  oceanDepth: '#3D5A7F',
  aquaMist: '#1A2535',
  coral: '#D4A84B',
  stoneBlue: '#94A3B8',
  driftwood: '#64748B',
  seafoam: '#1C3D2D',
  sageBlue: '#94A3B8',
};

// Typography Scale - Elegant serif titles with clean body text
export const typography = {
  // Font families - Serif for titles, system for body
  fonts: {
    display: {
      regular: Platform.select({
        ios: 'Georgia',
        android: 'serif',
        default: 'Georgia',
      }),
      italic: Platform.select({
        ios: 'Georgia-Italic',
        android: 'serif',
        default: 'Georgia',
      }),
    },
    heading: {
      regular: Platform.select({
        ios: 'Georgia',
        android: 'serif',
        default: 'Georgia',
      }),
      italic: Platform.select({
        ios: 'Georgia-Italic',
        android: 'serif',
        default: 'Georgia',
      }),
    },
    // Menu/navigation font - also serif for elegance
    menu: {
      regular: Platform.select({
        ios: 'Georgia',
        android: 'serif',
        default: 'Georgia',
      }),
    },
    body: {
      regular: Platform.select({
        ios: 'System',
        android: 'sans-serif',
        default: 'System',
      }),
      medium: Platform.select({
        ios: 'System',
        android: 'sans-serif-medium',
        default: 'System',
      }),
      semibold: Platform.select({
        ios: 'System',
        android: 'sans-serif-medium',
        default: 'System',
      }),
      bold: Platform.select({
        ios: 'System',
        android: 'sans-serif-bold',
        default: 'System',
      }),
    },
    mono: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },

  // Size scale - sleek and refined
  sizes: {
    xxs: 10,
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display1: 36,
    display2: 48,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },

  // Letter spacing - tighter for modern feel
  letterSpacing: {
    tighter: -0.03,
    tight: -0.015,
    normal: 0,
    wide: 0.015,
    wider: 0.03,
    widest: 0.06,
  },

  // Font weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

// Spacing system - refined 4pt grid for sleek feel
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  huge: 56,
};

// ============================================
// DESIGN TOKENS - Single Source of Truth
// ============================================

// Border colors (1px only, no thicker)
export const borders = {
  light: 'rgba(13, 38, 76, 0.08)',   // Subtle borders
  medium: 'rgba(13, 38, 76, 0.12)',  // Nav separator only
  width: 1,                           // Always 1px
};

// Radius tokens (use ONLY these values)
export const radii = {
  card: 20,      // Big cards (map, section blocks)
  input: 14,     // Search, text inputs
  chip: 10,      // Pills, badges, chips
};

// Card system
export const cards = {
  padding: 16,
  margin: 16,
  background: '#FFFFFF',
  backgroundAlt: '#F6F8FB',
};

// Border radii - Sleek and refined
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,

  // Component-specific - use design tokens
  button: 10,
  card: 20,      // Use radii.card
  modal: 20,
  input: 14,     // Use radii.input
};

// Shadows - Deep navy tones for elegant depth
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
  xxl: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },

  // Special shadows
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 0,
  }),

  // Soft card shadow
  card: {
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },

  inner: {
    // React Native doesn't support inner shadows natively
    // This is a placeholder for web compatibility
  },
};

// Animation configurations
export const animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 400,
    verySlow: 600,
  },
  
  easing: {
    // React Native easing functions
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    
    // Spring configurations
    spring: {
      tension: 40,
      friction: 7,
    },
    springBouncy: {
      tension: 30,
      friction: 5,
    },
    springStiff: {
      tension: 100,
      friction: 10,
    },
  },
};

// Layout constants
export const layout = {
  screenWidth,
  screenHeight,
  
  // Content widths
  contentMaxWidth: 600,
  contentPadding: spacing.lg,
  
  // Component sizes
  headerHeight: 60,
  tabBarHeight: Platform.select({
    ios: 84,
    android: 70,
    default: 70,
  }),
  
  // Safe areas
  safeAreaInsets: {
    top: Platform.select({
      ios: 44,
      android: 24,
      default: 24,
    }),
    bottom: Platform.select({
      ios: 34,
      android: 0,
      default: 0,
    }),
  },
  
  // Grid
  gridGutter: spacing.md,
  gridColumns: 12,
};

// Z-index scale
export const zIndex = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// Glass morphism styles
export const glassMorphism = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dark: {
    backgroundColor: 'rgba(30, 35, 48, 0.7)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Note: backdropFilter is not supported in React Native
  // These styles are for web compatibility
};

// Complete theme object
export const theme = {
  colors: lightColors, // Default to light mode
  darkColors,
  typography,
  spacing,
  borderRadius,
  shadows: {
    ...shadows,
    // Legacy shadow aliases
    rusticLg: shadows.lg,
    rusticMd: shadows.md,
  },
  animation,
  layout,
  zIndex,
  breakpoints,
  glassMorphism,

  // Design tokens - single source of truth
  borders,
  radii,
  cards,

  // Legacy property aliases for backwards compatibility
  fontSize: typography.sizes,
  fonts: {
    sans: {
      regular: typography.fonts.body.regular,
      medium: typography.fonts.body.medium,
      semibold: typography.fonts.body.semibold,
      bold: typography.fonts.body.bold,
    },
    serif: {
      regular: typography.fonts.heading.regular,
      italic: typography.fonts.heading.italic,
      bold: typography.fonts.heading.regular, // Fallback - serif doesn't have bold variant
    },
    mono: typography.fonts.mono,
  },
};

// Helper function to get current theme colors
export const getThemeColors = (isDark: boolean) => {
  return isDark ? darkColors : lightColors;
};

export default theme;