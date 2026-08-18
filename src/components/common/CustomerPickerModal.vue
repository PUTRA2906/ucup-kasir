<template>
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
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
          enter-to-class="translate-y-0 opacity-100 sm:scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100 sm:scale-100"
          leave-to-class="translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="isOpen"
            class="flex h-[85vh] w-full flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:h-auto sm:max-h-[75vh] sm:w-full sm:max-w-lg sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Pilih Customer</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ filteredCustomers.length }} customer ditemukan
                </p>
              </div>
              <button
                @click="close"
                class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Search & Filter -->
            <div class="space-y-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <!-- Search -->
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref="searchInput"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari nama atau nomor HP..."
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>

              <!-- Kecamatan Filter -->
              <div class="relative z-20">
                <select
                  v-model="selectedKecamatan"
                  class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="" class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90">
                    Semua Kecamatan
                  </option>
                  <option
                    v-for="k in availableKecamatan"
                    :key="k"
                    :value="k"
                    class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    {{ k }}
                  </option>
                </select>
                <span class="absolute right-4 top-1/2 z-30 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                  <svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            </div>

            <!-- Customer List -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <div v-if="filteredCustomers.length === 0" class="py-12 text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ searchQuery || selectedKecamatan ? 'Customer tidak ditemukan' : 'Tidak ada customer' }}
                </p>
                <button
                  v-if="!searchQuery && !selectedKecamatan"
                  @click="close(); router.push('/customers/add')"
                  class="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Customer Baru
                </button>
              </div>

              <div v-else class="space-y-2">
                <button
                  v-for="customer in filteredCustomers"
                  :key="customer.id"
                  type="button"
                  @click="selectCustomer(customer)"
                  :class="[
                    'w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                    selectedId === customer.id
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  ]"
                >
                  <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    {{ customer.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ customer.name }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      <span v-if="customer.store_name">{{ customer.store_name }} · </span>
                      <span v-if="customer.kecamatan">{{ customer.kecamatan }}</span>
                      <span v-if="customer.phone"> · {{ customer.phone }}</span>
                    </p>
                  </div>
                  <svg
                    v-if="selectedId === customer.id"
                    class="h-5 w-5 flex-shrink-0 text-brand-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                @click="close"
                class="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { KECAMATAN_BANYUWANGI } from '@/constants/kecamatan'
import type { Customer } from '@/types/database'

interface Props {
  modelValue: boolean
  customers: Customer[]
  selectedId?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:selectedId': [value: string]
  select: [customer: Customer]
}>()

const router = useRouter()
const isOpen = ref(props.modelValue)
const searchQuery = ref('')
const selectedKecamatan = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      searchQuery.value = ''
      selectedKecamatan.value = ''
      nextTick(() => searchInput.value?.focus())
    }
  }
)

// Kecamatan yang benar-benar ada di data customer
const availableKecamatan = computed(() => {
  const set = new Set<string>()
  props.customers.forEach((c) => {
    if (c.kecamatan) set.add(c.kecamatan)
  })
  return Array.from(set).sort()
})

const filteredCustomers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.customers.filter((c) => {
    if (selectedKecamatan.value && c.kecamatan !== selectedKecamatan.value) return false
    if (!query) return true
    return (
      c.name.toLowerCase().includes(query) ||
      (c.store_name || '').toLowerCase().includes(query) ||
      (c.phone || '').includes(query)
    )
  })
})

const selectCustomer = (customer: Customer) => {
  emit('update:selectedId', customer.id)
  emit('select', customer)
  close()
}

const close = () => {
  emit('update:modelValue', false)
}
</script>
