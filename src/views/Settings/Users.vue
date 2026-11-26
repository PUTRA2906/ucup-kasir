<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Kelola Pengguna" class="hidden md:block" />

    <div class="mx-auto max-w-3xl space-y-4 pb-10">
      <MobilePageHeader title="Kelola Pengguna" subtitle="Anggota toko & akun karyawan">
        <template #actions>
          <button
            @click="openCreateModal"
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition hover:bg-brand-500 active:scale-95"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </template>
      </MobilePageHeader>

      <!-- Info -->
      <div class="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
        Tambahkan akun karyawan langsung dari sini: isi nama, email, kata sandi, dan role.
        Akun dibuat sebagai anggota toko Anda dengan role yang dipilih — bukan pemilik toko baru.
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else-if="loadError" class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        <p class="font-semibold">Gagal memuat data</p>
        <p class="mt-1 text-xs">{{ loadError }}</p>
        <button @click="load" class="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">
          Coba lagi
        </button>
      </div>

      <template v-else>
        <!-- ============ Anggota ============ -->
        <section class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <div>
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Anggota Toko</h2>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ members.length }} akun terdaftar</p>
            </div>
            <button
              @click="openCreateModal"
              class="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-95 sm:flex"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Anggota
            </button>
          </div>

          <!-- Desktop table -->
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full text-left text-xs">
              <thead class="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
                <tr>
                  <th class="px-4 py-3 font-semibold">Anggota</th>
                  <th class="px-4 py-3 font-semibold">Role</th>
                  <th class="px-4 py-3 font-semibold">Status</th>
                  <th class="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in members"
                  :key="m.member_id"
                  class="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400">
                        {{ getInitial(m.display_name || m.email) }}
                      </div>
                      <div class="min-w-0">
                        <p class="truncate font-medium text-gray-900 dark:text-white">
                          {{ m.display_name || 'Tanpa nama' }}
                        </p>
                        <p class="truncate text-[11px] text-gray-500 dark:text-gray-400">{{ m.email || '-' }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase"
                      :class="roleBadge(m.role)"
                    >
                      {{ roleLabel(m.role) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase"
                      :class="m.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'"
                    >
                      {{ m.is_active ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="m.role !== 'owner'" class="flex items-center justify-end gap-2">
                      <SelectField
                        :model-value="m.role"
                        :options="roleOptions"
                        title="Ubah Role"
                        placeholder="Pilih role"
                        :disabled="savingMemberId === m.member_id"
                        button-class="flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        @update:model-value="(v) => changeRole(m, v)"
                      />
                      <button
                        @click="toggleActive(m)"
                        :disabled="savingMemberId === m.member_id"
                        class="rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition disabled:opacity-50"
                        :class="m.is_active
                          ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10'
                          : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10'"
                      >
                        {{ m.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                      </button>
                    </div>
                    <p v-else class="text-right text-[10px] text-gray-400 dark:text-gray-500">
                      Pemilik toko
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile cards -->
          <div class="divide-y divide-gray-100 md:hidden dark:divide-gray-800">
            <div v-for="m in members" :key="m.member_id" class="p-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600 dark:text-brand-400">
                  {{ getInitial(m.display_name || m.email) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {{ m.display_name || 'Tanpa nama' }}
                  </p>
                  <p class="truncate text-[11px] text-gray-500 dark:text-gray-400">{{ m.email || '-' }}</p>
                </div>
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="roleBadge(m.role)">
                  {{ roleLabel(m.role) }}
                </span>
              </div>

              <div v-if="m.role !== 'owner'" class="mt-3 flex items-center gap-2">
                <div class="flex-1">
                  <SelectField
                    :model-value="m.role"
                    :options="roleOptions"
                    title="Ubah Role"
                    placeholder="Pilih role"
                    :disabled="savingMemberId === m.member_id"
                    button-class="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    @update:model-value="(v) => changeRole(m, v)"
                  />
                </div>
                <button
                  @click="toggleActive(m)"
                  :disabled="savingMemberId === m.member_id"
                  class="shrink-0 rounded-xl border px-3 py-2.5 text-xs font-semibold transition disabled:opacity-50"
                  :class="m.is_active
                    ? 'border-red-300 text-red-600 dark:border-red-500/40 dark:text-red-400'
                    : 'border-emerald-300 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-400'"
                >
                  {{ m.is_active ? 'Nonaktifkan' : 'Aktifkan' }}
                </button>
              </div>
              <p v-else class="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                Pemilik toko — role tidak dapat diubah
              </p>
              <p v-if="!m.is_active" class="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Akun nonaktif — tidak bisa mengakses data toko
              </p>
            </div>
          </div>
        </section>

      </template>
    </div>

    <!-- ================= Modal: Tambah Anggota ================= -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showCreateModal"
          class="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          @click.self="closeCreateModal"
        >
          <div class="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl dark:bg-gray-900">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">Tambah Anggota</h3>
                <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                  Akun langsung aktif sebagai {{ roleLabel(createForm.role) }}
                </p>
              </div>
              <button
                @click="closeCreateModal"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mt-4 space-y-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                <input
                  v-model="createForm.fullName"
                  type="text"
                  placeholder="Nama karyawan"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Email <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="createForm.email"
                  type="email"
                  placeholder="karyawan@email.com"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Role</label>
                <SelectField
                  v-model="createForm.role"
                  :options="roleOptions"
                  title="Pilih Role"
                  placeholder="Pilih role"
                  button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p class="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Role menentukan menu & data yang bisa diakses karyawan.
                </p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Kata Sandi <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="createForm.password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
                <p class="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Berikan kata sandi ini kepada karyawan. Minta mereka menggantinya lewat Profil & Keamanan.
                </p>
              </div>
            </div>

            <div class="mt-5 flex gap-2">
              <button
                @click="closeCreateModal"
                class="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                @click="createMember"
                :disabled="creatingMember"
                class="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-[0.98] disabled:opacity-50"
              >
                {{ creatingMember ? 'Membuat...' : 'Buat Akun' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import SelectField from '@/components/common/SelectField.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { ROLE_LABELS, type Role } from '@/constants/permissions'
import { storeUsersService, type StoreMember } from '@/services/storeUsers'

const toast = useToast()
const { confirm } = useConfirm()

const members = ref<StoreMember[]>([])
const loading = ref(true)
const loadError = ref('')
const savingMemberId = ref<string | null>(null)

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Kasir', value: 'kasir' },
  { label: 'Gudang', value: 'gudang' },
  { label: 'Keuangan', value: 'keuangan' },
]

// ---- Tambah anggota ----
const showCreateModal = ref(false)
const creatingMember = ref(false)
const createForm = reactive({
  fullName: '',
  email: '',
  role: 'kasir',
  password: '',
})

function getInitial(value: string | null | undefined): string {
  return (value || '?').trim().charAt(0).toUpperCase() || '?'
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as Role] ?? role
}

function roleBadge(role: string): string {
  switch (role) {
    case 'owner': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'admin': return 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400'
    case 'kasir': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'gudang': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'keuangan': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
  }
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    members.value = await storeUsersService.listMembers()
  } catch (e: any) {
    loadError.value = e?.message || 'Tidak dapat memuat data pengguna'
  } finally {
    loading.value = false
  }
}

function openCreateModal(): void {
  createForm.fullName = ''
  createForm.email = ''
  createForm.role = 'kasir'
  createForm.password = ''
  showCreateModal.value = true
}

function closeCreateModal(): void {
  if (creatingMember.value) return
  showCreateModal.value = false
}

async function createMember(): Promise<void> {
  const email = createForm.email.trim()
  if (!email) {
    toast.warning('Email wajib', 'Isi email untuk akun karyawan.')
    return
  }
  if (createForm.password.length < 6) {
    toast.warning('Kata sandi terlalu pendek', 'Minimal 6 karakter.')
    return
  }
  creatingMember.value = true
  try {
    const result = await storeUsersService.createMemberAccount({
      role: createForm.role,
      email,
      password: createForm.password,
      fullName: createForm.fullName,
    })
    showCreateModal.value = false
    toast.success(
      'Akun dibuat',
      `${result.email} sekarang bisa masuk sebagai ${roleLabel(result.role)}.`,
    )
    await load()
  } catch (e: any) {
    toast.error('Gagal membuat akun', e?.message || 'Terjadi kesalahan')
  } finally {
    creatingMember.value = false
  }
}

async function changeRole(m: StoreMember, value: string | number | boolean | null): Promise<void> {
  const next = String(value)
  if (!next || next === m.role) return
  savingMemberId.value = m.member_id
  try {
    await storeUsersService.updateMember(m.member_id, { role: next })
    m.role = next
    toast.success('Role diperbarui', `${m.display_name || m.email} sekarang ${roleLabel(next)}.`)
  } catch (e: any) {
    toast.error('Gagal mengubah role', e?.message || 'Terjadi kesalahan')
    await load()
  } finally {
    savingMemberId.value = null
  }
}

async function toggleActive(m: StoreMember): Promise<void> {
  const nextActive = !m.is_active
  const ok = await confirm({
    title: nextActive ? 'Aktifkan Anggota' : 'Nonaktifkan Anggota',
    message: nextActive
      ? `${m.display_name || m.email} akan bisa mengakses data toko lagi. Lanjutkan?`
      : `${m.display_name || m.email} akan langsung kehilangan akses ke data toko. Lanjutkan?`,
    confirmText: nextActive ? 'Aktifkan' : 'Nonaktifkan',
    cancelText: 'Batal',
    variant: nextActive ? 'primary' : 'danger',
  })
  if (!ok) return
  savingMemberId.value = m.member_id
  try {
    await storeUsersService.updateMember(m.member_id, { isActive: nextActive })
    m.is_active = nextActive
    toast.success(
      nextActive ? 'Anggota diaktifkan' : 'Anggota dinonaktifkan',
      `${m.display_name || m.email} ${nextActive ? 'kembali' : 'tidak lagi'} memiliki akses.`,
    )
  } catch (e: any) {
    toast.error('Gagal mengubah status', e?.message || 'Terjadi kesalahan')
    await load()
  } finally {
    savingMemberId.value = null
  }
}

onMounted(load)
</script>
