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
        <span class="truncate">{{ display }}</span>
      </span>
      <svg v-if="!hideChevron" class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <DatePickerModal
      v-model="open"
      :value="internalValue"
      :title="title"
      :show-time="showTime"
      @update:value="onPick"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DatePickerModal from './DatePickerModal.vue'

interface Props {
  /** Nilai dalam format YYYY-MM-DD (showTime=false) atau YYYY-MM-DDTHH:mm (showTime=true) */
  modelValue?: string
  /** Judul header modal */
  title?: string
  /** Tampilkan jam & menit (default false — tanggal saja) */
  showTime?: boolean
  /** Placeholder saat kosong */
  placeholder?: string
  /** Kelas tambahan untuk tombol (mis. padding/width sesuai konteks) */
  buttonClass?: string
  /** Sembunyikan icon chevron/arrow (default false) */
  hideChevron?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  title: 'Pilih Tanggal',
  showTime: false,
  placeholder: 'Pilih tanggal',
  buttonClass: '',
  hideChevron: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

// Nilai internal selalu lengkap (datetime) agar DatePickerModal bisa parse;
// untuk mode tanggal saja, jam diambil dari hari ini agar wajar.
const internalValue = computed(() => {
  if (!props.modelValue) return ''
  if (props.showTime) return props.modelValue
  if (props.modelValue.includes('T')) return props.modelValue
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${props.modelValue}T${pad(now.getHours())}:${pad(now.getMinutes())}`
})

const display = computed(() => {
  if (!props.modelValue) return props.placeholder
  const d = new Date(props.modelValue)
  if (isNaN(d.getTime())) return props.placeholder
  if (props.showTime) {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

const onPick = (value: string) => {
  // Mode tanggal saja: kirim hanya YYYY-MM-DD agar kompatibel dengan input type="date" lama
  emit('update:modelValue', props.showTime ? value : value.split('T')[0])
}
</script>
