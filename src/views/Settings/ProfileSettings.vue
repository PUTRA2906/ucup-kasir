<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Profil & Keamanan" class="hidden md:block" />
    <div class="mx-auto max-w-lg space-y-4 pb-8">
      <MobilePageHeader
        title="Profil & Keamanan"
        subtitle="Data pribadi dan kata sandi akun"
        back-to="/settings"
      />

      <!-- Informasi Profil -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Informasi Profil</h3>

        <!-- Avatar -->
        <div class="mb-4 flex flex-col items-center gap-2">
          <div class="relative">
            <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <img
                v-if="profileData.avatarUrl"
                :src="profileData.avatarUrl"
                alt="Avatar"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-2xl font-semibold text-gray-500 dark:text-gray-400">
                {{ profileInitial }}
              </span>
            </div>
            <button
              type="button"
              @click="fileInput?.click()"
              :disabled="uploading"
              class="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white shadow-lg hover:bg-blue-600 disabled:opacity-60 dark:border-gray-900"
            >
              <svg v-if="uploading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleAvatarSelected" />
          <p class="text-center text-[10px] text-gray-500 dark:text-gray-400">JPG/PNG/WebP, maks. 2 MB</p>
        </div>

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
            <input
              v-model="profileData.fullName"
              type="text"
              placeholder="Nama lengkap Anda"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              :value="authStore.user?.email || ''"
              disabled
              class="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-3 py-2.5 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            />
            <p class="mt-1 text-[10px] text-gray-400 dark:text-gray-500">Email tidak dapat diubah</p>
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">No. Telepon</label>
            <input
              v-model="profileData.phone"
              type="tel"
              placeholder="081234567890"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <button
            @click="saveProfile"
            :disabled="savingProfile"
            class="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
          >
            <span v-if="savingProfile" class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menyimpan...
            </span>
            <span v-else>Simpan Informasi Profil</span>
          </button>
        </div>
      </div>

      <!-- Keamanan Akun -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Keamanan Akun</h3>
        <p class="mb-3 text-[10px] text-gray-400 dark:text-gray-500">Ubah kata sandi untuk menjaga keamanan akun Anda</p>

        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Kata Sandi Baru</label>
            <input
              v-model="profileData.newPassword"
              type="password"
              placeholder="Minimal 6 karakter"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Konfirmasi Kata Sandi</label>
            <input
              v-model="profileData.confirmPassword"
              type="password"
              placeholder="Ulangi kata sandi baru"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <button
            @click="changePassword"
            :disabled="changingPassword"
            class="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 py-2.5 text-xs font-bold text-amber-600 transition hover:bg-amber-500/20 active:scale-[0.98] disabled:opacity-50 dark:text-amber-400"
          >
            <span v-if="changingPassword" class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memperbarui...
            </span>
            <span v-else>Perbarui Kata Sandi</span>
          </button>
        </div>
      </div>

    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { supabase } from '@/lib/supabase'

const authStore = useAuthStore()
const toast = useToast()

const savingProfile = ref(false)
const changingPassword = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const profileData = reactive({
  avatarUrl: '',
  fullName: '',
  phone: '',
  newPassword: '',
  confirmPassword: '',
})

const profileInitial = computed(() => {
  const name = profileData.fullName.trim() || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

function loadProfile() {
  const meta = authStore.user?.user_metadata || {}
  profileData.fullName = (meta.full_name as string) || ''
  profileData.phone = (meta.phone as string) || ''
  profileData.avatarUrl = (meta.avatar_url as string) || ''
}

async function handleAvatarSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('Gagal!', 'File harus berupa gambar (JPG/PNG/WebP)')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Gagal!', 'Ukuran foto maksimal 2 MB')
    return
  }

  uploading.value = true
  try {
    const userId = authStore.user?.id
    if (!userId) throw new Error('User tidak ditemukan')

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    profileData.avatarUrl = data.publicUrl
    toast.success('Berhasil!', 'Foto profil diunggah')
  } catch (error) {
    console.error('Error uploading avatar:', error)
    toast.error('Gagal!', 'Gagal mengunggah foto profil')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function saveProfile() {
  savingProfile.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profileData.fullName.trim(),
        phone: profileData.phone.trim() || undefined,
        avatar_url: profileData.avatarUrl || undefined,
      },
    })
    if (error) throw error
    toast.success('Berhasil!', 'Informasi profil berhasil disimpan')
  } catch (e: any) {
    toast.error('Gagal!', e.message || 'Gagal menyimpan profil')
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  if (changingPassword.value) return
  if (profileData.newPassword.length < 6) {
    toast.error('Gagal!', 'Kata sandi minimal 6 karakter')
    return
  }
  if (profileData.newPassword !== profileData.confirmPassword) {
    toast.error('Gagal!', 'Konfirmasi kata sandi tidak cocok')
    return
  }

  changingPassword.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: profileData.newPassword })
    if (error) throw error
    profileData.newPassword = ''
    profileData.confirmPassword = ''
    toast.success('Berhasil!', 'Kata sandi berhasil diperbarui')
  } catch (error) {
    console.error('Error changing password:', error)
    toast.error('Gagal!', 'Gagal memperbarui kata sandi')
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>
