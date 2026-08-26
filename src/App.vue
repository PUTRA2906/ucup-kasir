<template>
  <ThemeProvider>
    <SidebarProvider>
      <RouterView />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import { useAuthStore } from '@/stores/auth'
import { useStoreSettingsStore } from '@/stores/storeSettings'

const authStore = useAuthStore()
const settingsStore = useStoreSettingsStore()
const router = useRouter()

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
  } else {
    // Redirect ke signin saat logout (untuk safety)
    if (router.currentRoute.value.path !== '/signin') {
      router.push('/signin')
    }
  }
})
</script>