import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  alias: {
    cookie: 'cookie-es',
  },

  css: [
    '@mdi/font/css/materialdesignicons.css',
    '~/assets/css/main.css'
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: [ 'cookie-es', '@supabase/ssr' ],
    },
  },

  modules: [
    'vuetify-nuxt-module',
    '@nuxtjs/supabase',
  ],

  components: [
    {
      path: '~/components/Admin/dashboard',
      prefix: 'Admin',
      pathPrefix: false,
    },
    {
      path: '~/components/Admin/user',
      prefix: 'Admin',
      pathPrefix: false,
    },
    {
      path: '~/components/Admin/farm',
      prefix: 'Admin',
      pathPrefix: false,
    },
    {
      path: '~/components/common',
      pathPrefix: false,
    },
    {
      path: '~/components',
    },
  ],

  vuetify: {
    moduleOptions: {
      // ตั้งค่าเพิ่มเติมตามต้องการ
    },

    vuetifyOptions: {
      icons: {
        defaultSet: 'mdi',
      },
      theme: {
        defaultTheme: 'light',
      },
    },
  },

  supabase: {
    redirect: false,
    url: process.env.SUPABASE_URL || 'https://dllekojegxiqbvzwiwdp.supabase.co',
    key: process.env.SUPABASE_KEY || 'sb_publishable_X9twu71pjdIHUmpXWYGr5g_Z3Ah14-3',
  },

  runtimeConfig: {
    // โซนนี้สำหรับค่าลับ (ห้ามให้ Client/Browser เห็น)
    supabaseServiceKey: '',

    public: {
      // โซนนี้ Client/Browser มองเห็นได้
      appName: 'Cow-detect-Project',

      // API Endpoints จาก Environment Variables หรือ fallback Production Render URL
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000',
      nodeApiBase: process.env.NUXT_PUBLIC_NODE_API_BASE || 'https://cow-detect-zea6.onrender.com/api',
    },
  },
})