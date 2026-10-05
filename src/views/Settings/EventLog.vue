<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Log Event" class="hidden md:block" />

    <MobilePageHeader
      title="Log Event"
      :subtitle="`${entries.length} kejadian tercatat`"
     
    >
      <template #actions>
        <button
          @click="load"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4">
      <!-- Ringkasan per sumber -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div
          v-for="s in summaryCards"
          :key="s.source"
          class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <span class="absolute inset-x-0 top-0 h-0.5" :class="s.barClass"></span>
          <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {{ s.label }}
          </p>
          <p class="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">{{ s.count }}</p>
          <p class="text-[10px] text-gray-400 dark:text-gray-500">error tercatat</p>
        </div>
      </div>

      <!-- Platform info -->
      <div class="rounded-xl bg-gray-50 px-4 py-2.5 text-[11px] text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
        Platform: <strong class="text-gray-700 dark:text-gray-200">{{ isNative ? 'Android (SQLite lokal)' : 'Web (Supabase langsung)' }}</strong>
        <span v-if="sqliteNote" class="mt-0.5 block">{{ sqliteNote }}</span>
      </div>

      <!-- Toolbar filter -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="flex-1">
          <SelectField
            v-model="sourceFilter"
            :options="sourceOptions"
            title="Sumber"
            placeholder="Semua Sumber"
            button-class="flex h-10 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div class="flex-1">
          <SelectField
            v-model="levelFilter"
            :options="levelOptions"
            title="Level"
            placeholder="Semua Level"
            button-class="flex h-10 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <input
          v-model="search"
          type="text"
          placeholder="Cari pesan..."
          class="h-10 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <!-- Aksi -->
      <div class="flex items-center justify-between">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Menampilkan {{ filteredEntries.length }} dari {{ entries.length }}
        </p>
        <div class="flex gap-2">
          <button
            @click="copyAll"
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Salin
          </button>
          <button
            @click="confirmClear"
            class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition active:scale-95 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400"
          >
            Hapus Log
          </button>
        </div>
      </div>

      <!-- Daftar entry -->
      <div v-if="filteredEntries.length > 0" class="space-y-2">
        <div
          v-for="entry in filteredEntries"
          :key="entry.uid"
          class="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]"
          :class="`border-l-4 ${levelBorder(entry.level)}`"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span
                class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
                :class="levelBadge(entry.level)"
              >
                {{ entry.level }}
              </span>
              <span
                class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                :class="sourceBadge(entry.source)"
              >
                {{ entry.source }}
              </span>
              <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500">{{ entry.event }}</span>
            </div>
            <span class="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">{{ formatTime(entry.ts) }}</span>
          </div>

          <p class="mt-1.5 break-words text-sm text-gray-800 dark:text-gray-200">
            {{ entry.message }}
          </p>

          <details v-if="entry.detail" class="mt-1">
            <summary class="cursor-pointer select-none text-[11px] font-medium text-brand-500">detail</summary>
            <pre class="mt-1 max-h-60 overflow-auto rounded-lg bg-gray-50 p-2 text-[10px] leading-relaxed text-gray-600 dark:bg-gray-900/60 dark:text-gray-400">{{ entry.detail }}</pre>
          </details>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center dark:border-gray-700 dark:bg-white/[0.03]"
      >
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ entries.length === 0 ? 'Belum ada event tercatat' : 'Tidak ada yang cocok dengan filter' }}
        </p>
        <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {{ entries.length === 0 ? 'Error aplikasi akan muncul di sini secara otomatis.' : 'Coba ubah filter atau kata kunci.' }}
        </p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import SelectField from '@/components/common/SelectField.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import {
  getLocalEntries,
  clearLocalEntries,
  flushToSQLite,
  type EventLogEntry,
  type EventSource,
} from '@/lib/eventLog'
import { isNativeApp } from '@/lib/platform'

const toast = useToast()
const { confirm } = useConfirm()

const isNative = isNativeApp()
const entries = ref<EventLogEntry[]>([])
const sqliteNote = ref('')

const sourceFilter = ref<string>('')
const levelFilter = ref<string>('')
const search = ref('')

const sourceOptions = [
  { label: 'Semua Sumber', value: '' },
  { label: 'SQLite (lokal)', value: 'sqlite' },
  { label: 'Supabase (server)', value: 'supabase' },
  { label: 'Sinkronisasi', value: 'sync' },
  { label: 'Auth / Login', value: 'auth' },
  { label: 'Jaringan', value: 'network' },
  { label: 'Aplikasi', value: 'app' },
]

const levelOptions = [
  { label: 'Semua Level', value: '' },
  { label: 'Error', value: 'error' },
  { label: 'Peringatan', value: 'warn' },
  { label: 'Info', value: 'info' },
]

const filteredEntries = computed(() => {
  const q = search.value.trim().toLowerCase()
  return entries.value
    .filter((e) => (sourceFilter.value ? e.source === sourceFilter.value : true))
    .filter((e) => (levelFilter.value ? e.level === levelFilter.value : true))
    .filter((e) => (q ? `${e.message} ${e.event} ${e.detail || ''}`.toLowerCase().includes(q) : true))
    .slice()
    .reverse() // terbaru di atas
})

const summaryCards = computed(() => {
  const count = (s: EventSource) => entries.value.filter((e) => e.source === s && e.level === 'error').length
  return [
    { source: 'sqlite', label: 'SQLite', count: count('sqlite'), barClass: 'bg-sky-500' },
    { source: 'supabase', label: 'Supabase', count: count('supabase'), barClass: 'bg-emerald-500' },
    { source: 'sync', label: 'Sync', count: count('sync'), barClass: 'bg-violet-500' },
    { source: 'app', label: 'Lainnya', count: count('auth') + count('network') + count('app'), barClass: 'bg-amber-500' },
  ]
})

function levelBadge(level: string): string {
  if (level === 'error') return 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
  if (level === 'warn') return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
  return 'bg-gray-100 text-gray-500 dark:bg-gray-700/40 dark:text-gray-400'
}

function levelBorder(level: string): string {
  if (level === 'error') return 'border-red-400'
  if (level === 'warn') return 'border-amber-400'
  return 'border-gray-300 dark:border-gray-700'
}

function sourceBadge(source: string): string {
  const map: Record<string, string> = {
    sqlite: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    supabase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    sync: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
    auth: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    network: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    app: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300',
  }
  return map[source] || map.app
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Ambil seluruh log: gabungkan buffer localStorage + tabel SQLite (native).
 * Sumber SQLite dipakai bila tersedia & lebih lengkap (baru saja di-flush).
 */
async function load() {
  entries.value = getLocalEntries()

  if (isNative) {
    try {
      // Paksa flush localStorage → SQLite agar data terbaru ikut terbaca,
      // lalu ambil dari tabel SQLite (paling lengkap).
      await flushToSQLite()
      const { getEventLogFromSqlite } = await import('@/lib/sqlite')
      const rows = await getEventLogFromSqlite(1000)
      if (rows.length >= entries.value.length) {
        entries.value = rows
      }
      sqliteNote.value = `${rows.length} baris tersimpan permanen di SQLite.`
    } catch (e: any) {
      sqliteNote.value = `SQLite belum terbaca: ${e?.message || e}`
    }
  }
}

async function copyAll() {
  const text = filteredEntries.value
    .map((e) => `[${new Date(e.ts).toISOString()}] ${e.level.toUpperCase()}/${e.source} ${e.event}: ${e.message}${e.detail ? `\n   ${e.detail}` : ''}`)
    .join('\n')
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Tersalin', `${filteredEntries.value.length} baris log disalin ke clipboard`)
  } catch {
    toast.error('Gagal menyalin', 'Clipboard tidak tersedia di perangkat ini')
  }
}

async function confirmClear() {
  const ok = await confirm({
    title: 'Hapus Log Event',
    message: 'Semua catatan log akan dihapus permanen. Lanjutkan?',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    variant: 'danger',
  })
  if (ok) clearAll()
}

async function clearAll() {
  clearLocalEntries()
  if (isNative) {
    try {
      const { clearEventLogTable } = await import('@/lib/sqlite')
      await clearEventLogTable()
    } catch {
      // non-critical
    }
  }
  entries.value = []
  toast.success('Log dihapus', 'Semua catatan event log telah dibersihkan')
}

onMounted(load)
</script>
