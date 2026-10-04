import { defineNuxtPlugin } from '#app'
import ApexCharts from 'vue3-apexcharts'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('ApexChart', ApexCharts)
})