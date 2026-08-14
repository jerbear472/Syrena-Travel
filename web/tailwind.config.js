/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Field Journal — warm parchment, sunset terracotta & amber gold.
        // Mirrors PocketCompass/src/theme.ts (lightColors). Keep in sync.
        // Primary Terracotta Palette (actions, active states)
        'primary': '#D95D39',
        'primary-light': '#E77A57',
        'primary-dark': '#B34527',
        'primary-subtle': '#FBE9E2',

        // Accent Amber Palette (picks, stars, highlights)
        'accent': '#E9A23B',
        'accent-light': '#F2B95C',
        'accent-dark': '#C77F1F',
        'accent-subtle': '#FCF1DE',

        // Secondary Warm Stone Palette
        'secondary': '#6D6A63',
        'secondary-light': '#98948B',
        'secondary-dark': '#4E4B45',
        'secondary-subtle': '#F3F0EA',

        // Neutral Scale — warm parchment
        'background': '#FAF6EF',
        'surface': '#FFFFFF',
        'surface-elevated': '#FFFFFF',
        'border': '#E8E0D2',
        'border-subtle': '#F2EDE2',

        // Text Hierarchy — warm ink
        'text-primary': '#2C2A26',
        'text-secondary': '#5A554C',
        'text-tertiary': '#8A8377',
        'text-inverse': '#FFFFFF',

        // Semantic Colors
        'success': '#2F855A',
        'success-subtle': '#EDF7EF',
        'error': '#C53030',
        'error-subtle': '#FBEFEA',
        'warning': '#E9A23B',
        'warning-subtle': '#FCF1DE',

        // Legacy aliases for backwards compatibility (same mapping as mobile)
        'cream': '#FAF6EF',
        'off-white': '#FFFFFF',
        'sea-mist': '#E8E0D2',
        'stone-blue': '#CFC5B2',
        'driftwood': '#98948B',
        'ocean-grey': '#6D6A63',
        'deep-teal': '#D95D39',
        'midnight-blue': '#2C2A26',
        'ocean-depth': '#4E4B45',
        'charcoal-blue': '#2C2A26',
        'siren-gold': '#E9A23B',
        'lyre-bronze': '#C77F1F',
        'aqua-mist': '#48BB78',
        'seafoam': '#EDF7EF',
      },
      fontFamily: {
        serif: ['Georgia', 'Lora', 'Crimson Pro', 'serif'],
        display: ['Georgia', 'Crimson Pro', 'Lora', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'texture-paper': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Cpath d=\'M0 0h1v1H0V0zm2 2h1v1H2V2z\' fill=\'%23E8E0D2\' fill-opacity=\'0.12\'/%3E%3C/svg%3E")',
        'compass-gradient': 'linear-gradient(135deg, #D95D39 0%, #B34527 100%)',
        'sunset-shimmer': 'linear-gradient(135deg, #D95D39 0%, #E77A57 50%, #E9A23B 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) both',
        'slide-in': 'slideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92) translateY(8px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'sm': '0 1px 3px 0 rgba(58, 46, 37, 0.08)',
        'md': '0 3px 8px -2px rgba(58, 46, 37, 0.12)',
        'lg': '0 8px 20px -4px rgba(58, 46, 37, 0.15)',
        'xl': '0 16px 32px -8px rgba(58, 46, 37, 0.18)',
        'glow': '0 4px 16px -4px rgba(233, 162, 59, 0.3)',
        'card': '0 4px 12px -2px rgba(58, 46, 37, 0.12)',
      },
    },
  },
  plugins: [],
}
