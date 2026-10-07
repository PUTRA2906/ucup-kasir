<template>
  <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <h3 class="text-sm font-semibold text-yellow-900 mb-2">Database Migration Fix</h3>
    <p class="text-xs text-yellow-800 mb-3">
      Jika muncul error "table transaction_payments has no column named payment_date", klik tombol di bawah untuk memperbaiki.
    </p>

    <div class="flex gap-2">
      <button
        @click="runFix"
        :disabled="loading"
        class="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Memperbaiki...' : 'Fix payment_date Migration' }}
      </button>

      <button
        @click="runReset"
        :disabled="loading"
        class="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Mereset...' : 'Reset Database (DANGER)' }}
      </button>
    </div>

    <div v-if="result" class="mt-3 p-2 text-xs rounded" :class="result.success ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'">
      <p class="font-semibold">{{ result.message }}</p>
      <pre v-if="result.details" class="mt-1 text-xs overflow-auto">{{ JSON.stringify(result.details, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { fixPaymentDateMigration, resetSQLiteDatabase } from '@/utils/fixPaymentDateMigration'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const loading = ref(false)
const result = ref<{ success: boolean; message: string; details?: any } | null>(null)

async function runFix() {
  loading.value = true
  result.value = null

  try {
    const res = await fixPaymentDateMigration()
    result.value = res

    if (res.success) {
      toast.success('Berhasil', 'Migration berhasil diperbaiki')
    } else {
      toast.error('Gagal', 'Migration gagal: ' + res.message)
    }
  } catch (error: any) {
    result.value = {
      success: false,
      message: error.message
    }
    toast.error('Error', error.message)
  } finally {
    loading.value = false
  }
}

async function runReset() {
  if (!confirm('PERINGATAN: Ini akan menghapus SEMUA data lokal SQLite! Lanjutkan?')) {
    return
  }

  loading.value = true
  result.value = null

  try {
    const res = await resetSQLiteDatabase()
    result.value = res

    if (res.success) {
      toast.success('Berhasil', 'Database direset. Lakukan sync ulang!')
    } else {
      toast.error('Gagal', 'Reset gagal: ' + res.message)
    }
  } catch (error: any) {
    result.value = {
      success: false,
      message: error.message
    }
    toast.error('Error', error.message)
  } finally {
    loading.value = false
  }
}
</script>
