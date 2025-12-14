export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@vueuse/motion/nuxt',
    'nuxt-auth-utils',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
  ],

  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
    redirectOptions: {
      login: '/',
      callback: '/',
      exclude: ['/*'],
    },
    // Use our custom database types file
    types: '~/types/database.ts',
  },

  i18n: {
    locales: [{ code: 'fr', name: 'Français', file: 'fr.json' }],
    defaultLocale: 'fr',
    langDir: 'locales',
    strategy: 'no_prefix',
    lazy: false,
    detectBrowserLanguage: false,
  },

  runtimeConfig: {
    oauth: {
      twitch: {
        clientId: process.env.NUXT_OAUTH_TWITCH_CLIENT_ID,
        clientSecret: process.env.NUXT_OAUTH_TWITCH_CLIENT_SECRET,
        redirectURL: process.env.NUXT_OAUTH_TWITCH_REDIRECT_URL,
      }
    },
    session: {
      maxAge: 60 * 60 * 24 * 7
    },
    // Data API configuration
    dataApiKey: process.env.DATA_API_KEY || '',
    // Supabase configuration (server-side only)
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    // Public runtime config (accessible client-side)
    public: {
      dataApiUrl: process.env.DATA_API_URL || 'http://localhost:3001',
      supabase: {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_KEY || '',
      },
    }
  },

  app: {
    head: {
      title: 'Le Collecteur de Dose',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Collection de cartes Path of Exile pour Twitch' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap' }
      ]
    }
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/cards.css',
    '~/assets/css/foil.css',
    '~/assets/css/foil-effects.css',
    '~/assets/css/altar.css'
  ],

  tailwindcss: {
    cssPath: false,
  },

  components: {
    dirs: [
      {
        path: '~/components/card',
        pathPrefix: false,
      },
      {
        path: '~/components/ui',
        pathPrefix: false,
      },
      '~/components'
    ]
  }
})

