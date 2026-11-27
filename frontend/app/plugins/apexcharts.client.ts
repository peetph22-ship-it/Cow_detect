import { defineAsyncComponent } from 'vue'
import { defineNuxtPlugin } from '#app'

// โหลดไลบรารีกราฟเฉพาะตอนที่หน้าแสดงกราฟจริง (เดิม import ตรง ๆ ทำให้ทุกหน้า รวมหน้า login ต้องโหลด ~300 KB)
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('ApexChart', defineAsyncComponent(() => import('vue3-apexcharts')))
})
