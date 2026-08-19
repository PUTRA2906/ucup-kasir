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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="isOpen"
            class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Impor Data Produk</h3>
              <button
                @click="close"
                class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-4 p-6">
              <!-- File Picker -->
              <div
                class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/30 dark:border-gray-700 dark:hover:border-brand-500 dark:hover:bg-brand-500/5"
                :class="{ 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/5': isDragging }"
                @click="openFilePicker"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <svg class="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19h6M12 15v-6m0 0l-3 3m3-3l3 3" />
                </svg>
                <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <span class="font-medium text-brand-600 dark:text-brand-400">Klik untuk pilih file</span> atau seret file CSV ke sini
                </p>
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Format: {{ acceptedHint }}
                </p>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".csv,text/csv"
                  class="hidden"
                  @change="handleFileChange"
                />
              </div>

              <!-- File Info -->
              <div v-if="fileName" class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div class="flex items-center gap-3 min-w-0">
                  <svg class="h-5 w-5 flex-shrink-0 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span class="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{{ fileName }}</span>
                </div>
                <button
                  @click="clearFile"
                  class="rounded-lg p-1 text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/15"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Options -->
              <div v-if="fileName" class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Update produk yang sudah ada?</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Cocokkan berdasarkan SKU. Jika cocok, data diperbarui, jika tidak, produk baru dibuat.</p>
                </div>
                <button
                  @click="updateExisting = !updateExisting"
                  :class="[
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                    updateExisting ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
                  ]"
                >
                  <span
                    :class="[
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      updateExisting ? 'translate-x-5' : 'translate-x-0',
                    ]"
                  />
                </button>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                @click="downloadTemplate"
                class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Unduh Template
              </button>
              <div class="flex gap-3">
                <button
                  @click="close"
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  Batal
                </button>
                <button
                  @click="handleImport"
                  :disabled="!fileName || importing"
                  class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  <svg v-if="importing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ importing ? 'Mengimpor...' : 'Impor Sekarang' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  acceptedHint?: string
}

const props = withDefaults(defineProps<Props>(), {
  acceptedHint: '.csv',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  import: [file: File, updateExisting: boolean]
  'download-template': []
}>()

const isOpen = ref(props.modelValue)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const fileName = ref('')
const isDragging = ref(false)
const updateExisting = ref(true)
const importing = ref(false)

watch(
  () => props.modelValue,
  (value) => {
    isOpen.value = value
    if (value) {
      // reset state tiap kali dibuka
      selectedFile.value = null
      fileName.value = ''
      updateExisting.value = true
      importing.value = false
    }
  },
)

const close = () => {
  if (importing.value) return
  emit('update:modelValue', false)
}

const clearFile = () => {
  selectedFile.value = null
  fileName.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const openFilePicker = () => {
  fileInput.value?.click()
}

const handleFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) setFile(file)
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) setFile(file)
}

const setFile = (file: File) => {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    // Nonaktifkan validasi ketat: biarkan backend/parser menanganinya
  }
  selectedFile.value = file
  fileName.value = file.name
}

const handleImport = () => {
  if (!selectedFile.value) return
  importing.value = true
  emit('import', selectedFile.value, updateExisting.value)
}

const downloadTemplate = () => {
  emit('download-template')
}

// Biarkan parent mengontrol penutupan saat import selesai/gagal
defineExpose({
  setImporting: (value: boolean) => {
    importing.value = value
  },
})
</script>
