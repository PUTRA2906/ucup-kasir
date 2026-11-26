import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { setCurrentUserId } from '@/services/sqlite/db'
import { isNativeApp } from '@/lib/platform'
import { isOnlineNow } from '@/lib/network'
import { getSyncQueue } from '@/lib/sqlite'
import { useConfirm } from '@/composables/useConfirm'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!session.value)

  let unsubscribe: (() => void) | null = null

  /**
   * Baca sesi tersimpan langsung dari localStorage.
   *
   * Dipakai sebagai fallback saat OFFLINE: supabase-js mengembalikan
   * `session: null` bila access token sudah kedaluwarsa dan refresh token
   * gagal dihubungi (tidak ada jaringan). Tanpa fallback ini pengguna yang
   * membuka app offline setelah token kedaluwarsa akan dilempar ke layar
   * masuk — padahal mode offline justru dimaksudkan untuk kondisi itu.
   * Sesi ini hanya dipakai untuk identitas pengguna & query SQLite; saat
   * online kembali, supabase-js akan me-refresh token seperti biasa.
   */
  function readStoredSession(): Session | null {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (parsed?.user?.id && parsed?.access_token) return parsed as Session
      }
    } catch {
      // localStorage tidak tersedia / data rusak — abaikan
    }
    return null
  }

  /** Hapus token auth dari localStorage (dipakai saat logout offline). */
  function clearStoredSession(): void {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) keys.push(key)
      }
      keys.forEach((k) => localStorage.removeItem(k))
    } catch {
      // localStorage tidak tersedia — abaikan
    }
  }

  /**
   * Muat session dari localStorage dan pasang listener perubahan auth.
   * Aman dipanggil berulang kali (idempotent).
   * Jika ada session, set current user id untuk service SQLite.
   *
   * Beberapa pemanggil bisa berjalan bersamaan (router guard, App.vue,
   * main.ts). `initialized` hanya menandai "sudah selesai", jadi pemanggil
   * kedua menunggu promise yang sama — bukan langsung lanjut dengan session
   * yang masih kosong (itu membuat guard mengira belum login dan melempar
   * pengguna ke /signin saat cold start offline).
   */
  let initPromise: Promise<void> | null = null

  async function initialize(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = doInitialize().catch((e) => {
      // Biarkan pemanggil berikutnya mencoba lagi.
      initPromise = null
      throw e
    })
    return initPromise
  }

  async function doInitialize(): Promise<void> {
    if (initialized.value) return
    initialized.value = true

    const { data } = await supabase.auth.getSession()
    // Fallback ke sesi tersimpan bila supabase-js mengembalikan null. Ini
    // terjadi saat offline dengan access token kedaluwarsa (refresh token tak
    // bisa dihubungi). Logout nyata / token dicabut server akan MENGHAPUS
    // entri localStorage terlebih dahulu, sehingga fallback ini null.
    const activeSession = data.session ?? readStoredSession()
    session.value = activeSession
    user.value = activeSession?.user ?? null

    // Set user aktif untuk query SQLite (pengganti RLS)
    if (activeSession?.user?.id) {
      setCurrentUserId(activeSession.user.id)
    } else {
      setCurrentUserId(null)
    }

    // Event yang dianggap "logout nyata" (bukan artefak refresh token).
    // Supabase bisa mengirim SIGNED_OUT sesaat saat refresh halaman bila
    // refresh token gagal diperpanjang di background — jangan dianggap
    // logout selama session masih bisa dibaca dari localStorage.
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        // Verifikasi ulang: jika localStorage masih punya session valid,
        // ini bukan logout nyata — biarkan session tetap aktif.
        // Satu-satunya jalan keluar dari blok ini adalah session
        // beneran sudah tidak ada (token expire permanen / refresh gagal).
        const { data: fresh } = await supabase.auth.getSession()
        const restored = fresh.session ?? readStoredSession()
        if (restored) {
          session.value = restored
          user.value = restored.user
          setCurrentUserId(restored.user.id)
          return
        }
      }
      session.value = newSession
      user.value = newSession?.user ?? null
      // Ikutkan perubahan user ke service SQLite
      if (newSession?.user?.id) {
        setCurrentUserId(newSession.user.id)
      } else {
        setCurrentUserId(null)
      }
    })
    unsubscribe = listener.subscription.unsubscribe
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      session.value = data.session
      user.value = data.user

      // Set user aktif untuk service SQLite
      if (data.user?.id) {
        setCurrentUserId(data.user.id)
      }
      return { data, error: null as Error | null }
    } catch (e: any) {
      return { data: null, error: e as Error }
    } finally {
      loading.value = false
    }
  }

  /**
   * Keluar dari akun.
   *
   * (Isu #2) Pada aplikasi Android (offline-first), data perubahan lokal menunggu
   * di sync_queue untuk di-upload. Jika user logout dalam keadaan queue masih
   * berisi perubahan yang belum tersinkron, login berikutnya (akun sama atau beda)
   * akan men-truncate SQLite + mengosongkan queue → perubahan itu hilang permanen.
   * Karena itu signOut WAJIB memaksakan upload perubahan lokal dulu.
   *
   * Return { cancelled: true } bila user menolak keluar (mis. gagal sinkron lalu
   * memilih batal) — pemanggil tidak boleh navigasi ke /signin saat itu.
   */
  async function signOut(): Promise<{ cancelled: boolean }> {
    // === Lapis perlindungan: flush sync_queue sebelum sesi benar-benar ditutup ===
    if (isNativeApp()) {
      try {
        const pending = await getSyncQueue()
        if (pending.length > 0) {
          if (!isOnlineNow()) {
            // Offline: perubahan TIDAK bisa dikirim. Kalau lanjut logout, login
            // berikutnya menghapusnya (trunkasi + clearSyncQueue). Peringatkan,
            // jangan biarkan hilang tanpa keputusan sadar.
            const { confirm } = useConfirm()
            const proceed = await confirm({
              title: 'Perubahan Belum Tersinkron',
              message:
                `Masih ada ${pending.length} perubahan yang belum tersinkron dan perangkat sedang offline. ` +
                `Jika Anda keluar sekarang, perubahan ini bisa hilang saat login lagi.\n\n` +
                `Sambungkan internet lalu logout ulang untuk amannya. Keluar sekarang juga?`,
              confirmText: 'Keluar Tetap',
              cancelText: 'Batal',
              variant: 'danger',
            })
            if (!proceed) return { cancelled: true }
          } else {
            // Online: upload dulu. Beri tahu sedang memproses (dialog tanpa tombol
            // batal tidak tepat di sini — upload bisa cepat). Cukup jalankan.
            const { uploadChangesToSupabase } = await import('@/services/sync/syncEngine')
            const result = await uploadChangesToSupabase()
            if (result.failed && result.failed > 0) {
              const { confirm } = useConfirm()
              const proceed = await confirm({
                title: 'Sinkronisasi Belum Selesai',
                message:
                  `${result.failed} perubahan gagal tersinkron ke server. ` +
                  `Keluar sekarang berisiko membuat perubahan itu hilang saat login berikutnya.\n\n` +
                  `Coba sinkronkan lagi dari Pengaturan sebelum keluar. Tetap keluar?`,
                confirmText: 'Keluar Tetap',
                cancelText: 'Batal',
                variant: 'danger',
              })
              if (!proceed) return { cancelled: true }
            }
          }
        }
      } catch (e) {
        // Gagal membaca/meng-upload queue tidak boleh mengunci user di dalam app.
        // Lanjutkan logout biasa; kesalahan tercatat oleh sync engine itu sendiri.
        console.error('Flush sync_queue sebelum logout gagal:', e)
      }
    }

    loading.value = true
    try {
      try {
        await supabase.auth.signOut()
      } catch (e) {
        // Offline: revoke sesi di server gagal (tidak ada jaringan). Tetap
        // keluarkan pengguna secara lokal — kalau tidak, tombol keluar tampak
        // tidak berfungsi saat mode offline.
        console.warn('signOut ke server gagal (offline), keluar secara lokal:', e)
      }
      // Pastikan token benar-benar hilang dari penyimpanan, apa pun hasil
      // panggilan signOut di atas (jangan sampai fallback sesi tersimpan
      // menghidupkan kembali sesi yang sudah "keluar").
      clearStoredSession()
      session.value = null
      user.value = null
      setCurrentUserId(null)

      // Reset preferensi UI yang tersimpan per-perangkat (bukan per-akun).
      // Tanpa ini, filter periode laporan milik user lama ikut terlihat saat
      // akun lain login di perangkat yang sama → laporan tampak "kosong"
      // karena range tanggalnya mengacu ke periode akun sebelumnya.
      try {
        localStorage.removeItem('sales_report_period')
        localStorage.removeItem('transaction_profit_period')
      } catch {
        // localStorage tidak tersedia — abaikan
      }

      // === Wipe database lokal setelah sesi ditutup ===
      // Hanya bila perubahan lokal dipastikan sudah tidak menggantung di
      // sync_queue (flush di atas sukses, atau memang tidak ada dari awal).
      // Bila masih ada queue tersisa (offline / upload gagal lalu user tetap
      // keluar), baris lokal JANGAN dihapus — satu-satunya salinan data itu
      // ada di device ini. Queue itu tetap terlindungi lapis-pengaman di
      // downloadAllFromSupabase pada login berikutnya.
      if (isNativeApp()) {
        try {
          const leftover = await getSyncQueue()
          if (leftover.length === 0) {
            const { clearLocalDatabase } = await import('@/services/sync/syncEngine')
            await clearLocalDatabase()
          }
        } catch (e) {
          console.error('Wipe database lokal saat logout gagal:', e)
        }
      }
      return { cancelled: false }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    session,
    loading,
    initialized,
    isAuthenticated,
    initialize,
    signIn,
    signOut,
  }
})