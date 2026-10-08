<template>
  <FullScreenLayout>
    <div class="flex min-h-screen flex-col bg-white dark:bg-gray-950">

      <!-- Bagian atas: ilustrasi / branding -->
      <div class="flex flex-col items-center justify-center bg-brand-600 pb-10 pt-14 dark:bg-brand-700">
        <!-- Logo / ikon aplikasi -->
        <div class="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg">
          <svg class="h-11 w-11 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4H9m0 0a2 2 0 000 4h6a2 2 0 000-4M9 3h6"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Tagih Kios</h1>
        <p class="mt-1 text-sm text-brand-200">Kelola toko, stok & piutang dengan mudah</p>
      </div>

      <!-- Kartu form: melengkung ke atas menutupi bagian bawah header -->
      <div class="-mt-5 flex flex-1 flex-col rounded-t-3xl bg-white px-6 pt-8 pb-6 dark:bg-gray-950">

        <h2 class="mb-1 text-xl font-bold text-gray-900 dark:text-white">Masuk ke Akun</h2>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">Gunakan email dan kata sandi yang terdaftar</p>

        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          class="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10"
        >
          <svg class="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-red-700 dark:text-red-300">{{ errorMessage }}</p>
        </div>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <!-- Email -->
          <div>
            <label for="email" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                <svg class="h-4.5 w-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                v-model="email"
                type="email"
                id="email"
                name="email"
                placeholder="nama@email.com"
                autocomplete="email"
                required
                inputmode="email"
                class="h-12 w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800"
              />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kata Sandi
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
                <svg class="h-4.5 w-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                id="password"
                placeholder="Masukkan kata sandi"
                autocomplete="current-password"
                required
                class="h-12 w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-12 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-800"
              />
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute inset-y-0 right-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabindex="-1"
              >
                <!-- Eye off -->
                <svg v-if="!showPassword" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <!-- Eye on -->
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tombol Masuk -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-base font-semibold text-white shadow-md shadow-brand-500/30 transition active:scale-[0.98] disabled:opacity-60 dark:bg-brand-500"
          >
            <svg
              v-if="authStore.loading"
              class="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ authStore.loading ? 'Memproses...' : 'Masuk' }}
          </button>
        </form>

        <!-- Spacer dorong footer ke bawah -->
        <div class="flex-1"></div>

        <!-- Footer -->
        <p class="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
          Tagih Kios &copy; {{ new Date().getFullYear() }}
        </p>
      </div>

    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { isNativeApp } from '@/lib/platform'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const translateError = (message: string): string => {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi salah.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Silakan cek email Anda.'
  }
  if (lower.includes('user already registered')) {
    return 'Email sudah terdaftar. Silakan masuk.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.'
  }
  return message
}

const handleSubmit = async () => {
  errorMessage.value = ''

  const { error } = await authStore.signIn(email.value, password.value)
  if (error) {
    errorMessage.value = translateError(error.message)
    return
  }

  const redirect = route.query.redirect as string | undefined

  if (isNativeApp()) {
    // Android: download data dari Supabase ke SQLite dulu
    const encoded = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
    router.push(`/sync/download${encoded}`)
  } else {
    // Web: langsung ke app, data dibaca dari Supabase realtime
    router.push(redirect || '/')
  }
}
</script>
