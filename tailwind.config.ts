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
        // Tier colors - "Glyphes Éteints" palette
        'tier': {
          't0': '#6d5a2a',        // Ambre sombre
          't0-glow': '#c9a227',   // Lueur chaude
          't1': '#3a3445',        // Obsidienne
          't1-glow': '#7a6a8a',   // Lueur froide
          't2': '#3a4550',        // Ardoise
          't2-glow': '#5a7080',   // Éclat subtil
          't3': '#2a2a2d',        // Basalte
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
        'glow-t0': '0 0 20px rgba(201, 162, 39, 0.3)',
        'glow-t1': '0 0 15px rgba(122, 106, 138, 0.25)',
        'glow-t2': '0 0 10px rgba(90, 112, 128, 0.2)',
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

