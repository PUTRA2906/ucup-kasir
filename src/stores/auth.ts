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
   * Muat session dari localStorage dan pasang listener perubahan auth.
   * Aman dipanggil berulang kali (idempotent).
   * Jika ada session, set current user id untuk service SQLite.
   */
  async function initialize() {
    if (initialized.value) return
    initialized.value = true

    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null

    // Set user aktif untuk query SQLite (pengganti RLS)
    if (data.session?.user?.id) {
      setCurrentUserId(data.session.user.id)
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
        if (fresh.session) {
          session.value = fresh.session
          user.value = fresh.session.user
          setCurrentUserId(fresh.session.user.id)
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
      await supabase.auth.signOut()
      session.value = null
      user.value = null
      setCurrentUserId(null)
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