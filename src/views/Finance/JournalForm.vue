<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buat Jurnal" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Buat Jurnal" subtitle="Pencatatan Debit &amp; Kredit" @back="router.back()" />

    <div class="mx-auto max-w-2xl space-y-4 pb-6">
      <!-- Loading akun -->
      <div v-if="store.loading" class="flex items-center justify-center py-16">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>

      <!-- Empty akun -->
      <div v-else-if="store.accounts.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Akun belum tersedia</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Seed akun default dulu untuk mulai membuat jurnal.</p>
        <button
          @click="handleSeed"
          class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Seed Akun Default
        </button>
      </div>

      <!-- Form -->
      <template v-else>
        <!-- Info Header -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal *</label>
              <input
                v-model="form.entry_date"
                type="date"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Keterangan *</label>
              <input
                v-model="form.description"
                type="text"
                placeholder="contoh: Pembayaran sewa bulanan"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Lines -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Baris Jurnal</h3>
            <button
              @click="addLine"
              class="flex items-center gap-1 rounded-lg border border-blue-500 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Baris
            </button>
          </div>

          <div class="space-y-2.5">
            <div
              v-for="(line, index) in form.lines"
              :key="index"
              class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Baris {{ index + 1 }}</span>
                <button
                  v-if="form.lines.length > 1"
                  @click="removeLine(index)"
                  class="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <select
                v-model="line.account_id"
                class="mb-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="" disabled>Pilih akun...</option>
                <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">
                  {{ acc.code }} — {{ acc.name }}
                </option>
              </select>

              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Debit</label>
                  <input
                    v-model.number="line.debit"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Kredit</label>
                  <input
                    v-model.number="line.credit"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
            <div class="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
              <p class="text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Debit</p>
              <p class="text-sm font-black text-emerald-700 dark:text-emerald-400">{{ formatCurrency(totalDebit) }}</p>
            </div>
            <div class="rounded-xl bg-red-50 p-2.5 dark:bg-red-500/10">
              <p class="text-[9px] font-bold uppercase text-red-600 dark:text-red-400">Total Kredit</p>
              <p class="text-sm font-black text-red-700 dark:text-red-400">{{ formatCurrency(totalCredit) }}</p>
            </div>
          </div>

          <div
            v-if="totalDebit !== totalCredit && totalDebit > 0"
            class="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10"
          >
            <p class="text-xs text-amber-700 dark:text-amber-400">
              Total debit harus sama dengan total kredit (selisih {{ formatCurrency(Math.abs(totalDebit - totalCredit)) }})
            </p>
          </div>

          <div v-if="formError" class="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
            <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            @click="router.back()"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            @click="handleSubmit"
            :disabled="saving"
            class="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan Jurnal' }}
          </button>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'

const router = useRouter()
const store = useFinanceStore()

const saving = ref(false)
const formError = ref<string | null>(null)

interface Line {
  account_id: string
  debit: number
  credit: number
}

const form = ref<{ entry_date: string; description: string; lines: Line[] }>({
  entry_date: new Date().toISOString().split('T')[0],
  description: '',
  lines: [{ account_id: '', debit: 0, credit: 0 }],
})

const totalDebit = computed(() => form.value.lines.reduce((s, l) => s + (l.debit || 0), 0))
const totalCredit = computed(() => form.value.lines.reduce((s, l) => s + (l.credit || 0), 0))

const addLine = () => {
  form.value.lines.push({ account_id: '', debit: 0, credit: 0 })
}

const removeLine = (index: number) => {
  form.value.lines.splice(index, 1)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const handleSeed = async () => {
  try {
    await store.seedAccounts()
  } catch (e: any) {
    formError.value = e.message
  }
}

const handleSubmit = async () => {
  formError.value = null

  if (!form.value.description.trim()) {
    formError.value = 'Keterangan jurnal wajib diisi'
    return
  }
  if (!form.value.entry_date) {
    formError.value = 'Tanggal wajib diisi'
    return
  }

  const lines = form.value.lines.filter((l) => l.account_id)
  if (lines.length === 0) {
    formError.value = 'Minimal satu baris jurnal dengan akun dipilih'
    return
  }
  if (lines.some((l) => !l.debit && !l.credit)) {
    formError.value = 'Setiap baris harus punya nilai debit atau kredit'
    return
  }
  if (totalDebit.value <= 0 && totalCredit.value <= 0) {
    formError.value = 'Jurnal harus memiliki nilai debit atau kredit'
    return
  }
  if (totalDebit.value !== totalCredit.value) {
    formError.value = `Total debit harus sama dengan total kredit (selisih ${formatCurrency(Math.abs(totalDebit.value - totalCredit.value))})`
    return
  }

  saving.value = true
  try {
    const entryDate = new Date(form.value.entry_date + 'T00:00:00').toISOString()
    const id = await store.createJournal({
      entry_date: entryDate,
      description: form.value.description.trim(),
      lines: lines.map((l) => ({ account_id: l.account_id, debit: l.debit || 0, credit: l.credit || 0 })),
    })
    await store.fetchJournals()
    router.push(`/finance/journal/${id}`)
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (store.accounts.length === 0) {
    try {
      await store.fetchAccounts()
      if (store.accounts.length === 0) {
        await store.seedAccounts()
      }
    } catch (e: any) {
      formError.value = e.message
    }
  }
})
</script>
