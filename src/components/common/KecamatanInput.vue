<template>
  <div class="relative">
    <input
      ref="inputRef"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      @focus="openDropdown"
      @keydown="handleKeydown"
      @blur="handleBlur"
      :class="[
        'h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30',
        error
          ? 'border-error-500 focus:border-error-500 focus:ring-error-500/10 dark:border-error-500'
          : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800'
      ]"
    />

    <!-- Dropdown Suggestions -->
    <ul
      v-if="showDropdown && filteredOptions.length > 0"
      class="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <li
        v-for="(option, index) in filteredOptions"
        :key="option"
        @mousedown.prevent="selectOption(option)"
        @mouseenter="activeIndex = index"
        :class="[
          'cursor-pointer px-4 py-2 text-sm',
          activeIndex === index
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
            : 'text-gray-800 dark:text-white/90'
        ]"
      >
        {{ option }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { KECAMATAN_BANYUWANGI } from '@/constants/kecamatan'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  error?: boolean
}>(), {
  placeholder: 'Ketik untuk mencari kecamatan...',
  error: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const showDropdown = ref(false)
const activeIndex = ref(-1)

const filteredOptions = computed(() => {
  const query = props.modelValue.trim().toLowerCase()
  if (!query) return KECAMATAN_BANYUWANGI
  return KECAMATAN_BANYUWANGI.filter((kec) => kec.toLowerCase().includes(query))
})

const handleInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  showDropdown.value = true
  activeIndex.value = -1
}

const openDropdown = () => {
  showDropdown.value = true
}

const handleBlur = () => {
  // Delay agar klik pada item dropdown sempat ter-registrasi (mousedown.prevent)
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!showDropdown.value || filteredOptions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % filteredOptions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length
  } else if (event.key === 'Enter') {
    if (activeIndex.value >= 0) {
      event.preventDefault()
      selectOption(filteredOptions.value[activeIndex.value])
    }
  } else if (event.key === 'Escape') {
    showDropdown.value = false
  }
}

const selectOption = (option: string) => {
  emit('update:modelValue', option)
  showDropdown.value = false
  activeIndex.value = -1
}
</script>
