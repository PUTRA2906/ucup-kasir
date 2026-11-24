<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Catat Jurnal Umum" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader
      title="Catat Jurnal Umum"
      subtitle="Pencatatan Debit &amp; Kredit"
      @back="router.back()"
    />

    <div class="mx-auto max-w-2xl space-y-4 pb-6">
      <!-- Loading akun -->
      <div v-if="store.loading" class="flex items-center justify-center py-16">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>

      <!-- Empty akun -->
      <div v-else-if="store.accounts.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Akun belum tersedia</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Seed akun default dulu untuk mulai membuat jurnal.</p>
        <button
          @click="handleSeed"
          class="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Seed Akun Default
        </button>
      </div>

      <template v-else>
        <!-- ============================================================
             Kartu 1: Informasi jurnal
             ============================================================ -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <!-- Judul + badge tahap -->
          <div class="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
            <div class="min-w-0">
              <h2 class="hidden text-base font-extrabold leading-tight text-gray-900 md:block dark:text-white">
                Catat Jurnal Umum
              </h2>
              <p class="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                Mendukung entri majemuk (multi-baris Debit/Kredit)
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              Tahap 1
            </span>
          </div>

          <div class="mt-3 space-y-3">
            <!-- Tanggal + No. Jurnal (otomatis) -->
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Transaksi <span class="text-red-500">*</span>
                </label>
                <DateField
                  v-model="form.entry_date"
                  title="Tanggal Jurnal"
                  button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  No. Jurnal
                </label>
                <div class="flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                  <span class="text-sm font-mono text-gray-500 dark:text-gray-400">Otomatis</span>
                  <span class="text-[9px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">JRN-YYYYMMDD</span>
                </div>
              </div>
            </div>

            <!-- Keterangan -->
            <div>
              <label class="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                Keterangan / Uraian Transaksi <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.description"
                type="text"
                placeholder="contoh: Pembayaran sewa kios bulan November"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        <!-- ============================================================
             Kartu 2: Baris akun (debit & kredit)
             ============================================================ -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">Baris Akun (Debit &amp; Kredit)</h3>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Pilih akun, posisi, lalu isi nominal.</p>
            </div>
            <button
              @click="addLine"
              class="flex shrink-0 items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 transition hover:bg-indigo-100 active:scale-95 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tambah Baris
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(line, index) in form.lines"
              :key="index"
              class="flex items-center gap-1.5"
            >
              <!-- Akun -->
              <div class="min-w-0 flex-1">
                <SelectField
                  v-model="line.account_id"
                  :options="accountOptions"
                  title="Pilih Akun"
                  placeholder="Pilih akun..."
                  searchable
                  search-placeholder="Cari akun..."
                  button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <!-- Posisi Debit / Kredit -->
              <div class="w-[74px] shrink-0">
                <SelectField
                  v-model="line.mode"
                  :options="modeOptions"
                  title="Posisi"
                  :button-class="[
                    'flex w-full items-center justify-between rounded-xl border px-2 py-2 text-xs font-bold',
                    line.mode === 'debit'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
                  ].join(' ')"
                />
              </div>

              <!-- Nominal -->
              <div class="w-[100px] shrink-0">
                <CurrencyInput
                  v-model="line.amount"
                  placeholder="0"
                  class="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-right text-xs font-semibold tabular-nums text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                />
              </div>

              <!-- Hapus baris -->
              <button
                @click="removeLine(index)"
                :disabled="form.lines.length === 1"
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:border-gray-700 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                title="Hapus baris"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- ============================================================
               Ringkasan: total debit, total kredit, status keseimbangan
               ============================================================ -->
          <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/60">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Debit</p>
                <p class="mt-0.5 text-sm font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {{ formatCurrency(totalDebit) }}
                </p>
              </div>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Kredit</p>
                <p class="mt-0.5 text-sm font-black tabular-nums text-red-600 dark:text-red-400">
                  {{ formatCurrency(totalCredit) }}
                </p>
              </div>
              <div class="col-span-2 border-t border-gray-200 pt-2 sm:col-span-1 sm:border-0 sm:pt-0 dark:border-gray-700">
                <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status Keseimbangan</p>
                <p class="mt-0.5 flex items-center gap-1.5 text-xs font-bold" :class="balanceStatus.textClass">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="balanceStatus.dotClass"></span>
                  {{ balanceStatus.label }}
                </p>
              </div>
            </div>

            <p
              v-if="selisih > 0"
              class="mt-2 border-t border-gray-200 pt-2 text-[11px] font-medium text-amber-700 dark:border-gray-700 dark:text-amber-400"
            >
              Selisih debit-kredit: {{ formatCurrency(selisih) }}
            </p>
          </div>

          <div v-if="formError" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
            <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>
        </div>

        <!-- ============================================================
             Aksi
             ============================================================ -->
        <div class="space-y-2">
          <button
            @click="handleSubmit"
            :disabled="saving"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg v-if="!saving" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            {{ saving ? 'Menyimpan...' : 'Posting ke Jurnal & Buku Besar' }}
          </button>
          <button
            @click="router.back()"
            :disabled="saving"
            class="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Batal
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
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import DateField from '@/components/common/DateField.vue'
import SelectField from '@/components/common/SelectField.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'
import { useToast } from '@/composables/useToast'
import { localTodayStr } from '@/utils/date'

const router = useRouter()
const store = useFinanceStore()
const toast = useToast()

const saving = ref(false)
const formError = ref<string | null>(null)

type LineMode = 'debit' | 'kredit'

interface Line {
  account_id: string
  mode: LineMode
  amount: number | null
}

const form = ref<{ entry_date: string; description: string; lines: Line[] }>({
  // Tanggal lokal — jangan toISOString() (UTC = kemarin sebelum jam 07:00 WIB)
  entry_date: localTodayStr(),
  description: '',
  lines: [{ account_id: '', mode: 'debit', amount: null }],
})

const modeOptions = [
  { label: 'Debit', value: 'debit' },
  { label: 'Kredit', value: 'kredit' },
]

const accountOptions = computed(() =>
  store.accounts.map((acc) => ({ label: `${acc.code} — ${acc.name}`, value: acc.id }))
)

const totalDebit = computed(() =>
  form.value.lines.reduce((sum, l) => sum + (l.mode === 'debit' ? l.amount || 0 : 0), 0)
)
const totalCredit = computed(() =>
  form.value.lines.reduce((sum, l) => sum + (l.mode === 'kredit' ? l.amount || 0 : 0), 0)
)
const selisih = computed(() => Math.abs(totalDebit.value - totalCredit.value))

const balanceStatus = computed(() => {
  if (totalDebit.value === 0 && totalCredit.value === 0) {
    return {
      label: 'Belum Terisi',
      textClass: 'text-gray-500 dark:text-gray-400',
      dotClass: 'bg-gray-400',
    }
  }
  if (selisih.value === 0) {
    return {
      label: 'Seimbang',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500',
    }
  }
  return {
    label: 'Tidak Seimbang',
    textClass: 'text-red-600 dark:text-red-400',
    dotClass: 'bg-red-500',
  }
})

const addLine = () => {
  form.value.lines.push({ account_id: '', mode: 'debit', amount: null })
}

const removeLine = (index: number) => {
  if (form.value.lines.length === 1) return
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
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Gagal membuat akun default'
  }
}

const handleSubmit = async () => {
  formError.value = null

  if (!form.value.entry_date) {
    formError.value = 'Tanggal transaksi wajib diisi'
    return
  }
  if (isNaN(new Date(form.value.entry_date + 'T00:00:00').getTime())) {
    formError.value = 'Tanggal tidak valid'
    return
  }
  if (!form.value.description.trim()) {
    formError.value = 'Keterangan / uraian transaksi wajib diisi'
    return
  }

  const filled = form.value.lines.filter((l) => l.account_id)
  if (filled.length === 0) {
    formError.value = 'Minimal satu baris jurnal dengan akun dipilih'
    return
  }
  if (filled.some((l) => !l.amount || l.amount <= 0)) {
    formError.value = 'Setiap baris harus memiliki nominal lebih dari 0'
    return
  }
  if (totalDebit.value <= 0 || totalCredit.value <= 0) {
    formError.value = 'Jurnal harus memiliki minimal satu sisi debit dan satu sisi kredit'
    return
  }
  if (selisih.value !== 0) {
    formError.value = `Total debit harus sama dengan total kredit (selisih ${formatCurrency(selisih.value)})`
    return
  }

  // Periode yang sudah ditutup tidak boleh menerima jurnal baru
  try {
    const closed = await store.checkPeriodClosed(form.value.entry_date)
    if (closed) {
      formError.value = `Periode tanggal ${form.value.entry_date} sudah ditutup. Buka kembali periode tersebut di menu Tutup Buku jika perlu mencatat jurnal.`
      toast.error('Periode Tertutup', 'Tanggal jurnal berada di periode yang sudah ditutup.')
      return
    }
  } catch {
    // Pengecekan gagal (mis. offline) — biarkan server yang menolak bila perlu.
  }

  saving.value = true
  try {
    // Kirim tanggal saja (DATE string YYYY-MM-DD) tanpa konversi timezone
    await store.createJournal({
      entry_date: form.value.entry_date,
      description: form.value.description.trim(),
      lines: filled.map((l) => ({
        account_id: l.account_id,
        debit: l.mode === 'debit' ? l.amount || 0 : 0,
        credit: l.mode === 'kredit' ? l.amount || 0 : 0,
      })),
    })
    // Jurnal sudah tersimpan — refresh daftar boleh gagal tanpa mengorbankan navigasi
    await store.fetchJournals().catch(() => {})
    toast.success('Berhasil!', 'Jurnal berhasil diposting')
    router.replace('/finance/journal')
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Gagal menyimpan jurnal'
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
    } catch (e) {
      formError.value = e instanceof Error ? e.message : 'Gagal memuat akun'
    }
  }
})
</script>
