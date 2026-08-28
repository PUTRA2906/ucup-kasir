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
import { initSQLite } from '@/lib/sqlite'
import { isNativeApp } from '@/lib/platform'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueApexCharts)

app.mount('#app')

// ============================================================
// Startup
// - Android (native): init SQLite + upload perubahan ke Supabase.
// - Web: langsung pakai Supabase — SQLite tidak dipakai.
// ============================================================
async function startup() {
  if (!isNativeApp()) {
    // Web (mobile browser & desktop): tidak perlu inisialisasi SQLite,
    // semua data dibaca langsung dari Supabase.
    return
  }

  try {
    // 1. Inisialisasi database SQLite lokal
    await initSQLite()

    // 2. Cek & upload perubahan yang tertunda (backup harian)
    //    Jalankan setelah app siap (nextTick) supaya tidak blokir render.
    setTimeout(async () => {
      try {
        const { useAuthStore } = await import('@/stores/auth')
        const { useSyncStore } = await import('@/stores/sync')
        const { useNetwork } = await import('@/lib/network')

        const authStore = useAuthStore()
        await authStore.initialize()

        // Hanya upload jika sudah login & online
        if (authStore.isAuthenticated) {
          const syncStore = useSyncStore()
          await syncStore.loadInfo()
          if (useNetwork().isOnline.value) {
            await syncStore.checkAndUpload()
          }
        }
      } catch (e) {
        console.error('Startup sync gagal (non-critical):', e)
      }
    }, 1500)
  } catch (e) {
    console.error('Gagal inisialisasi SQLite:', e)
  }
}

startup()

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