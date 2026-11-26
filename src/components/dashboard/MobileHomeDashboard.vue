<template>
  <div class="space-y-4">
    <!-- Header -->
    <header
      class="-mx-8 -mt-4 px-8 pb-[150px] pt-5 text-white"
      style="background-image: radial-gradient(circle at 100% 0, transparent 60px, rgba(255,255,255,.09) 61px, rgba(255,255,255,.09) 90px, transparent 91px, transparent 120px, rgba(255,255,255,.06) 121px, rgba(255,255,255,.06) 150px, transparent 151px), radial-gradient(circle at 0 100%, rgba(255,255,255,.10) 80px, transparent 81px), radial-gradient(rgba(255,255,255,.18) 1.2px, transparent 1.6px), linear-gradient(135deg, #1e40af, #2563eb); background-size: 100% 100%, 100% 100%, 16px 16px, 100% 100%;"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] font-medium text-blue-100">Selamat Datang,</p>
          <h1 class="text-xl font-extrabold tracking-tight">{{ displayName.toUpperCase() }}</h1>
        </div>
        <router-link
          to="/notifications"
          aria-label="Notifikasi"
          class="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span
            v-if="unreadCount > 0"
            class="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-blue-700"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </router-link>
      </div>
    </header>

    <!-- Saldo Kas & Bank -->
    <section class="relative" style="margin-top: -100px">
      <div
        ref="carouselContainer"
        class="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
        @scroll="handleScroll"
      >
        <!-- Kas Utama -->
        <div class="relative w-full shrink-0 snap-center overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-5 text-white shadow-lg">
          <span class="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10"></span>
          <div class="relative flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </span>
              <span class="text-sm font-medium text-blue-100">Saldo Kas Utama</span>
            </div>
            <button
              type="button"
              aria-label="Tampilkan atau sembunyikan saldo"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95"
              @click="$emit('toggle-visibility')"
            >
              <svg v-if="hidden" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M4 4l16 16" />
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          <div v-if="loadingAccounts" class="relative mt-3 h-9 w-40 animate-pulse rounded-lg bg-white/20"></div>
          <div v-else class="relative mt-3 text-[32px] font-extrabold leading-tight tracking-tight">
            {{ rp(cashBalance) }}
          </div>

          <div class="relative mt-4 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
            <div class="flex min-w-0 items-center gap-1.5 text-xs">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/30 text-emerald-200">
                <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
              <span class="text-emerald-200">Masuk:</span>
              <span class="truncate font-bold">{{ hidden ? 'Rp ••••••' : '+' + rp(todayKasMasuk) }}</span>
            </div>
            <router-link
              to="/laporan/mutasi-kas"
              class="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-blue-700 active:scale-95"
            >
              Mutasi &rarr;
            </router-link>
          </div>
        </div>

        <!-- Bank Utama -->
        <div class="relative w-full shrink-0 snap-center overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-purple-600 via-purple-600 to-violet-800 p-5 text-white shadow-lg">
          <span class="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10"></span>
          <div class="relative flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 10l9-6 9 6M5 10v8M10 10v8M14 10v8M19 10v8M3 21h18" />
                </svg>
              </span>
              <span class="text-sm font-medium text-purple-100">Saldo Bank Utama</span>
            </div>
            <button
              type="button"
              aria-label="Tampilkan atau sembunyikan saldo"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-95"
              @click="$emit('toggle-visibility')"
            >
              <svg v-if="hidden" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M4 4l16 16" />
              </svg>
              <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          <div v-if="loadingAccounts" class="relative mt-3 h-9 w-40 animate-pulse rounded-lg bg-white/20"></div>
          <div v-else class="relative mt-3 text-[32px] font-extrabold leading-tight tracking-tight">
            {{ rp(bankBalance) }}
          </div>

          <div class="relative mt-4 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
            <div class="flex min-w-0 items-center gap-1.5 text-xs">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/30 text-emerald-200">
                <svg class="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </span>
              <span class="text-emerald-200">Masuk:</span>
              <span class="truncate font-bold">{{ hidden ? 'Rp ••••••' : '+' + rp(todayBankMasuk) }}</span>
            </div>
            <router-link
              to="/laporan/mutasi-bank"
              class="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-purple-700 active:scale-95"
            >
              Mutasi &rarr;
            </router-link>
          </div>
        </div>
      </div>

      <div class="mt-3 flex justify-center gap-1.5">
        <button
          v-for="idx in 2"
          :key="idx"
          type="button"
          class="h-1.5 rounded-full transition-all"
          :class="currentCardIndex === idx - 1 ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-600'"
          :aria-label="idx === 1 ? 'Saldo Kas' : 'Saldo Bank'"
          @click="scrollToCard(idx - 1)"
        />
      </div>
    </section>

    <!-- Aksi Cepat -->
    <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="grid grid-cols-4 gap-x-1 gap-y-2 text-center">
        <button
          v-for="action in actions"
          :key="action.key"
          type="button"
          class="flex flex-col items-center gap-2 rounded-2xl py-1.5 transition active:scale-95"
          @click="router.push(action.to)"
        >
          <span class="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="action.icon" />
            </svg>
            <span
              v-if="action.key === 'pengiriman' && pendingShipmentsCount > 0"
              class="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm"
            >
              {{ pendingShipmentsCount > 9 ? '9+' : pendingShipmentsCount }}
            </span>
          </span>
          <span class="text-xs font-bold leading-tight text-slate-700 dark:text-slate-200">
            {{ action.label }}
          </span>
        </button>
      </div>
    </section>

    <!-- Omzet + Laba -->
    <section class="grid grid-cols-12 gap-3">
      <div class="col-span-7 flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-600 dark:text-slate-300">Omzet Mingguan</span>
            <span class="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              {{ selectedDay.day }}
            </span>
          </div>
          <div class="mt-1.5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            {{ rp(selectedDay.rev) }}
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400">
            {{ selectedDay.tx }} transaksi selesai
          </div>
        </div>
        <div class="mt-4 flex h-24 items-end justify-between gap-1">
          <button
            v-for="(day, i) in weekly"
            :key="day.key"
            type="button"
            class="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 focus:outline-none"
            @click="selectedDayIndex = i"
          >
            <div
              class="w-full rounded-t-lg transition-all"
              :class="i === selectedDayIndex ? 'bg-blue-600' : 'bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-700 dark:group-hover:bg-slate-600'"
              :style="{ height: day.pct + '%' }"
            ></div>
            <span
              class="text-[10px] font-bold"
              :class="i === selectedDayIndex ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'"
            >
              {{ day.day }}
            </span>
          </button>
        </div>
      </div>

      <div class="col-span-5 flex flex-col gap-3">
        <div class="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">Laba Diterima</span>
          <div class="mt-1 text-sm font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
            {{ rp(realizedProfit) }}
          </div>
          <div class="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            Margin {{ marginPct }}%
          </div>
        </div>
        <div class="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">Laba Tertahan</span>
          <div class="mt-1 text-sm font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
            {{ rp(unrealizedProfit) }}
          </div>
          <div class="mt-1.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            Ditahan {{ withheldPct }}%
          </div>
        </div>
      </div>
    </section>

    <!-- Omzet Hari Ini -->
    <section class="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Omzet Hari Ini</h2>
          <div class="mt-1 text-lg font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">
            {{ rp(todayRevenue) }}
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ todayTransactions.length }} transaksi</p>
        </div>
        <button
          type="button"
          class="flex shrink-0 items-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400"
          @click="router.push('/transactions')"
        >
          Detail transaksi
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700/50"></div>
      </div>

      <div v-else-if="todayTransactions.length === 0" class="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Belum ada transaksi hari ini.
      </div>

      <div v-else class="space-y-2.5">
        <button
          v-for="tx in todayTransactions.slice(0, 4)"
          :key="tx.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-700/30 dark:hover:bg-slate-700/60"
          @click="router.push(`/transactions/${tx.id}`)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                {{ tx.transaction_number }}
              </span>
              <span class="text-[10px] text-slate-400 dark:text-slate-500">• {{ formatTime(tx.created_at) }}</span>
            </div>
            <div class="mt-0.5 truncate text-xs font-bold text-slate-900 dark:text-white">
              {{ tx.customer_name || 'Pelanggan Umum' }}
            </div>
            <div class="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
              {{ summarizeItems(tx) }}
            </div>
          </div>
          <div class="shrink-0 text-right">
            <div class="text-xs font-extrabold text-slate-900 dark:text-white">{{ rp(tx.total) }}</div>
            <span
              class="mt-1 inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold"
              :class="
                tx.payment_status === 'lunas'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
              "
            >
              {{ paymentLabel(tx.payment_status) }}
            </span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePermission } from '@/composables/usePermission'
import { localDateStr, localDateFromIso, localTodayStr, localDateOffsetStr } from '@/utils/date'
import type { Transaction } from '@/types/database'

interface Props {
  displayName: string
  unreadCount: number
  hidden: boolean
  loading: boolean
  loadingAccounts: boolean
  cashBalance: number
  bankBalance: number
  realizedProfit: number
  unrealizedProfit: number
  netSales: number
  transactions: Transaction[]
  pendingShipmentsCount: number
}

const props = defineProps<Props>()
defineEmits<{
  'toggle-visibility': []
}>()

const router = useRouter()
const { can } = usePermission()

/* ---------- Format ---------- */
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const rp = (value: number) => (props.hidden ? 'Rp ••••••' : formatCurrency(value))

/* ---------- Saldo slider ---------- */
const carouselContainer = ref<HTMLElement | null>(null)
const currentCardIndex = ref(0)

const handleScroll = () => {
  if (!carouselContainer.value) return
  const scrollLeft = carouselContainer.value.scrollLeft
  const cardWidth = carouselContainer.value.offsetWidth
  currentCardIndex.value = Math.round(scrollLeft / cardWidth)
}

const scrollToCard = (index: number) => {
  if (!carouselContainer.value) return
  const cardWidth = carouselContainer.value.offsetWidth
  carouselContainer.value.scrollTo({ left: index * cardWidth, behavior: 'smooth' })
}

/* ---------- Transaksi ---------- */
const activeTransactions = computed(() =>
  props.transactions.filter((t) => t.status !== 'void' && t.status !== 'batal'),
)

const todayKey = localTodayStr()

const todayTransactions = computed(() =>
  activeTransactions.value.filter((t) => localDateFromIso(t.created_at) === todayKey),
)

const todayRevenue = computed(() =>
  todayTransactions.value.reduce((sum, t) => sum + (Number(t.total) || 0), 0),
)

const todayKasMasuk = computed(() =>
  todayTransactions.value
    .filter((t) => !isBankMethod(t.payment_method))
    .reduce((sum, t) => sum + (Number(t.paid_amount) || 0), 0),
)

const todayBankMasuk = computed(() =>
  todayTransactions.value
    .filter((t) => isBankMethod(t.payment_method))
    .reduce((sum, t) => sum + (Number(t.paid_amount) || 0), 0),
)

function isBankMethod(method?: string) {
  const m = (method || '').toLowerCase()
  return m.includes('transfer') || m.includes('bank')
}

const summarizeItems = (tx: Transaction) => {
  if (!tx.items?.length) return '-'
  return tx.items.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')
}

const paymentLabel = (status?: string) => {
  if (status === 'lunas') return 'Lunas'
  if (status === 'sebagian') return 'Sebagian'
  return 'Belum Lunas'
}

const formatTime = (iso: string) => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const dateKey = localDateFromIso(iso)
  if (dateKey === localTodayStr()) return `Hari ini, ${time}`
  if (dateKey === localDateOffsetStr(-1)) return `Kemarin, ${time}`
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return `${date}, ${time}`
}

/* ---------- Grafik mingguan ---------- */
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const selectedDayIndex = ref(6)

const weekly = computed(() => {
  const now = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i))
    const key = localDateStr(d)
    const dayTx = activeTransactions.value.filter((t) => localDateFromIso(t.created_at) === key)
    return {
      key,
      day: DAY_NAMES[d.getDay()],
      rev: dayTx.reduce((sum, t) => sum + (Number(t.total) || 0), 0),
      tx: dayTx.length,
    }
  })
  const max = Math.max(...days.map((d) => d.rev), 1)
  return days.map((d) => ({ ...d, pct: Math.max(6, Math.round((d.rev / max) * 100)) }))
})

const selectedDay = computed(() => weekly.value[selectedDayIndex.value] ?? weekly.value[6])

/* ---------- Laba ---------- */
const marginPct = computed(() => {
  if (!props.netSales) return 0
  return Math.round((props.realizedProfit / props.netSales) * 100)
})

const withheldPct = computed(() => {
  const total = props.realizedProfit + props.unrealizedProfit
  if (!total) return 0
  return Math.round((props.unrealizedProfit / total) * 100)
})

/* ---------- Aksi cepat ---------- */
const ALL_ACTIONS = [
  {
    key: 'penjualan',
    label: 'Penjualan',
    to: '/transactions/add',
    permission: 'transaction.write',
    icon: 'M14 3H7a2 2 0 0 0-2 2v14l2.5-1.5L10 19l2.5-1.5L15 19l2.5-1.5L19 19V8zM14 3v5h5M9 12h6M9 15h4',
  },
  {
    key: 'produk',
    label: 'Produk',
    to: '/products',
    permission: 'product.read',
    icon: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  },
  {
    key: 'pengiriman',
    label: 'Pengiriman',
    to: '/shipping/deliveries',
    permission: 'shipping.read',
    icon: 'M1 3h13v13H1zM14 8h4l4 4v4h-8zM5.5 18.5a2 2 0 1 0 0 .01M18.5 18.5a2 2 0 1 0 0 .01',
  },
  {
    key: 'customer',
    label: 'Customer',
    to: '/customers',
    permission: 'customer.read',
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  },
  {
    key: 'pembelian',
    label: 'Pembelian',
    to: '/purchasing',
    permission: 'purchasing.read',
    icon: 'M9 20a1.5 1.5 0 1 0 0 .01M18 20a1.5 1.5 0 1 0 0 .01M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6',
  },
  {
    key: 'gudang',
    label: 'Gudang',
    to: '/stock',
    permission: 'stock.read',
    icon: 'M3 9l9-6 9 6v11H3zM8 20v-7h8v7M8 16h8',
  },
  {
    key: 'karyawan',
    label: 'Karyawan',
    to: '/hr/employees',
    permission: 'hr.read',
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M16 11l2 2 4-4',
  },
  {
    key: 'piutang',
    label: 'Piutang',
    to: '/reports/aging-receivables',
    permission: 'report.sales.read',
    icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  },
] as const

const actions = computed(() => ALL_ACTIONS.filter((action) => can(action.permission)))
</script>

<style scoped>
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
