<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Pengaturan Toko" class="hidden md:block" />

    <div v-if="loading && !settingsStore.loaded" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat pengaturan...</p>
      </div>
    </div>

    <div v-else>
      <!-- Mobile Layout -->
      <div class="mx-auto max-w-3xl pb-6 md:hidden">
      <!-- Header Mobile -->
      <MobilePageHeader title="Pengaturan Toko" subtitle="Konfigurasi data usaha dan sistem" hide-back-button />

      <!-- Settings List -->
      <div class="bg-white dark:bg-gray-900">
        <!-- Informasi Toko -->
        <button
          @click="router.push('/settings/store-info')"
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-gray-50 dark:active:bg-white/[0.02]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <svg class="h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Informasi Toko</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ settingsStore.settings.store_name || 'Nama toko, alamat, kontak' }}
              </p>
            </div>
          </div>
        </button>

        <!-- Variabel Global -->
        <button
          @click="router.push('/settings/global-variables')"
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-gray-50 dark:active:bg-white/[0.02]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
              <svg class="h-4 w-4 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Variabel Global</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Limit kredit & upah bongkar muat</p>
            </div>
          </div>
        </button>

        <!-- Profil & Keamanan -->
        <button
          @click="router.push('/settings/profile')"
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-gray-50 dark:active:bg-white/[0.02]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <svg class="h-4 w-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Profil & Keamanan</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Data pribadi dan kata sandi akun</p>
            </div>
          </div>
        </button>

        <!-- Kelola Pengguna -->
        <button
          v-can="'user.manage'"
          @click="router.push('/settings/users')"
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-gray-50 dark:active:bg-white/[0.02]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <svg class="h-4 w-4 text-violet-500 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Kelola Pengguna</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Anggota toko & undangan karyawan</p>
            </div>
          </div>
        </button>

        <!-- Tampilan Aplikasi -->
        <div class="flex w-full items-center justify-between gap-3 px-4 py-3.5">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <svg class="h-4 w-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Tema Gelap</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Kenyamanan mata saat di lapangan</p>
            </div>
          </div>
          <button
            @click="toggleTheme"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
              isDarkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
            ]"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                isDarkMode ? 'translate-x-5' : 'translate-x-0',
              ]"
            />
          </button>
        </div>

        <!-- Log Event -->
        <button
          @click="router.push('/settings/event-log')"
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-gray-50 dark:active:bg-white/[0.02]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
              <svg class="h-4 w-4 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M9 8h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Log Event</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Riwayat error & aktivitas</p>
            </div>
          </div>
        </button>

        <!-- Perbaikan Laba Terealisasi -->
        <button
          @click="router.push('/settings/fix-payment-allocation')"
          class="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition active:bg-gray-50 dark:active:bg-white/[0.02]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <svg class="h-4 w-4 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-medium text-gray-900 dark:text-white">Perbaikan Laba Terealisasi</h2>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Fix alokasi pembayaran cicilan</p>
            </div>
          </div>
        </button>

        <!-- Keluar -->
        <button
          @click="showLogoutConfirm = true"
          class="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:bg-red-50 dark:active:bg-red-500/5"
        >
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
            <LogoutIcon class="h-4 w-4 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h2 class="text-sm font-medium text-red-600 dark:text-red-400">Keluar</h2>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Keluar dari akun aplikasi ini</p>
          </div>
        </button>
      </div>

    </div>

    <!-- Desktop Layout -->
    <div class="mx-auto hidden max-w-3xl space-y-6 md:block">
      <!-- Informasi Toko -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Toko</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Data ini ditampilkan di invoice dan cetak struk</p>
        </div>
        <div class="space-y-4 p-6">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nama Toko
            </label>
            <input
              v-model="formData.store_name"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Ucup Kasir"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Deskripsi Toko
            </label>
            <input
              v-model="formData.store_subtitle"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Deskripsi singkat toko"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Alamat
            </label>
            <textarea
              v-model="formData.store_address"
              rows="2"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Alamat toko"
            ></textarea>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Telepon
              </label>
              <input
                v-model="formData.store_phone"
                type="text"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Email
              </label>
              <input
                v-model="formData.store_email"
                type="email"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="toko@email.com"
              />
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Footer Struk
            </label>
            <input
              v-model="formData.receipt_footer"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Terima kasih atas kunjungan Anda"
            />
          </div>
          <div class="flex justify-end pt-1">
            <button
              @click="saveStoreSection"
              :disabled="savingStore"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <svg v-if="savingStore" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ savingStore ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Variabel Global -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          @click="router.push('/settings/global-variables')"
          class="flex w-full items-center justify-between gap-4 p-6 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <svg class="h-5 w-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Variabel Global</h3>
              <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Limit kredit default & upah bongkar muat per karung</p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Kelola Pengguna -->
      <div v-can="'user.manage'" class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          @click="router.push('/settings/users')"
          class="flex w-full items-center justify-between gap-4 p-6 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <svg class="h-5 w-5 text-violet-500 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a3 3 0 11-3-3" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Kelola Pengguna</h3>
              <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Undang karyawan, atur role, dan nonaktifkan akses</p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Pengaturan Tampilan -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Tampilan</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Pengaturan tampilan aplikasi</p>
        </div>
        <div class="space-y-4 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Mode Gelap (Dark Mode)</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Gunakan tampilan gelap untuk kenyamanan mata</p>
            </div>
            <button
              @click="toggleTheme"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                isDarkMode ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isDarkMode ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Keluar -->
      <div class="overflow-hidden rounded-2xl border border-red-200 bg-white dark:border-red-900/30 dark:bg-gray-900">
        <div class="flex items-center justify-between gap-4 p-6">
          <div class="flex items-center gap-3">
            <LogoutIcon class="h-5 w-5 text-red-500 dark:text-red-400" />
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Keluar</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Keluar dari akun aplikasi ini</p>
            </div>
          </div>
          <button
            @click="showLogoutConfirm = true"
            class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <LogoutIcon class="h-4 w-4" />
            Keluar
          </button>
        </div>
      </div>

    </div>
    </div>

    <ConfirmDialog
      v-model="showLogoutConfirm"
      title="Keluar Aplikasi"
      message="Yakin ingin keluar dari akun ini?"
      confirm-text="Keluar"
      cancel-text="Batal"
      variant="danger"
      @confirm="handleLogout"
    />

    <LoadingOverlay
      :visible="logoutLoading"
      :message="logoutMessage"
      :sub-message="logoutSubMessage"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { useTheme } from '@/components/layout/ThemeProvider.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'
import { LogoutIcon } from '@/icons'

const settingsStore = useStoreSettingsStore()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { isDarkMode, toggleTheme } = useTheme()

const loading = ref(false)
const showLogoutConfirm = ref(false)

// Loading overlay saat proses logout berlangsung
const logoutLoading = ref(false)
const logoutMessage = ref('Keluar...')
const logoutSubMessage = ref('')

// Auto register/unregister layer di navigation stack
useAutoNavigationStack(showLogoutConfirm, 'settings-logout-confirm-dialog')

// Per-section saving state
const savingStore = ref(false)

const saveStoreSection = async () => {
  savingStore.value = true
  try {
    await settingsStore.updateSettings({
      store_name: formData.store_name.trim() || 'Ucup Kasir',
      store_subtitle: formData.store_subtitle.trim() || 'Toko',
      store_address: formData.store_address.trim(),
      store_phone: formData.store_phone.trim(),
      store_email: formData.store_email.trim(),
      receipt_footer: formData.receipt_footer.trim(),
    })
    toast.success('Berhasil!', 'Informasi toko berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan informasi toko')
  } finally {
    savingStore.value = false
  }
}

const formData = reactive({
  store_name: '',
  store_subtitle: '',
  store_address: '',
  store_phone: '',
  store_email: '',
  receipt_footer: '',
})

const handleLogout = async () => {
  showLogoutConfirm.value = false

  logoutLoading.value = true
  logoutMessage.value = 'Keluar...'
  logoutSubMessage.value = ''

  try {
    await authStore.signOut()
    router.push('/signin')
  } catch (error: any) {
    logoutLoading.value = false
    toast.error('Gagal!', error.message || 'Gagal keluar dari akun')
  }
}

onMounted(async () => {
  loading.value = true
  await settingsStore.fetchSettings()
  const s = settingsStore.settings
  formData.store_name = s.store_name || ''
  formData.store_subtitle = s.store_subtitle || ''
  formData.store_address = s.store_address || ''
  formData.store_phone = s.store_phone || ''
  formData.store_email = s.store_email || ''
  formData.receipt_footer = s.receipt_footer || ''

  loading.value = false
})
</script>
