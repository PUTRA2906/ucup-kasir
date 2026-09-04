<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Chart of Accounts" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Chart of Accounts" subtitle="Daftar Akun Pembukuan" @back="$router.back()">
      <template #actions>
        <button
          @click="openAdd"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header Action -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <div></div>
      <div class="flex items-center gap-2">
        <button
          v-if="!store.accounts.length"
          @click="handleSeed"
          class="rounded-xl border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
        >
          Seed Akun Default
        </button>
        <button
          @click="openAdd"
          class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          + Tambah Akun
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat akun...</p>
      </div>
    </div>

    <!-- Error + Empty -->
    <div v-else>
      <div v-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
        <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      </div>

      <!-- Empty State -->
      <div v-if="!store.error && filteredAccounts.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Belum ada akun</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Mulai dengan seed akun default atau tambah akun manual.</p>
        <button
          @click="handleSeed"
          class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Seed Akun Default
        </button>
      </div>

      <!-- Account List -->
      <div v-else-if="filteredAccounts.length > 0" class="space-y-3">
        <!-- Filter Chips -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            @click="typeFilter = opt.value"
            :class="[
              'flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
              typeFilter === opt.value
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Desktop Table -->
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kode</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Nama Akun</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tipe</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo Normal</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="acc in filteredAccounts" :key="acc.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ acc.code }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900 dark:text-white">{{ acc.name }}</span>
                    <span v-if="acc.is_system" class="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">sistem</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase" :class="getTypeBadge(acc.type)">
                    {{ getTypeLabel(acc.type) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ acc.normal_balance === 'debit' ? 'Debit' : 'Kredit' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="acc.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                    {{ acc.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      @click="openEdit(acc)"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      v-if="!acc.is_system"
                      @click="handleDelete(acc)"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="grid grid-cols-1 gap-2.5 md:hidden">
          <div
            v-for="acc in filteredAccounts"
            :key="acc.id"
            class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ acc.name }}</p>
                <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ acc.code }}</p>
              </div>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getTypeBadge(acc.type)">
                {{ getTypeLabel(acc.type) }}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-[10px] text-gray-500 dark:text-gray-400">
                {{ acc.normal_balance === 'debit' ? 'Debit' : 'Kredit' }} · {{ acc.is_active ? 'Aktif' : 'Nonaktif' }}
                <span v-if="acc.is_system" class="text-gray-400 dark:text-gray-500"> · sistem</span>
              </span>
              <div class="flex gap-1">
                <button
                  @click="openEdit(acc)"
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  v-if="!acc.is_system"
                  @click="handleDelete(acc)"
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      @click.self="closeModal"
    >
      <div
        class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900"
        @click.stop
      >
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ editingId ? 'Edit Akun' : 'Tambah Akun' }}</h3>
          <button
            @click="closeModal"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Kode Akun *</label>
            <input
              v-model="form.code"
              :disabled="!!editingId"
              type="text"
              placeholder="contoh: 5-5700"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Akun *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="contoh: Beban Listrik"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipe *</label>
            <select
              v-model="form.type"
              :disabled="!!editingId"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="aset">Aset</option>
              <option value="kewajiban">Kewajiban</option>
              <option value="ekuitas">Ekuitas</option>
              <option value="pendapatan">Pendapatan</option>
              <option value="beban">Beban</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Saldo Normal *</label>
            <select
              v-model="form.normal_balance"
              :disabled="!!editingId"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="debit">Debit</option>
              <option value="kredit">Kredit</option>
            </select>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Akun Aktif</span>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" v-model="form.is_active" class="peer sr-only" />
              <div class="h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-blue-600 dark:bg-gray-700"></div>
              <div class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4"></div>
            </label>
          </div>

          <div v-if="formError" class="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
            <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              @click="closeModal"
              class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
            </button>
            <button
              @click="handleSave"
              :disabled="saving"
              class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Account, AccountInsert, AccountUpdate } from '@/types/database'

const store = useFinanceStore()

const showAddModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const typeFilter = ref<'semua' | Account['type']>('semua')

const typeOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'aset', label: 'Aset' },
  { value: 'kewajiban', label: 'Kewajiban' },
  { value: 'ekuitas', label: 'Ekuitas' },
  { value: 'pendapatan', label: 'Pendapatan' },
  { value: 'beban', label: 'Beban' },
] as const

const form = ref<AccountInsert>({
  code: '',
  name: '',
  type: 'beban',
  normal_balance: 'debit',
  is_active: true,
  is_system: false,
})

const filteredAccounts = computed(() => {
  if (typeFilter.value === 'semua') return store.accounts
  return store.accounts.filter((a) => a.type === typeFilter.value)
})

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    aset: 'Aset',
    kewajiban: 'Kewajiban',
    ekuitas: 'Ekuitas',
    pendapatan: 'Pendapatan',
    beban: 'Beban',
  }
  return labels[type] || type
}

const getTypeBadge = (type: string) => {
  const badges: Record<string, string> = {
    aset: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    kewajiban: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    ekuitas: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    pendapatan: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    beban: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }
  return badges[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const resetForm = () => {
  form.value = {
    code: '',
    name: '',
    type: 'beban',
    normal_balance: 'debit',
    is_active: true,
    is_system: false,
  }
  formError.value = null
}

const openAdd = () => {
  editingId.value = null
  resetForm()
  showAddModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  editingId.value = null
  resetForm()
}

const openEdit = (acc: Account) => {
  editingId.value = acc.id
  form.value = {
    code: acc.code,
    name: acc.name,
    type: acc.type,
    normal_balance: acc.normal_balance,
    is_active: acc.is_active,
    is_system: acc.is_system,
  }
  formError.value = null
  showAddModal.value = true
}

const handleSeed = async () => {
  try {
    await store.seedAccounts()
  } catch (e: any) {
    formError.value = e.message
  }
}

const handleSave = async () => {
  formError.value = null
  if (!form.value.code.trim() || !form.value.name.trim()) {
    formError.value = 'Kode dan nama akun wajib diisi'
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      const updates: AccountUpdate = { name: form.value.name, is_active: form.value.is_active }
      await store.updateAccount(editingId.value, updates)
    } else {
      await store.createAccount({ ...form.value })
    }
    closeModal()
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

const handleDelete = async (acc: Account) => {
  if (!confirm(`Hapus akun "${acc.name}"?`)) return
  try {
    await store.deleteAccount(acc.id)
  } catch (e: any) {
    alert(e.message)
  }
}

onMounted(async () => {
  if (store.accounts.length === 0) {
    await store.fetchAccounts()
  }
})
</script>
