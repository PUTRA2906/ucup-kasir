import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { setCurrentUserId } from '@/services/sqlite/db'
import { isNativeApp } from '@/lib/platform'
import { isOnlineNow } from '@/lib/network'
import { getSyncQueue } from '@/lib/sqlite'
import { useConfirm } from '@/composables/useConfirm'
import {
  EMPTY_MEMBERSHIP,
  clearCachedMembership,
  fetchMembership,
  readCachedMembership,
  writeCachedMembership,
  type Membership,
} from '@/services/membership'
import type { Permission, Role } from '@/constants/permissions'
import { setCurrentStoreId } from '@/lib/currentStore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!session.value)

  // === Keanggotaan toko & permission ===
  // Hanya untuk UI. Penegakan sebenarnya di database (RLS + has_permission).
  // Fail-closed: sebelum dimuat / bila user bukan anggota toko, semuanya kosong.
  const storeId = ref<string | null>(null)
  const role = ref<Role | null>(null)
  const permissions = ref<Set<Permission>>(new Set())
  const membershipLoaded = ref(false)

  function applyMembership(m: Membership): void {
    storeId.value = m.storeId
    role.value = m.role
    permissions.value = new Set(m.permissions)
    membershipLoaded.value = true
    // Sinkronkan konteks toko untuk lapisan service (RPC butuh p_store_id).
    setCurrentStoreId(m.storeId)
  }

  function resetMembership(): void {
    applyMembership(EMPTY_MEMBERSHIP)
    membershipLoaded.value = false
  }

  /** Cek permission untuk UI. BUKAN kontrol keamanan. */
  function can(permission: Permission | Permission[]): boolean {
    const list = Array.isArray(permission) ? permission : [permission]
    return list.some((p) => permissions.value.has(p))
  }

  /** Cek beberapa permission sekaligus (semua harus terpenuhi). */
  function canAll(...required: Permission[]): boolean {
    return required.every((p) => permissions.value.has(p))
  }

  /**
   * Muat keanggotaan dari server; bila gagal (offline) pakai cache per-user.
   * Tidak pernah melempar — kegagalan berarti permission kosong (fail-closed).
   */
  async function loadMembership(userId: string | null = user.value?.id ?? null): Promise<void> {
    if (!userId) {
      resetMembership()
      return
    }
    const fresh = await fetchMembership(userId)
    if (fresh) {
      applyMembership(fresh)
      writeCachedMembership(userId, fresh)
      return
    }
    const cached = readCachedMembership(userId)
    if (cached) {
      applyMembership(cached)
      return
    }
    resetMembership()
  }

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

    // Muat role & permission. Gagal (offline) → pakai cache; tetap gagal →
    // permission kosong (fail-closed), bukan "semua boleh".
    await loadMembership(activeSession?.user?.id ?? null)

    // Dipakai listener di bawah untuk mendeteksi pergantian akun.
    let previousUserId = activeSession?.user?.id ?? null

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
        // Akun berganti → muat ulang keanggotaan supaya menu tidak
        // menampilkan hak akun sebelumnya. Token refresh untuk user yang
        // sama tidak memicu query tambahan.
        if (newSession.user.id !== previousUserId) {
          previousUserId = newSession.user.id
          await loadMembership(newSession.user.id)
        }
      } else {
        previousUserId = null
        setCurrentUserId(null)
        resetMembership()
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
      // Muat role & permission sebelum navigasi supaya guard rute tidak
      // sempat melihat permission kosong lalu melempar ke /403.
      await loadMembership(data.user?.id ?? null)
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
      // Cache permission milik akun yang keluar ikut dihapus: perangkat ini
      // bisa dipakai akun lain, dan hak lama tidak boleh tertinggal.
      const signedOutUserId = user.value?.id
      session.value = null
      user.value = null
      setCurrentUserId(null)
      resetMembership()
      if (signedOutUserId) clearCachedMembership(signedOutUserId)

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
    storeId,
    role,
    permissions,
    membershipLoaded,
    can,
    canAll,
    loadMembership,
    initialize,
    signIn,
    signOut,
  }
})