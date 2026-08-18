<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Profil" class="hidden md:block" />

    <!-- Mobile Header -->
    <div class="mb-6 flex items-center gap-3 px-2 md:hidden">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Profil Saya</h1>
    </div>

    <div class="space-y-6 px-4 md:px-0">
      <!-- Informasi Profil -->
      <ComponentCard title="Informasi Profil" desc="Perbarui data pribadi Anda">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
          <!-- Avatar -->
          <div class="flex flex-col items-center gap-3 lg:w-56">
            <div class="relative">
              <div
                class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800"
              >
                <img
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  alt="Avatar"
                  class="h-full w-full object-cover"
                />
                <span
                  v-else
                  class="text-3xl font-semibold text-gray-500 dark:text-gray-400"
                >
                  {{ initial }}
                </span>
              </div>
              <button
                type="button"
                @click="fileInput?.click()"
                :disabled="uploading"
                class="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Ubah foto profil"
              >
                <svg
                  v-if="uploading"
                  class="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <svg
                  v-else
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarSelected"
            />
            <p class="text-center text-xs text-gray-500 dark:text-gray-400">
              JPG/PNG/WebP, maks. 2 MB
            </p>
          </div>

          <!-- Fields -->
          <div class="grid w-full flex-1 grid-cols-1 gap-5">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nama Lengkap <span class="text-error-500">*</span>
              </label>
              <input
                type="text"
                v-model="fullName"
                placeholder="Nama lengkap Anda"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Email
              </label>
              <input
                type="email"
                :value="authStore.user?.email || ''"
                disabled
                class="h-11 w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 shadow-theme-xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Email dikelola oleh admin dan tidak dapat diubah.
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                No. Telepon
              </label>
              <input
                type="tel"
                v-model="phone"
                placeholder="Contoh: 0812-3456-7890"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            type="button"
            @click="saveProfile"
            :disabled="saving"
            class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </ComponentCard>

      <!-- Keamanan -->
      <ComponentCard title="Keamanan" desc="Perbarui kata sandi akun Anda">
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Kata Sandi Baru <span class="text-error-500">*</span>
            </label>
            <input
              type="password"
              v-model="newPassword"
              placeholder="Minimal 6 karakter"
              class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Konfirmasi Kata Sandi <span class="text-error-500">*</span>
            </label>
            <input
              type="password"
              v-model="confirmPassword"
              placeholder="Ulangi kata sandi baru"
              class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>

        <div class="flex justify-end border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            type="button"
            @click="changePassword"
            :disabled="changingPassword"
            class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ changingPassword ? 'Memproses...' : 'Perbarui Kata Sandi' }}
          </button>
        </div>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const avatarUrl = ref('')
const fullName = ref('')
const phone = ref('')
const saving = ref(false)
const uploading = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)

const initial = computed(() => {
  const name = fullName.value.trim() || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const loadProfile = () => {
  const meta = authStore.user?.user_metadata || {}
  fullName.value = (meta.full_name as string) || ''
  phone.value = (meta.phone as string) || ''
  avatarUrl.value = (meta.avatar_url as string) || ''
}

const handleAvatarSelected = async (e: Event) => {
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
    avatarUrl.value = data.publicUrl
    toast.success('Berhasil!', 'Foto profil diunggah. Klik Simpan Perubahan untuk menyimpan.')
  } catch (error) {
    console.error('Error uploading avatar:', error)
    toast.error('Gagal!', 'Gagal mengunggah foto profil')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const saveProfile = async () => {
  if (saving.value) return
  saving.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.value.trim(),
        phone: phone.value.trim() || undefined,
        avatar_url: avatarUrl.value || undefined,
      },
    })
    if (error) throw error
    toast.success('Berhasil!', 'Profil berhasil diperbarui')
  } catch (error) {
    console.error('Error saving profile:', error)
    toast.error('Gagal!', 'Gagal menyimpan profil. Silakan coba lagi.')
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  if (changingPassword.value) return
  if (newPassword.value.length < 6) {
    toast.error('Gagal!', 'Kata sandi minimal 6 karakter')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Gagal!', 'Konfirmasi kata sandi tidak cocok')
    return
  }

  changingPassword.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) throw error
    newPassword.value = ''
    confirmPassword.value = ''
    toast.success('Berhasil!', 'Kata sandi berhasil diperbarui')
  } catch (error) {
    console.error('Error changing password:', error)
    toast.error('Gagal!', 'Gagal memperbarui kata sandi. Silakan coba lagi.')
  } finally {
    changingPassword.value = false
  }
}

onMounted(loadProfile)
</script>
