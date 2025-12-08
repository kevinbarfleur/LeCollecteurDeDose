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
          'surface-light': '#1a1a1f',
          'border': '#2a2a30',
          'border-light': '#3a3a40',
          'text': '#c8c8c8',
          'text-dim': '#7f7f7f',
          'text-muted': '#5a5a60',
        },
        // Accent color - Copper/Bronze (used for active states, links, highlights)
        'accent': {
          DEFAULT: '#af6025',
          light: '#c97a3a',
          dark: '#8a4d1e',
          glow: 'rgba(175, 96, 37, 0.4)',
          'glow-subtle': 'rgba(175, 96, 37, 0.15)',
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
          't3-glow': '#5a5a5d',   // Lueur grise
        },
        // Rarity colors (PoE style) - alias for accent
        'unique': '#af6025',
      },
      fontFamily: {
        'display': ['Cinzel', 'serif'],
        'body': ['Crimson Text', 'serif'],
      },
      // Border radius aligned with design system
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
      },
      // Custom transition timing functions
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.03, 0.98, 0.52, 0.99)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      // Custom transition durations
      transitionDuration: {
        'fast': '150ms',
        'base': '300ms',
        'slow': '400ms',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.7)',
        'glow-accent': '0 0 15px rgba(175, 96, 37, 0.4)',
        'glow-accent-subtle': '0 0 10px rgba(175, 96, 37, 0.2)',
        'glow-t0': '0 0 20px rgba(201, 162, 39, 0.3)',
        'glow-t1': '0 0 15px rgba(122, 106, 138, 0.25)',
        'glow-t2': '0 0 10px rgba(90, 112, 128, 0.2)',
        'glow-t3': '0 0 8px rgba(90, 90, 93, 0.15)',
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

