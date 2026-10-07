import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  alias: {
    cookie: 'cookie-es',
  },

  css: [
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
  },

  runtimeConfig: {
    // โซนนี้สำหรับค่าลับ (ห้ามให้ Client/Browser เห็น)
    supabaseServiceKey: '',

    public: {
      // โซนนี้ Client/Browser มองเห็นได้
      appName: 'Cow-detect-Project',

      // 👉 แนะนำให้เพิ่ม 2 บรรทัดนี้ เพื่อให้ฝั่ง Vue ใช้เรียก API ได้ง่ายๆ
      apiBase: '', // ทะลุไปหา FastAPI
      nodeApiBase: '', // ทะลุไปหา Node.js 
    },
  },
})