<template>
  <div class="relative">
    <button
      type="button"
      @click="open = true"
      :class="buttonClass"
    >
      <span class="flex min-w-0 items-center gap-2">
        <svg class="h-4 w-4 flex-shrink-0 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="truncate" :class="{ 'text-gray-400 dark:text-gray-500': !display }">{{ display || placeholder }}</span>
      </span>
      <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

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
          v-if="open"
          class="fixed inset-0 z-[10100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          @click.self="cancel"
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
              v-if="open"
              class="w-full rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-w-sm sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
            >
              <!-- Header -->
              <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/[0.08]">
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ title }}</h3>
                  <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ draftLabel }}</p>
                </div>
                <button
                  @click="cancel"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Body -->
              <div class="relative p-4">
                <!-- Month/Year Picker Overlay (Centered) -->
                <div
                  v-if="showMonthYearPicker"
                  class="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-md dark:bg-black/60"
                  @click.self="showMonthYearPicker = false"
                >
                  <div class="w-full max-w-xs rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <!-- Year Navigation -->
                    <div class="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        @click="prevYear"
                        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span class="text-base font-bold text-gray-900 dark:text-white">{{ viewYear }}</span>
                      <button
                        type="button"
                        @click="nextYear"
                        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <!-- Month Grid (3 kolom) -->
                    <div class="grid grid-cols-3 gap-2">
                      <button
                        v-for="(month, index) in monthNames"
                        :key="index"
                        type="button"
                        @click="selectMonth(index)"
                        :class="[
                          'rounded-lg px-3 py-2.5 text-sm font-medium transition',
                          viewMonth === index
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                        ]"
                      >
                        {{ month }}
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Preset cepat -->
                <div class="mb-4 flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    v-for="preset in presets"
                    :key="preset.key"
                    type="button"
                    @click="applyPreset(preset.key)"
                    :class="[
                      'flex-shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                      activePresetKey === preset.key
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]'
                    ]"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <!-- Kalender -->
                <div class="rounded-xl border border-gray-200 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                  <!-- Navigasi bulan -->
                  <div class="mb-2 flex items-center justify-between">
                    <button
                      type="button"
                      @click="prevMonth"
                      class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                      aria-label="Bulan sebelumnya"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      @click="showMonthYearPicker = true"
                      class="rounded-lg px-3 py-1 text-sm font-bold text-gray-900 transition hover:bg-gray-100 dark:text-white dark:hover:bg-white/[0.05]"
                    >
                      {{ monthNames[viewMonth] }} {{ viewYear }}
                    </button>
                    <button
                      type="button"
                      @click="nextMonth"
                      class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                      aria-label="Bulan berikutnya"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <!-- Header hari -->
                  <div class="grid grid-cols-7 gap-1 text-center">
                    <span v-for="d in dayNames" :key="d" class="py-1 text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">
                      {{ d }}
                    </span>
                  </div>

                  <!-- Grid tanggal -->
                  <div class="grid grid-cols-7 gap-1">
                    <button
                      v-for="cell in calendarCells"
                      :key="cell.key"
                      type="button"
                      @click="pickDay(cell.date)"
                      :class="[
                        'flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition',
                        !cell.inMonth
                          ? 'text-gray-300 dark:text-gray-700'
                          : isEdge(cell.date)
                            ? 'bg-brand-600 text-white shadow-sm'
                            : inRange(cell.date)
                              ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                              : isToday(cell.date)
                                ? 'text-brand-600 dark:text-brand-400'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                      ]"
                    >
                      {{ cell.date.getDate() }}
                    </button>
                  </div>
                </div>

                <p class="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-500">
                  {{ draftEnd ? 'Ketuk tanggal lagi untuk memilih ulang' : 'Ketuk tanggal akhir' }}
                </p>
              </div>

              <!-- Footer -->
              <div class="flex gap-3 border-t border-gray-200 p-4 dark:border-white/[0.08]">
                <button
                  type="button"
                  @click="clearAll"
                  class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Kosongkan
                </button>
                <button
                  type="button"
                  @click="confirm"
                  class="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  Simpan
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  /** Tanggal awal, format YYYY-MM-DD ('' = kosong) */
  start?: string
  /** Tanggal akhir, format YYYY-MM-DD ('' = kosong) */
  end?: string
  title?: string
  placeholder?: string
  buttonClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  start: '',
  end: '',
  title: 'Pilih Rentang Tanggal',
  placeholder: 'Semua tanggal',
  buttonClass: '',
})

const emit = defineEmits<{
  'update:start': [value: string]
  'update:end': [value: string]
}>()

const open = ref(false)
const showMonthYearPicker = ref(false)

const now = new Date()
const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const parseYMD = (ymd: string): Date | null => {
  if (!ymd) return null
  const d = new Date(ymd + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

const fmtShort = (ymd: string) => {
  const d = parseYMD(ymd)
  return d ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
}

const display = computed(() => {
  if (props.start && props.end) return `${fmtShort(props.start)} – ${fmtShort(props.end)}`
  if (props.start) return `Mulai ${fmtShort(props.start)}`
  if (props.end) return `Sampai ${fmtShort(props.end)}`
  return ''
})

// Draft = selections sementara di dalam modal; disimpan ke props saat "Simpan"
const draftStart = ref<Date | null>(null)
const draftEnd = ref<Date | null>(null)

const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth())

const draftLabel = computed(() => {
  const s = draftStart.value ? toYMD(draftStart.value) : ''
  const e = draftEnd.value ? toYMD(draftEnd.value) : s
  if (!s) return 'Belum ada tanggal dipilih'
  if (!e || s === e) return fmtShort(s)
  return `${fmtShort(s)} – ${fmtShort(e)}`
})

const sameDate = (a: Date | null, b: Date) =>
  !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const isToday = (d: Date) => sameDate(now, d)

const isEdge = (d: Date) => sameDate(draftStart.value, d) || sameDate(draftEnd.value, d)

const inRange = (d: Date) => {
  if (!draftStart.value || !draftEnd.value) return false
  const t = new Date(d).setHours(0, 0, 0, 0)
  const s = new Date(draftStart.value).setHours(0, 0, 0, 0)
  const e = new Date(draftEnd.value).setHours(0, 0, 0, 0)
  return t > s && t < e
}

const calendarCells = computed(() => {
  const cells: { date: Date; inMonth: boolean; key: string }[] = []
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const start = new Date(firstDay)
  start.setDate(1 - firstDay.getDay())
  for (let i = 0; i < 42; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    cells.push({
      date,
      inMonth: date.getMonth() === viewMonth.value,
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    })
  }
  return cells
})

const prevMonth = () => {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

const prevYear = () => {
  viewYear.value--
}

const nextYear = () => {
  viewYear.value++
}

const selectMonth = (month: number) => {
  viewMonth.value = month
  showMonthYearPicker.value = false
}

const selectYear = (year: number) => {
  viewYear.value = year
}

const goToView = (d: Date) => {
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

const pickDay = (d: Date) => {
  const picked = new Date(d)
  picked.setHours(0, 0, 0, 0)
  if (!draftStart.value || draftEnd.value) {
    // Mulai pemilihan baru
    draftStart.value = picked
    draftEnd.value = null
  } else if (picked < draftStart.value) {
    // Ketuk sebelum awal → jadi akhir, tukar
    draftEnd.value = draftStart.value
    draftStart.value = picked
  } else {
    draftEnd.value = picked
  }
}

// Preset
const presets = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7days', label: '7 Hari' },
  { key: '30days', label: '30 Hari' },
  { key: 'thisMonth', label: 'Bulan Ini' },
]

const presetRange = (key: string): [Date, Date] | null => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const s = new Date(today)
  if (key === 'today') return [today, today]
  if (key === '7days') {
    s.setDate(s.getDate() - 6)
    return [s, today]
  }
  if (key === '30days') {
    s.setDate(s.getDate() - 29)
    return [s, today]
  }
  if (key === 'thisMonth') return [new Date(today.getFullYear(), today.getMonth(), 1), today]
  return null
}

const activePresetKey = computed(() => {
  for (const p of presets) {
    const range = presetRange(p.key)
    if (range && sameDate(draftStart.value, range[0]) && sameDate(draftEnd.value, range[1])) return p.key
  }
  return ''
})

const applyPreset = (key: string) => {
  const range = presetRange(key)
  if (!range) return
  draftStart.value = range[0]
  draftEnd.value = range[1]
  goToView(range[0])
}

const clearAll = () => {
  emit('update:start', '')
  emit('update:end', '')
  open.value = false
}

const confirm = () => {
  emit('update:start', draftStart.value ? toYMD(draftStart.value) : '')
  emit('update:end', draftEnd.value ? toYMD(draftEnd.value) : '')
  open.value = false
}

const cancel = () => {
  open.value = false
}

// Sinkronkan draft + tampilan bulan setiap kali modal dibuka
watch(open, (isOpen) => {
  if (!isOpen) {
    showMonthYearPicker.value = false
    return
  }
  draftStart.value = parseYMD(props.start)
  draftEnd.value = parseYMD(props.end)
  const anchor = draftStart.value || now
  viewYear.value = anchor.getFullYear()
  viewMonth.value = anchor.getMonth()
})
</script>
