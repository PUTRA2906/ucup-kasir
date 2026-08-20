import './assets/main.css'
// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'jsvectormap/dist/jsvectormap.css'
import 'flatpickr/dist/flatpickr.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import VueApexCharts from 'vue3-apexcharts'
import { App as CapacitorApp } from '@capacitor/app'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueApexCharts)

app.mount('#app')

// Handle Android back button
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack || router.currentRoute.value.path === '/') {
    // Jika di halaman home atau tidak bisa back, keluar dari aplikasi
    CapacitorApp.exitApp()
  } else {
    // Navigasi back menggunakan router Vue
    router.back()
  }
})
