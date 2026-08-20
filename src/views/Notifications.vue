<template>
  <AdminLayout>
    <div class="mx-auto max-w-3xl px-4 pb-20 pt-4 md:px-0 md:pb-6">
      <!-- Header Mobile -->
      <div class="mb-4 flex items-center justify-between md:mb-6">
        <div class="flex items-center gap-3">
          <router-link
            to="/"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:text-gray-900 active:scale-95 md:hidden dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </router-link>
          <div>
            <h1 class="font-outfit text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
              Notifikasi
            </h1>
            <p class="text-[11px] text-gray-500 dark:text-gray-400">
              {{ unreadCount > 0 ? `${unreadCount} notifikasi baru` : 'Tidak ada notifikasi baru' }}
            </p>
          </div>
        </div>
        <button
          v-if="notifications.length > 0"
          @click="markAllAsRead"
          class="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 font-outfit text-xs font-bold text-blue-500 transition active:scale-95 dark:text-blue-400"
        >
          Tandai Semua Dibaca
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="animate-pulse">
          <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div class="flex gap-3">
              <div class="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
                <div class="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="notifications.length === 0"
        class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <h3 class="mt-4 font-outfit text-base font-bold text-gray-900 dark:text-white">
          Tidak Ada Notifikasi
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Anda akan menerima notifikasi untuk aktivitas penting di sini
        </p>
      </div>

      <!-- Notifications List -->
      <div v-else class="space-y-3">
        <div
          v-for="notification in sortedNotifications"
          :key="notification.id"
          @click="handleNotificationClick(notification)"
          class="group cursor-pointer rounded-2xl border border-gray-200 bg-white shadow-sm transition active:scale-[0.98] dark:border-gray-800 dark:bg-white/[0.03]"
          :class="!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''"
        >
          <div class="flex gap-3 p-4">
            <!-- Icon -->
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              :class="getIconClass(notification.type)"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="getIconPath(notification.type)"
                />
              </svg>
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <h3
                  class="font-outfit text-sm font-bold leading-tight text-gray-900 dark:text-white"
                  :class="!notification.is_read ? 'font-extrabold' : ''"
                >
                  {{ notification.title }}
                </h3>
                <span
                  v-if="!notification.is_read"
                  class="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"
                ></span>
              </div>
              <p class="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {{ notification.message }}
              </p>
              <div class="mt-2 flex items-center gap-3">
                <span class="text-[10px] font-medium text-gray-500 dark:text-gray-500">
                  {{ formatTime(notification.created_at) }}
                </span>
                <span
                  class="rounded-md px-2 py-0.5 text-[10px] font-bold"
                  :class="getCategoryClass(notification.type)"
                >
                  {{ getTypeLabel(notification.type) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const notificationsStore = useNotificationsStore()

const loading = ref(true)

const notifications = computed(() => notificationsStore.notifications)
const unreadCount = computed(() => notificationsStore.unreadCount)

const sortedNotifications = computed(() => {
  return [...notifications.value].sort((a, b) => {
    if (a.is_read !== b.is_read) {
      return a.is_read ? 1 : -1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
})

const getIconClass = (type: string) => {
  const classes: Record<string, string> = {
    stock_alert: 'bg-purple-500/10 text-purple-500 dark:bg-purple-500/15',
    transaction: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/15',
    return: 'bg-amber-500/10 text-amber-500 dark:bg-amber-500/15',
    system: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/15',
    payment: 'bg-green-500/10 text-green-500 dark:bg-green-500/15',
  }
  return classes[type] || classes.system
}

const getIconPath = (type: string) => {
  const paths: Record<string, string> = {
    stock_alert: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    transaction: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    return: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    system: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    payment: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  }
  return paths[type] || paths.system
}

const getCategoryClass = (type: string) => {
  const classes: Record<string, string> = {
    stock_alert: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
    transaction: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    return: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    system: 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
    payment: 'bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400',
  }
  return classes[type] || classes.system
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    stock_alert: 'Stok',
    transaction: 'Transaksi',
    return: 'Retur',
    system: 'Sistem',
    payment: 'Pembayaran',
  }
  return labels[type] || 'Sistem'
}

const formatTime = (timestamp: string) => {
  const now = new Date()
  const date = new Date(timestamp)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  if (days < 7) return `${days} hari lalu`

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }).format(date)
}

const handleNotificationClick = async (notification: any) => {
  if (!notification.is_read) {
    await notificationsStore.markAsRead(notification.id)
  }

  // Navigasi berdasarkan data notifikasi
  if (notification.data?.url) {
    router.push(notification.data.url)
  }
}

const markAllAsRead = async () => {
  await notificationsStore.markAllAsRead()
}

onMounted(async () => {
  try {
    await notificationsStore.fetchNotifications()
  } catch (error) {
    console.error('Error loading notifications:', error)
  } finally {
    loading.value = false
  }
})
</script>
