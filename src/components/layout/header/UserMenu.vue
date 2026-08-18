<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="flex items-center justify-center w-10 h-10 overflow-hidden rounded-full hover:ring-2 hover:ring-brand-500 transition-all"
      @click.prevent="toggleDropdown"
    >
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        alt="User"
        class="w-full h-full object-cover"
      />
      <span
        v-else
        class="flex h-full w-full items-center justify-center bg-brand-100 text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-500"
      >
        {{ initial }}
      </span>
    </button>

    <!-- Dropdown Start -->
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-3 flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div>
        <span class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
          {{ displayName }}
        </span>
        <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {{ authStore.user?.email }}
        </span>
      </div>

      <ul class="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <li v-for="item in menuItems" :key="item.href">
          <router-link
            :to="item.href"
            class="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <component
              :is="item.icon"
              class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
            />
            {{ item.text }}
          </router-link>
        </li>
      </ul>
      <button
        @click="handleSignOut"
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
      >
        <LogoutIcon
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        Keluar
      </button>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { UserCircleIcon, LogoutIcon, InfoCircleIcon } from '@/icons'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)

const displayName = computed(() => {
  const user = authStore.user
  const fullName = user?.user_metadata?.full_name as string | undefined
  return fullName || user?.email || 'User'
})

const avatarUrl = computed(() => {
  const avatar = authStore.user?.user_metadata?.avatar_url as string | undefined
  return avatar || ''
})

const initial = computed(() => {
  const name = authStore.user?.user_metadata?.full_name as string | undefined
  return (name || authStore.user?.email || 'U').charAt(0).toUpperCase()
})

const menuItems = [
  { href: '/profile', icon: UserCircleIcon, text: 'Edit Profil' },
  { href: '/profile', icon: InfoCircleIcon, text: 'Dukungan' },
]

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const handleSignOut = async () => {
  closeDropdown()
  await authStore.signOut()
  router.push('/signin')
}

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !(dropdownRef.value as HTMLElement).contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
