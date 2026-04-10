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
        // Deep Navy & Antique Gold - Matching Mobile App Theme
        // Primary Navy Palette
        'primary': '#1E3A5F',
        'primary-light': '#2D4A6F',
        'primary-dark': '#152A45',
        'primary-subtle': '#E8EDF3',

        // Accent Gold Palette
        'accent': '#B8860B',
        'accent-light': '#D4A84B',
        'accent-dark': '#8B6914',
        'accent-subtle': '#FBF6E8',

        // Secondary Slate Palette
        'secondary': '#64748B',
        'secondary-light': '#94A3B8',
        'secondary-dark': '#475569',
        'secondary-subtle': '#F1F5F9',

        // Neutral Scale
        'background': '#FAFBFC',
        'surface': '#FFFFFF',
        'surface-elevated': '#FFFFFF',
        'border': '#E2E8F0',
        'border-subtle': '#F1F5F9',

        // Text Hierarchy
        'text-primary': '#1A202C',
        'text-secondary': '#4A5568',
        'text-tertiary': '#718096',
        'text-inverse': '#FFFFFF',

        // Semantic Colors
        'success': '#2F855A',
        'success-subtle': '#F0FFF4',
        'error': '#C53030',
        'error-subtle': '#FFF5F5',
        'warning': '#B8860B',
        'warning-subtle': '#FBF6E8',

        // Legacy aliases for backwards compatibility
        'cream': '#FAFBFC',
        'off-white': '#FFFFFF',
        'sea-mist': '#E2E8F0',
        'stone-blue': '#94A3B8',
        'driftwood': '#94A3B8',
        'ocean-grey': '#64748B',
        'deep-teal': '#1E3A5F',
        'midnight-blue': '#1E3A5F',
        'ocean-depth': '#152A45',
        'charcoal-blue': '#1A202C',
        'siren-gold': '#B8860B',
        'lyre-bronze': '#8B6914',
      },
      fontFamily: {
        serif: ['Georgia', 'Lora', 'Crimson Pro', 'serif'],
        display: ['Georgia', 'Crimson Pro', 'Lora', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'texture-paper': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Cpath d=\'M0 0h1v1H0V0zm2 2h1v1H2V2z\' fill=\'%23E2E8F0\' fill-opacity=\'0.12\'/%3E%3C/svg%3E")',
        'navy-gradient': 'linear-gradient(135deg, #1E3A5F 0%, #152A45 100%)',
        'gold-shimmer': 'linear-gradient(135deg, #1E3A5F 0%, #64748B 50%, #B8860B 100%)',
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
        'sm': '0 1px 3px 0 rgba(30, 58, 95, 0.08)',
        'md': '0 3px 8px -2px rgba(30, 58, 95, 0.12)',
        'lg': '0 8px 20px -4px rgba(30, 58, 95, 0.15)',
        'xl': '0 16px 32px -8px rgba(30, 58, 95, 0.18)',
        'glow': '0 4px 16px -4px rgba(184, 134, 11, 0.25)',
        'card': '0 4px 12px -2px rgba(30, 58, 95, 0.12)',
      },
    },
  },
  plugins: [],
}
