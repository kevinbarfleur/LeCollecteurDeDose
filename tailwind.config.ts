import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // PoE-inspired dark palette
        'poe': {
          'bg': '#0c0c0e',
          'surface': '#151518',
          'border': '#2a2a30',
          'text': '#c8c8c8',
          'text-dim': '#7f7f7f',
        },
        // Tier colors
        'tier': {
          't0': '#b8860b',        // Legendary gold
          't0-glow': '#ffd700',
          't1': '#8b5cf6',        // Rare purple
          't1-glow': '#a78bfa',
          't2': '#38bdf8',        // Uncommon blue
          't2-glow': '#7dd3fc',
          't3': '#94a3b8',        // Common silver
        },
        // Rarity colors (PoE style)
        'unique': '#af6025',
      },
      fontFamily: {
        'display': ['Cinzel', 'serif'],
        'body': ['Crimson Text', 'serif'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.7)',
        'glow-t0': '0 0 30px rgba(184, 134, 11, 0.5)',
        'glow-t1': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-t2': '0 0 15px rgba(56, 189, 248, 0.3)',
      },
      animation: {
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config

