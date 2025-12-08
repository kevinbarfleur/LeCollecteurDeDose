export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  
  modules: [
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@vueuse/motion/nuxt',
    'nuxt-auth-utils',
    '@nuxtjs/i18n',
  ],

  i18n: {
    locales: [{ code: 'fr', name: 'Français', file: 'fr.json' }],
    defaultLocale: 'fr',
    langDir: 'locales',
    strategy: 'no_prefix',
    lazy: true,
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
    '~/assets/css/foil-effects.css'
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

