<template>
  <ThemeProvider>
    <SidebarProvider>
      <RouterView />
    </SidebarProvider>
    <ConfirmDialogHost />
  </ThemeProvider>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import ConfirmDialogHost from './components/common/ConfirmDialogHost.vue'
import { useAuthStore } from '@/stores/auth'
import { useStoreSettingsStore } from '@/stores/storeSettings'

const authStore = useAuthStore()
const settingsStore = useStoreSettingsStore()

onMounted(async () => {
  // Inisialisasi auth (sudah dipanggil di main.ts, tapi idempotent)
  await authStore.initialize()

  // Jika sudah login, ambil settings
  if (authStore.isAuthenticated) {
    await settingsStore.fetchSettings()
  }
})

// Jika auth berubah (login/logout), handle settings
watch(() => authStore.isAuthenticated, async (loggedIn) => {
  if (loggedIn) {
    await settingsStore.fetchSettings()
  }
  // Redirect TIDAK dilakukan di sini — biarkan router guard yang menangani.
  // Watcher ini reaktif terhadap SIGNED_OUT dari Supabase onAuthStateChange
  // yang bisa terpicu sesaat saat refresh halaman (token refresh gagal),
  // menyebabkan redirect paksa ke /signin meski session masih valid.
})
</script>