<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
      @click="toggleDropdown"
    >
      <span
        :class="{ hidden: !notifying, flex: notifying }"
        class="absolute right-0 top-0.5 z-1 h-2 w-2 rounded-full bg-orange-400"
      >
        <span
          class="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 -z-1 animate-ping"
        ></span>
      </span>
      <svg
        class="fill-current"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          fill=""
        />
      </svg>
    </button>

    <!-- Dropdown Start - Desktop & Mobile Full Screen -->
    <Teleport to="body">
      <div
        v-if="dropdownOpen"
        :class="[
          'fixed z-[99999]',
          'md:top-[70px] md:right-4 md:h-[480px] md:w-[350px] md:rounded-2xl md:shadow-theme-lg lg:w-[361px]',
          'inset-0 md:inset-auto',
          'flex flex-col border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-dark'
        ]"
      >
      <div
        class="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800"
      >
        <h5 class="text-lg font-semibold text-gray-800 dark:text-white/90">Notifikasi</h5>

        <button
          @click="closeDropdown"
          class="flex items-center justify-center w-10 h-10 text-gray-500 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <svg
            class="fill-current"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
              fill=""
            />
          </svg>
        </button>
      </div>

      <ul class="flex flex-col h-auto overflow-y-auto custom-scrollbar flex-1">
        <li v-if="notifications.length === 0" class="p-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi</p>
        </li>
        <li v-for="notification in notifications" :key="notification.id">
          <button
            @click="handleItemClick(notification)"
            class="flex gap-3 w-full rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 text-left hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
            :class="{ 'bg-brand-50/30 dark:bg-brand-500/5': !notification.is_read }"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-full text-xl flex-shrink-0" :class="getTypeColor(notification.type)">
              {{ getNotificationIcon(notification.type) }}
            </span>

            <span class="block flex-1 min-w-0">
              <span class="mb-1.5 block text-theme-sm">
                <span class="font-medium text-gray-800 dark:text-white/90">
                  {{ notification.title }}
                </span>
              </span>
              <p class="text-theme-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ notification.message }}
              </p>

              <span class="flex items-center gap-2 mt-1.5 text-gray-500 text-theme-xs dark:text-gray-400">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="getTypeColor(notification.type)">
                  {{ getTypeLabel(notification.type) }}
                </span>
                <span class="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>{{ formatTimeAgo(notification.created_at) }}</span>
              </span>
            </span>

            <span v-if="!notification.is_read" class="flex-shrink-0 mt-2">
              <span class="block h-2 w-2 rounded-full bg-brand-500"></span>
            </span>
          </button>
        </li>
      </ul>

      <div class="mt-3 flex gap-2">
        <button
          v-if="notificationsStore.unreadCount > 0"
          @click="markAllAsRead"
          class="flex-1 justify-center rounded-lg border border-gray-300 bg-white p-3 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
        >
          Tandai Semua Dibaca
        </button>
        <router-link
          v-else
          to="#"
          class="flex-1 flex justify-center rounded-lg border border-gray-300 bg-white p-3 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          @click="handleViewAllClick"
        >
          Lihat Semua
        </router-link>
      </div>
      </div>
    </Teleport>
    <!-- Dropdown End -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const notificationsStore = useNotificationsStore()
const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const unsubscribe = ref(null)

const notifying = computed(() => notificationsStore.unreadCount > 0)
const notifications = computed(() => notificationsStore.notifications.slice(0, 8))

const getNotificationIcon = (type) => {
  const icons = {
    stock_alert: '📦',
    transaction: '🛒',
    return: '↩️',
    payment: '💰',
    system: 'ℹ️'
  }
  return icons[type] || 'ℹ️'
}

const getTypeLabel = (type) => {
  const labels = {
    stock_alert: 'Stok',
    transaction: 'Transaksi',
    return: 'Retur',
    payment: 'Pembayaran',
    system: 'Sistem'
  }
  return labels[type] || type
}

const getTypeColor = (type) => {
  const colors = {
    stock_alert: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    transaction: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    return: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-500',
    payment: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500',
    system: 'bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-500'
  }
  return colors[type] || colors.system
}

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Baru saja'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const toggleDropdown = async () => {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    await notificationsStore.fetchNotifications()
  }
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

const handleItemClick = async (notification) => {
  await notificationsStore.markAsRead(notification.id)

  // Navigate berdasarkan tipe notifikasi
  if (notification.type === 'stock_alert' && notification.data?.product_id) {
    router.push('/stock')
  } else if (notification.type === 'transaction' && notification.data?.transaction_id) {
    router.push(`/transactions/${notification.data.transaction_id}`)
  } else if (notification.type === 'return' && notification.data?.return_id) {
    router.push('/returns')
  } else if (notification.type === 'payment' && notification.data?.transaction_id) {
    router.push(`/transactions/${notification.data.transaction_id}`)
  }

  closeDropdown()
}

const handleViewAllClick = () => {
  // TODO: Buat halaman untuk menampilkan semua notifikasi
  closeDropdown()
}

const markAllAsRead = async () => {
  await notificationsStore.markAllAsRead()
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await notificationsStore.fetchNotifications()
  unsubscribe.value = notificationsStore.subscribeToNotifications()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (unsubscribe.value) {
    unsubscribe.value()
  }
})
</script>
