import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

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
   */
  async function initialize() {
    if (initialized.value) return
    initialized.value = true

    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
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
