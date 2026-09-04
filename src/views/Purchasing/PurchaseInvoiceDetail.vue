<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Faktur Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader :title="pi?.pi_number || 'Detail Faktur'" subtitle="Faktur Pembelian" @back="$router.back()" />

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat faktur...</p>
      </div>
    </div>

    <div v-else-if="pi" class="mx-auto max-w-3xl space-y-4">
      <!-- Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="font-mono text-lg font-bold text-gray-900 dark:text-white">{{ pi.pi_number }}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Supplier: {{ pi.supplier_name || '—' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase" :class="getPaymentBadge(pi.payment_status)">{{ getPaymentLabel(pi.payment_status) }}</span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 text-xs dark:border-gray-700">
          <div>
            <p class="text-gray-500 dark:text-gray-400">Tanggal Faktur</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(pi.invoice_date) }}</p>
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400">Jatuh Tempo</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ pi.due_date ? formatDate(pi.due_date) : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Barang</h3>
        <div class="hidden overflow-hidden rounded-xl border border-gray-200 md:block dark:border-gray-700">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Barang</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Qty</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Harga</th>
                <th class="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="it in pi.items" :key="it.id">
                <td class="px-3 py-2.5 text-xs text-gray-900 dark:text-white">{{ it.product_name }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ it.quantity }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ formatRupiah(it.price) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="space-y-2 md:hidden">
          <div v-for="it in pi.items" :key="it.id" class="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex justify-between gap-2">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ it.product_name }}</p>
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</p>
            </div>
            <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{{ it.quantity }} x {{ formatRupiah(it.price) }}</p>
          </div>
        </div>
      </div>

      <!-- Ringkasan + Pembayaran -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="space-y-1 text-sm">
          <div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>{{ formatRupiah(pi.subtotal) }}</span></div>
          <div v-if="pi.discount" class="flex justify-between text-gray-600 dark:text-gray-400"><span>Diskon</span><span>-{{ formatRupiah(pi.discount) }}</span></div>
          <div v-if="pi.tax" class="flex justify-between text-gray-600 dark:text-gray-400"><span>Pajak</span><span>+{{ formatRupiah(pi.tax) }}</span></div>
          <div v-if="pi.shipping_cost" class="flex justify-between text-gray-600 dark:text-gray-400"><span>Ongkir</span><span>+{{ formatRupiah(pi.shipping_cost) }}</span></div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900 dark:border-gray-700 dark:text-white"><span>Total</span><span>{{ formatRupiah(pi.total) }}</span></div>
          <div class="flex justify-between text-emerald-600 dark:text-emerald-400"><span>Sudah Dibayar</span><span>{{ formatRupiah(pi.paid_amount) }}</span></div>
          <div class="flex justify-between text-base font-bold text-red-600 dark:text-red-400"><span>Sisa Tagihan</span><span>{{ formatRupiah(pi!.remaining_amount) }}</span></div>
        </div>

        <!-- Pembayaran -->
        <div v-if="pi.payments && pi.payments.length > 0" class="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
          <h4 class="mb-2 text-xs font-bold text-gray-900 dark:text-white">Riwayat Pembayaran</h4>
          <div v-for="p in pi.payments" :key="p.id" class="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatRupiah(p.amount) }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.payment_method }} · {{ formatDate(p.created_at) }}</p>
            </div>
            <p v-if="p.notes" class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.notes }}</p>
          </div>
        </div>

        <button
          v-if="pi.payment_status !== 'lunas'"
          @click="showPayModal = true"
          class="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Bayar {{ formatRupiah(pi!.remaining_amount) }}
        </button>
      </div>

      <p v-if="pi.notes" class="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{{ pi.notes }}</p>

      <button
        @click="$router.push(`/purchasing/returns/add?pi_id=${pi.id}`)"
        class="w-full rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10"
      >
        Retur Pembelian
      </button>
    </div>

    <!-- Modal Pembayaran -->
    <div v-if="showPayModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" @click.self="showPayModal = false">
      <div class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900" @click.stop>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Pembayaran</h3>
          <button @click="showPayModal = false" class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jumlah (maks {{ formatRupiah(pi!.remaining_amount) }})</label>
            <input v-model.number="payAmount" type="number" min="0" :max="pi!.remaining_amount" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Metode</label>
            <select v-model="payMethod" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="kartu_debit">Kartu Debit</option>
              <option value="kartu_kredit">Kartu Kredit</option>
              <option value="e_wallet">E-Wallet</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
            <input v-model="payNotes" type="text" placeholder="Catatan (opsional)" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div v-if="formError" class="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
            <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>
          <div class="flex gap-2 pt-2">
            <button @click="showPayModal = false" class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
            <button @click="handlePay" :disabled="saving" class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Bayar' }}</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import type { PurchaseInvoice } from '@/types/database'

const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const pi = ref<PurchaseInvoice | null>(null)
const loading = ref(false)
const saving = ref(false)
const formError = ref<string | null>(null)
const showPayModal = ref(false)
const payAmount = ref(0)
const payMethod = ref('tunai')
const payNotes = ref('')

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const getPaymentLabel = (s: string) => { const m: Record<string, string> = { belum_lunas: 'Belum Lunas', sebagian: 'Sebagian', lunas: 'Lunas' }; return m[s] || s }
const getPaymentBadge = (s: string) => {
  const b: Record<string, string> = { belum_lunas: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', sebagian: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', lunas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' }
  return b[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const load = async () => {
  loading.value = true
  try {
    pi.value = await store.getPurchaseInvoice(route.params.id as string)
    if (!pi.value) router.replace('/purchasing/pis')
    else payAmount.value = pi.value.remaining_amount
  } catch (e: any) { alert(e.message); router.replace('/purchasing/pis') } finally { loading.value = false }
}

const handlePay = async () => {
  formError.value = null
  if (!payAmount.value || payAmount.value <= 0) { formError.value = 'Jumlah pembayaran tidak valid'; return }
  if (pi.value && payAmount.value > pi.value.remaining_amount) { formError.value = 'Pembayaran melebihi sisa tagihan'; return }
  saving.value = true
  try {
    await store.addPIPayment(route.params.id as string, payAmount.value, payMethod.value, payNotes.value || undefined)
    showPayModal.value = false
    await load()
  } catch (e: any) { formError.value = e.message } finally { saving.value = false }
}

onMounted(load)
</script>