import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { setCurrentUserId } from '@/services/sqlite/db'

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
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

  async function signOut() {
    loading.value = true
    try {
      await supabase.auth.signOut()
      session.value = null
      user.value = null
      setCurrentUserId(null)
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