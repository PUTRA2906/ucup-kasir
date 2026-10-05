<template>
  <div>
    <div v-if="loading">
      <LoadingSkeleton type="account-balance-carousel" />
    </div>
    <div v-else class="relative">
      <div
        ref="carouselContainer"
        class="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        @scroll="handleScroll"
      >
        <div class="min-w-full snap-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="text-sm font-medium text-white/90">Saldo kas</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white/90 transition hover:bg-white/10 active:scale-95"
              @click.stop="$emit('toggle-visibility')"
            >
              <svg
                v-if="hidden"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <svg
                v-else
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
              <span>{{ hidden ? 'Tampilkan' : 'Sembunyikan' }}</span>
            </button>
          </div>

          <div>
            <h3 class="text-2xl font-bold text-white mb-1">
              {{ hidden ? 'Rp ××××××' : formatCurrency(cashBalance) }}
            </h3>
            <p class="text-xs text-white/75 mb-4">Saldo tunai</p>
          </div>

          <router-link
            to="/laporan/mutasi-kas"
            class="flex items-center justify-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/30 active:scale-95"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Lihat mutasi kas
          </router-link>
        </div>

        <div class="min-w-full snap-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span class="text-sm font-medium text-white/90">Saldo Bank</span>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white/90 transition hover:bg-white/10 active:scale-95"
              @click.stop="$emit('toggle-visibility')"
            >
              <svg
                v-if="hidden"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <svg
                v-else
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
              <span>{{ hidden ? 'Tampilkan' : 'Sembunyikan' }}</span>
            </button>
          </div>

          <div>
            <h3 class="text-2xl font-bold text-white mb-1">
              {{ hidden ? 'Rp ××××××' : formatCurrency(bankBalance) }}
            </h3>
            <p class="text-xs text-white/75 mb-4">Saldo rekening bank</p>
          </div>

          <router-link
            to="/laporan/mutasi-bank"
            class="flex items-center justify-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/30 active:scale-95"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Lihat mutasi bank
          </router-link>
        </div>
      </div>

      <div class="mt-3 flex justify-center gap-1.5">
        <button
          v-for="idx in 2"
          :key="idx"
          type="button"
          class="h-1.5 rounded-full transition-all"
          :class="currentCardIndex === idx - 1 ? 'w-6 bg-brand-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'"
          @click="scrollToCard(idx - 1)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'

interface Props {
  hidden: boolean
  loading: boolean
  cashBalance: number
  bankBalance: number
}

defineProps<Props>()
defineEmits<{
  'toggle-visibility': []
}>()

const carouselContainer = ref<HTMLElement | null>(null)
const currentCardIndex = ref(0)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const handleScroll = () => {
  if (!carouselContainer.value) return
  const scrollLeft = carouselContainer.value.scrollLeft
  const cardWidth = carouselContainer.value.offsetWidth
  currentCardIndex.value = Math.round(scrollLeft / cardWidth)
}

const scrollToCard = (index: number) => {
  if (!carouselContainer.value) return
  const cardWidth = carouselContainer.value.offsetWidth
  carouselContainer.value.scrollTo({
    left: index * cardWidth,
    behavior: 'smooth'
  })
}
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
