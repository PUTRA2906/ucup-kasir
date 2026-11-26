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
import { isNativeApp } from '@/lib/platform'
import { installEventLog } from '@/lib/eventLog'
import { startNetworkMonitor } from '@/lib/network'
import { useNavigationStack } from '@/composables/useNavigationStack'
import { vCan } from '@/directives/can'
import { hideAppSplash } from '@/lib/splash'

// Pasang perekam event log SESEDINI MUNGKIN — error WebView/crash yang
// terjadi setelah titik ini ikut terekam otomatis.
installEventLog()

// Mulai pemantau koneksi lebih awal agar status online/offline sudah akurat
// sebelum halaman pertama memanggil service.
startNetworkMonitor()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueApexCharts)
app.directive('can', vCan)

app.mount('#app')

// ============================================================
// Splash screen: tutup setelah rute pertama siap dirender.
// Durasi minimum animasi diatur di lib/splash.ts.
// ============================================================
router.isReady().then(() => {
  // Tunggu satu frame agar konten pertama sempat dilukis di belakang splash.
  requestAnimationFrame(() => hideAppSplash())
})

// Handle Android back button dengan navigation stack
const { handleBackButton } = useNavigationStack()

CapacitorApp.addListener('backButton', async () => {
  const handled = await handleBackButton()

  if (!handled) {
    // Jika tidak ada layer di stack dan tidak bisa back lagi, keluar dari aplikasi
    if (router.currentRoute.value.path === '/' || !router.options.history.state.back) {
      CapacitorApp.exitApp()
    }
  }
})

// ============================================================
// Cold start: pastikan di halaman home
// Android WebView bisa mengembalikan URL terakhir bahkan setelah
// proses dimatikan. Redirect ke / jika perlu.
// ============================================================
if (isNativeApp()) {
  router.isReady().then(async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    await authStore.initialize()
    if (authStore.isAuthenticated && router.currentRoute.value.path !== '/') {
      router.replace('/')
    }
  })
}