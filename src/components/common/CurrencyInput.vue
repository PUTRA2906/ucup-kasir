<template>
  <input
    type="text"
    inputmode="numeric"
    :value="formatted"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    @input="handleInput"
    @blur="handleBlur"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
  }>(),
  {
    modelValue: 0,
    placeholder: '0',
    disabled: false,
    readonly: false,
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>()

// Digit mentah selama user mengetik (null = tampilkan dari modelValue)
const typing = ref<string | null>(null)

const formatDigits = (digits: string) =>
  digits === '' ? '' : digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const digits = computed(() => {
  if (typing.value !== null) return typing.value
  if (props.modelValue === null || props.modelValue === undefined) return ''
  return String(Math.max(0, Math.round(props.modelValue)))
})

const formatted = computed(() => formatDigits(digits.value))

const handleInput = (event: Event) => {
  const el = event.target as HTMLInputElement
  const raw = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 15)
  typing.value = raw
  el.value = formatDigits(raw)
  emit('update:modelValue', raw === '' ? 0 : parseInt(raw, 10))
}

const handleBlur = () => {
  typing.value = null
}
</script>
