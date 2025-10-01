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
        // Muted Blue Rustic Palette - Siren & Lyre Theme
        cream: '#F5F7FA',
        'off-white': '#EEF2F6',
        'sea-mist': '#DFE6ED',
        'stone-blue': '#C8D4DF',
        'driftwood': '#A8B8C7',
        'ocean-grey': '#7A8FA3',
        'deep-teal': '#597387',
        'midnight-blue': '#3D5568',
        'ocean-depth': '#2A3F50',
        'charcoal-blue': '#1F2D3A',
        'sage-blue': '#7C9AA5',
        'aqua-mist': '#95B5BC',
        'seafoam': '#6B8B95',
        // Accent colors for siren theme
        'siren-gold': '#B8A688',
        'lyre-bronze': '#9B8470',
      },
      fontFamily: {
        serif: ['Lora', 'Crimson Pro', 'Georgia', 'serif'],
        display: ['Crimson Pro', 'Lora', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'texture-paper': 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'4\' height=\'4\'%3E%3Cpath d=\'M0 0h1v1H0V0zm2 2h1v1H2V2z\' fill=\'%23C8D4DF\' fill-opacity=\'0.12\'/%3E%3C/svg%3E")',
        'ocean-gradient': 'linear-gradient(135deg, #EEF2F6 0%, #DFE6ED 50%, #C8D4DF 100%)',
        'siren-shimmer': 'linear-gradient(135deg, #597387 0%, #7A8FA3 50%, #B8A688 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'rustic-sm': '0 1px 3px 0 rgba(42, 63, 80, 0.08)',
        'rustic-md': '0 3px 8px -2px rgba(42, 63, 80, 0.12)',
        'rustic-lg': '0 8px 20px -4px rgba(42, 63, 80, 0.15)',
        'rustic-xl': '0 16px 32px -8px rgba(42, 63, 80, 0.18)',
        'ocean-glow': '0 4px 16px -4px rgba(122, 143, 163, 0.25)',
      },
    },
  },
  plugins: [],
}