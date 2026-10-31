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
        v-if="modelValue"
        class="fixed inset-0 z-[10100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
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
            v-if="modelValue"
            class="flex max-h-[75vh] w-full flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-w-sm sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex-shrink-0 border-b border-gray-200 p-4 dark:border-white/[0.08]">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ title }}</h3>
                  <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
                </div>
                <button
                  type="button"
                  @click="close"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Pencarian opsional -->
              <div v-if="searchable" class="relative mt-3">
                <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                  </svg>
                </span>
                <input
                  ref="searchInputRef"
                  v-model="searchQuery"
                  type="text"
                  :placeholder="searchPlaceholder"
                  class="w-full rounded-xl border border-gray-300 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>
            </div>

            <!-- Daftar opsi -->
            <div class="overflow-y-auto p-3">
              <div v-if="filteredOptions.length === 0" class="py-10 text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada opsi</p>
              </div>

              <button
                v-for="(opt, index) in filteredOptions"
                :key="String(opt.value ?? index)"
                type="button"
                :disabled="opt.disabled"
                @click="!opt.disabled && select(opt.value)"
                :class="[
                  'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition',
                  opt.disabled
                    ? 'cursor-not-allowed opacity-35'
                    : String(opt.value) === String(modelValue2)
                      ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                ]"
              >
                <span class="min-w-0 flex-1 truncate">{{ opt.label }}</span>
                <svg
                  v-if="String(opt.value) === String(modelValue2)"
                  class="h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

export interface SelectOption {
  label: string
  value: string | number | boolean | null
  disabled?: boolean
  keywords?: string
}

interface Props {
  modelValue: boolean
  /** Nilai terpilih saat ini (untuk menandai opsi aktif) */
  modelValue2?: string | number | boolean | null
  /** Judul header modal, mis. "Pilih Status" */
  title?: string
  /** Subtitle kecil di bawah judul, mis. "3 opsi tersedia" */
  subtitle?: string
  /** Daftar opsi */
  options: SelectOption[]
  /** Tampilkan kolom pencarian */
  searchable?: boolean
  searchPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue2: null,
  title: 'Pilih',
  subtitle: '',
  options: () => [],
  searchable: false,
  searchPlaceholder: 'Cari...',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:modelValue2': [value: string | number | boolean | null]
  select: [option: SelectOption]
}>()

const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

const filteredOptions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const visible = props.options
  if (!q) return visible
  return visible.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      (o.keywords || '').toLowerCase().includes(q)
  )
})

const select = (value: string | number | boolean | null) => {
  const opt = props.options.find((o) => o.value === value)
  emit('update:modelValue2', value)
  if (opt) emit('select', opt)
  close()
}

const close = () => {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      searchQuery.value = ''
      nextTick(() => {
        if (props.searchable && window.innerWidth >= 768) {
          searchInputRef.value?.focus()
        }
      })
    }
  }
)
</script>
