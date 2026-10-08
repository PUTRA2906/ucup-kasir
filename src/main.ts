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
import { installEventLog, logEvent, flushToSQLite } from '@/lib/eventLog'
import { useNavigationStack } from '@/composables/useNavigationStack'
import { pushStartupLog } from '@/composables/useStartupLog'

// Pasang perekam event log SESEDINI MUNGKIN — error WebView/crash yang
// terjadi setelah titik ini ikut terekam otomatis.
installEventLog()

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
    pushStartupLog('Menginisialisasi database lokal...')
    await initSQLite()
    logEvent({ level: 'info', source: 'sqlite', event: 'init_ok', message: 'SQLite lokal siap' })
    pushStartupLog('Database lokal siap ✓')

    // Pindahkan entry yang tertahan di localStorage ke tabel SQLite.
    pushStartupLog('Memindahkan log ke database...')
    await flushToSQLite()
    pushStartupLog('Log berhasil disimpan ✓')

    // 2. Cek & upload perubahan yang tertunda (backup harian)
    //    Jalankan setelah app siap (nextTick) supaya tidak blokir render.
    setTimeout(async () => {
      try {
        pushStartupLog('Memuat sesi pengguna...')
        const { useAuthStore } = await import('@/stores/auth')
        const { useSyncStore } = await import('@/stores/sync')
        const { useNetwork } = await import('@/lib/network')

        const authStore = useAuthStore()
        await authStore.initialize()

        // Hanya upload jika sudah login & online
        if (authStore.isAuthenticated) {
          pushStartupLog('Pengguna terautentikasi ✓')
          const syncStore = useSyncStore()
          await syncStore.loadInfo()
          if (useNetwork().isOnline.value) {
            pushStartupLog('Mengunggah perubahan yang tertunda...')
            const result = await syncStore.checkAndUpload()
            const uploaded = (result as any)?.uploaded ?? 0
            if (uploaded > 0) {
              pushStartupLog(`${uploaded} perubahan berhasil dikirim ke server ✓`)
            } else {
              pushStartupLog('Tidak ada perubahan tertunda ✓')
            }
          } else {
            pushStartupLog('Perangkat offline — perubahan akan dikirim saat online', 'warn')
          }
        } else {
          pushStartupLog('Belum login, melewati sinkronisasi')
        }
      } catch (e) {
        pushStartupLog(`Sinkronisasi startup gagal: ${(e as Error)?.message || String(e)}`, 'error')
        console.error('Startup sync gagal (non-critical):', e)
      }
    }, 1500)
  } catch (e) {
    pushStartupLog(`Gagal inisialisasi database: ${(e as Error)?.message || String(e)}`, 'error')
    console.error('Gagal inisialisasi SQLite:', e)
  }
}

startup()

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