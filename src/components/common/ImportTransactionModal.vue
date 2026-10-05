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
            v-if="modelValue"
            class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Import Transaksi</h3>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Upload CSV untuk import transaksi beserta auto-jurnal</p>
              </div>
              <button
                @click="close"
                :disabled="importing"
                class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-4 p-6">
              <!-- Info format CSV -->
              <div class="rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-800 dark:bg-blue-500/10">
                <p class="mb-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">Format CSV yang diterima:</p>
                <p class="text-[11px] leading-relaxed text-blue-600 dark:text-blue-300">
                  <strong>Kolom wajib:</strong> Tanggal, Nama Produk, Qty, Harga Satuan<br>
                  <strong>Kolom opsional:</strong> No. Transaksi, Nama Customer, Metode Bayar, Jumlah Bayar, Diskon, Ongkir, Catatan<br>
                  <span class="mt-1 block text-[10px] text-blue-500 dark:text-blue-400">
                    ⚠ Produk dicocokkan berdasarkan Nama Produk. Satu transaksi = satu baris per item (gabung dengan No. Transaksi atau Tanggal+Customer yang sama).
                  </span>
                </p>
              </div>

              <!-- File Picker -->
              <div
                class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 px-6 py-8 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/30 dark:border-gray-700 dark:hover:border-brand-500 dark:hover:bg-brand-500/5"
                :class="{ 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/5': isDragging }"
                @click="openFilePicker"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
              >
                <svg class="h-9 w-9 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19h6M12 15v-6m0 0l-3 3m3-3l3 3" />
                </svg>
                <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  <span class="font-medium text-brand-600 dark:text-brand-400">Klik untuk pilih file</span> atau seret file CSV ke sini
                </p>
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">.csv — format transaksi</p>
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
                  :disabled="importing"
                  class="rounded-lg p-1 text-gray-400 hover:text-error-600 hover:bg-error-50 disabled:opacity-50 dark:hover:bg-error-500/15"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Progress / result -->
              <div v-if="result" class="rounded-xl border px-4 py-3 text-sm"
                :class="result.errors.length > 0
                  ? 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-500/10'
                  : 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-500/10'"
              >
                <p class="font-semibold" :class="result.errors.length > 0 ? 'text-warning-700 dark:text-warning-400' : 'text-success-700 dark:text-success-400'">
                  {{ result.errors.length > 0 ? 'Selesai dengan catatan' : 'Import berhasil!' }}
                </p>
                <p class="mt-1 text-xs" :class="result.errors.length > 0 ? 'text-warning-600 dark:text-warning-300' : 'text-success-600 dark:text-success-300'">
                  {{ result.created }} transaksi dibuat · {{ result.skipped }} dilewati
                </p>
                <ul v-if="result.errors.length > 0" class="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
                  <li v-for="(err, i) in result.errors" :key="i" class="text-[11px] text-warning-600 dark:text-warning-400">
                    • {{ err }}
                  </li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                @click="$emit('download-template')"
                :disabled="importing"
                class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Unduh Template
              </button>
              <div class="flex gap-3">
                <button
                  @click="close"
                  :disabled="importing"
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  {{ result ? 'Tutup' : 'Batal' }}
                </button>
                <button
                  v-if="!result"
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

export interface ImportTransactionResult {
  created: number
  skipped: number
  errors: string[]
}

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  import: [file: File]
  'download-template': []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const fileName = ref('')
const isDragging = ref(false)
const importing = ref(false)
const result = ref<ImportTransactionResult | null>(null)

// Reset state setiap kali modal dibuka
const resetState = () => {
  selectedFile.value = null
  fileName.value = ''
  isDragging.value = false
  importing.value = false
  result.value = null
}

watch(
  () => importing.value,
  (v) => {
    if (!v) return
  }
)

const close = () => {
  if (importing.value) return
  emit('update:modelValue', false)
  resetState()
}

const clearFile = () => {
  selectedFile.value = null
  fileName.value = ''
  result.value = null
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
  selectedFile.value = file
  fileName.value = file.name
  result.value = null
}

const handleImport = () => {
  if (!selectedFile.value) return
  importing.value = true
  emit('import', selectedFile.value)
}

/** Dipanggil parent setelah proses selesai. */
defineExpose({
  setResult(r: ImportTransactionResult) {
    importing.value = false
    result.value = r
  },
  setImporting(v: boolean) {
    importing.value = v
  },
})
</script>
