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
            v-if="modelValue"
            class="w-full rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-w-sm sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/[0.08]">
              <div>
                <h3 class="text-sm font-bold text-gray-900 dark:text-white">Tanggal Transaksi</h3>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ selectedLabel }}
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

            <!-- Body -->
            <div class="max-h-[80vh] overflow-y-auto p-4" v-click-outside="closePickers">
              <!-- Preset cepat -->
              <div class="mb-4 flex gap-2">
                <button
                  type="button"
                  @click="setDatePreset('today')"
                  class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  :class="isSameDay(selected, now) ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : ''"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  @click="setDatePreset('yesterday')"
                  class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Kemarin
                </button>
              </div>

              <!-- Kalender -->
              <div class="mb-4 rounded-xl border border-gray-200 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                <!-- Navigasi bulan & tahun -->
                <div class="mb-2 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    @click="prevMonth"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                    aria-label="Bulan sebelumnya"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div class="flex min-w-0 items-center justify-center gap-1.5">
                    <!-- Dropdown custom bulan -->
                    <div class="relative" ref="monthPickerRef">
                      <button
                        type="button"
                        @click="toggleMonthPicker"
                        class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-2 text-sm font-bold text-gray-900 transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        {{ monthNames[viewMonth] }}
                        <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        v-if="showMonthPicker"
                        class="absolute left-0 top-full z-10 mt-1 w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div class="grid grid-cols-2 gap-1">
                          <button
                            v-for="(m, i) in monthNames"
                            :key="m"
                            type="button"
                            @click="selectMonth(i)"
                            :class="[
                              'rounded-lg px-2 py-1.5 text-xs font-medium transition',
                              i === viewMonth
                                ? 'bg-brand-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                            ]"
                          >
                            {{ m }}
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Dropdown custom tahun -->
                    <div class="relative" ref="yearPickerRef">
                      <button
                        type="button"
                        @click="toggleYearPicker"
                        class="flex items-center gap-1 rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-2 text-sm font-bold text-gray-900 transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        {{ viewYear }}
                        <svg class="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div
                        v-if="showYearPicker"
                        class="absolute left-0 top-full z-10 mt-1 max-h-48 w-24 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                      >
                        <button
                          v-for="y in yearOptions"
                          :key="y"
                          type="button"
                          @click="selectYear(y)"
                          :class="[
                            'block w-full rounded-lg px-2 py-1.5 text-xs font-medium transition',
                            y === viewYear
                              ? 'bg-brand-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                          ]"
                        >
                          {{ y }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="nextMonth"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
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
                    :disabled="!cell.inMonth"
                    @click="selectDay(cell.date)"
                    :class="[
                      'flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition',
                      cell.inMonth
                        ? isSameDay(cell.date, selected)
                          ? 'bg-brand-600 text-white shadow-sm'
                          : isSameDay(cell.date, now)
                            ? 'text-brand-600 dark:text-brand-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                        : 'text-gray-300 dark:text-gray-700'
                    ]"
                  >
                    {{ cell.date.getDate() }}
                  </button>
                </div>
              </div>

              <!-- Jam & Menit -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Jam
                  </label>
                  <div class="relative">
                    <button
                      type="button"
                      @click="toggleHourPicker"
                      class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <span>{{ String(selectedHour).padStart(2, '0') }}</span>
                      <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      v-if="showHourPicker"
                      class="absolute bottom-full left-0 z-10 mb-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                    >
                      <button
                        v-for="h in 24"
                        :key="h - 1"
                        type="button"
                        @click="selectHour(h - 1)"
                        :class="[
                          'block w-full rounded-lg px-3 py-1.5 text-xs font-medium transition',
                          h - 1 === selectedHour
                            ? 'bg-brand-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                        ]"
                      >
                        {{ String(h - 1).padStart(2, '0') }}
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Menit
                  </label>
                  <div class="relative">
                    <button
                      type="button"
                      @click="toggleMinutePicker"
                      class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition hover:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <span>{{ String(selectedMinute).padStart(2, '0') }}</span>
                      <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      v-if="showMinutePicker"
                      class="absolute bottom-full left-0 z-10 mb-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                    >
                      <button
                        v-for="m in [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]"
                        :key="m"
                        type="button"
                        @click="selectMinute(m)"
                        :class="[
                          'block w-full rounded-lg px-3 py-1.5 text-xs font-medium transition',
                          m === selectedMinute
                            ? 'bg-brand-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                        ]"
                      >
                        {{ String(m).padStart(2, '0') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 border-t border-gray-200 p-4 dark:border-white/[0.08]">
              <button
                type="button"
                @click="close"
                class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Batal
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  modelValue: boolean
  /** Nilai awal dalam format datetime-local: YYYY-MM-DDTHH:mm */
  value?: string
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:value': [value: string]
}>()

const now = new Date()

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Parse value -> Date (fallback ke sekarang)
const parseValue = (value: string): Date => {
  if (!value) return new Date()
  const d = new Date(value)
  return isNaN(d.getTime()) ? new Date() : d
}

const selected = ref<Date>(parseValue(props.value))
const viewYear = ref(selected.value.getFullYear())
const viewMonth = ref(selected.value.getMonth())

const selectedHour = ref(selected.value.getHours())
const selectedMinute = ref(selected.value.getMinutes())

// Dropdown custom bulan, tahun, jam & menit
const showMonthPicker = ref(false)
const showYearPicker = ref(false)
const showHourPicker = ref(false)
const showMinutePicker = ref(false)
const monthPickerRef = ref<HTMLElement | null>(null)
const yearPickerRef = ref<HTMLElement | null>(null)

const closePickers = () => {
  showMonthPicker.value = false
  showYearPicker.value = false
  showHourPicker.value = false
  showMinutePicker.value = false
}

const toggleMonthPicker = () => {
  showYearPicker.value = false
  showHourPicker.value = false
  showMinutePicker.value = false
  showMonthPicker.value = !showMonthPicker.value
}

const toggleYearPicker = () => {
  showMonthPicker.value = false
  showHourPicker.value = false
  showMinutePicker.value = false
  showYearPicker.value = !showYearPicker.value
}

const toggleHourPicker = () => {
  showMonthPicker.value = false
  showYearPicker.value = false
  showMinutePicker.value = false
  showHourPicker.value = !showHourPicker.value
}

const toggleMinutePicker = () => {
  showMonthPicker.value = false
  showYearPicker.value = false
  showHourPicker.value = false
  showMinutePicker.value = !showMinutePicker.value
}

const selectHour = (h: number) => {
  selectedHour.value = h
  showHourPicker.value = false
}

const selectMinute = (m: number) => {
  selectedMinute.value = m
  showMinutePicker.value = false
}

const selectMonth = (i: number) => {
  viewMonth.value = i
  showMonthPicker.value = false
  // Pertahankan hari yang dipilih (jepit ke panjang bulan)
  const d = new Date(selected.value)
  const maxDay = new Date(viewYear.value, i + 1, 0).getDate()
  d.setFullYear(viewYear.value, i, Math.min(d.getDate(), maxDay))
  selected.value = d
}

const selectYear = (y: number) => {
  viewYear.value = y
  showYearPicker.value = false
  // Pertahankan tanggal & bulan (jepit ke panjang bulan, mis. 29 Feb)
  const d = new Date(selected.value)
  const maxDay = new Date(y, viewMonth.value + 1, 0).getDate()
  d.setFullYear(y, viewMonth.value, Math.min(d.getDate(), maxDay))
  selected.value = d
}

const selectedLabel = computed(() => {
  return selected.value.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const yearOptions = computed(() => {
  const current = now.getFullYear()
  const years: number[] = []
  for (let y = current - 5; y <= current + 1; y++) {
    years.push(y)
  }
  return years
})

const calendarCells = computed(() => {
  const cells: { date: Date; inMonth: boolean; key: string }[] = []
  const firstDay = new Date(viewYear.value, viewMonth.value, 1)
  const start = new Date(firstDay)
  start.setDate(1 - firstDay.getDay()) // mundur ke hari Minggu (index 0)
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

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

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

const selectDay = (date: Date) => {
  const next = new Date(date)
  next.setHours(selectedHour.value, selectedMinute.value, 0, 0)
  selected.value = next
}

const setDatePreset = (preset: 'today' | 'yesterday') => {
  const d = new Date()
  if (preset === 'yesterday') {
    d.setDate(d.getDate() - 1)
  }
  d.setHours(selectedHour.value, selectedMinute.value, 0, 0)
  selected.value = d
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

const formatDateTimeLocal = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const confirm = () => {
  selected.value.setHours(selectedHour.value, selectedMinute.value, 0, 0)
  emit('update:value', formatDateTimeLocal(selected.value))
  close()
}

const close = () => {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // Sinkronkan state dengan nilai terbaru setiap kali dibuka
      selected.value = parseValue(props.value)
      viewYear.value = selected.value.getFullYear()
      viewMonth.value = selected.value.getMonth()
      selectedHour.value = selected.value.getHours()
      selectedMinute.value = selected.value.getMinutes()
      closePickers()
    }
  }
)
</script>

<script lang="ts">
import vClickOutside from './v-click-outside.vue'

export default {
  directives: {
    clickOutside: vClickOutside,
  },
}
</script>
