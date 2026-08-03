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
