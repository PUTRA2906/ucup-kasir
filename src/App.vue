<template>
  <ThemeProvider>
    <SidebarProvider>
      <RouterView />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'

const settingsStore = useStoreSettingsStore()

onMounted(async () => {
  await settingsStore.fetchSettings()
})
</script>
