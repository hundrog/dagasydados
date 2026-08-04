// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/supabase',
    'nuxt-security'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'Dagas y Dados',
      meta: [
        { name: 'description', content: 'Dagas y Dados' }
      ],
      link: [
        // Favicon básico
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },

        // Tamaños estándar
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },

        // Dispositivos Apple
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },

        // Dispositivos Android
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/android-chrome-512x512.png' },

        // Manifiesto de aplicación web
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  },

  routeRules: {
    '/': { prerender: true },
    // Set layout for specific route
    '/admin/**': { appLayout: 'admin' }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    prerender: {
      autoSubfolderIndex: false
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  security: {
    strict: false,
    ssg: {
      exportToPresets: false
    },
    headers: {
      contentSecurityPolicy: {
        'img-src': ["'self'", 'data:', 'blob:', 'https://dklnezquirguwvndctkb.supabase.co', 'https://placehold.co/', 'https://images.unsplash.com/'],
        'connect-src': ["'self'", 'https://dklnezquirguwvndctkb.supabase.co', 'wss://dklnezquirguwvndctkb.supabase.co'],
        'media-src': ["'self'", 'https://dklnezquirguwvndctkb.supabase.co']
      }
    }
  },

  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/admin(/*)?'],
      exclude: [],
      saveRedirectToCookie: true
    }
  }
})
