<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Detail Invoice" class="hidden md:block" />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data invoice...</p>
      </div>
    </div>

    <!-- Mobile + Desktop View -->
    <template v-else-if="transaction">
    <div class="md:hidden space-y-4 px-4 pb-32">
      <!-- 1. BARIS JUDUL & STATUS -->
      <section class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <button
            @click="router.push(backUrl)"
            class="p-2 rounded-xl bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 active:scale-95 transition dark:bg-white/[0.03] dark:border-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <span class="text-[10px] text-brand-500 font-mono block leading-none dark:text-brand-400">
              {{ transaction.transaction_number }}
            </span>
            <h1 class="text-xl font-extrabold text-gray-900 tracking-tight leading-tight mt-0.5 dark:text-white">
              Detail Invoice
            </h1>
          </div>
        </div>
        <span
          :class="[
            'px-2.5 py-1 rounded-lg text-[10px] font-bold border',
            isOverpaid || transaction.payment_status === 'lunas'
              ? 'bg-success-500/10 text-success-600 border-success-500/20 dark:text-success-400'
              : 'bg-warning-500/10 text-warning-600 border-warning-500/20 dark:text-warning-400'
          ]"
        >
          {{ isOverpaid || transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
        </span>
      </section>

      <!-- 2. KARTU PELANGGAN & WAKTU -->
      <section class="bg-white rounded-3xl border border-gray-200 p-4 flex justify-between items-center shadow-sm dark:bg-white/[0.03] dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-100 text-brand-600 border border-brand-200 flex items-center justify-center font-extrabold text-sm dark:bg-brand-500/20 dark:text-brand-400 dark:border-brand-500/30">
            {{ customerInitial }}
          </div>
          <div>
            <h2 class="text-sm font-bold text-gray-900 leading-tight dark:text-white">
              {{ transaction.customer_name || 'Umum' }}
            </h2>
            <p class="text-[11px] text-gray-500 leading-snug dark:text-gray-400">
              {{ formatPaymentMethod(transaction.payment_method) }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-gray-500 block dark:text-gray-400">{{ formatDateShort(transaction.created_at) }}</span>
          <span class="text-[10px] text-gray-500 block font-mono dark:text-gray-400">{{ formatTimeShort(transaction.created_at) }}</span>
        </div>
      </section>

      <!-- 3. RINCIAN BARANG -->
      <section class="bg-white rounded-3xl border border-gray-200 p-4 space-y-3.5 shadow-sm dark:bg-white/[0.03] dark:border-gray-800">
        <div class="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800/60">
          <span class="text-[11px] font-bold text-gray-700 uppercase tracking-wider dark:text-gray-300">
            Rincian Barang ({{ transaction.items?.length || 0 }} Macam)
          </span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400">Subtotal</span>
        </div>

        <div class="space-y-3 divide-y divide-gray-100 text-xs dark:divide-gray-800/60">
          <div
            v-for="(item, index) in transaction.items"
            :key="item.id"
            class="pt-2 first:pt-0 space-y-1"
          >
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-gray-900 dark:text-white">{{ item.product_name }}</h3>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">
                  {{ item.quantity }} × {{ formatCurrency(item.price) }}
                </p>
              </div>
              <span class="font-extrabold text-gray-900 dark:text-white">
                {{ formatCurrency(item.subtotal) }}
              </span>
            </div>
            <div
              v-if="returnedQty(item.product_id) > 0"
              class="flex justify-between items-center text-[10px] bg-error-500/10 px-2 py-1 rounded-lg border border-error-500/20 text-error-600 dark:text-error-400"
            >
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Diretur: {{ returnedQty(item.product_id) }} Item
              </span>
              <span class="font-bold">- {{ formatCurrency(returnedQty(item.product_id) * item.price) }}</span>
            </div>
          </div>
        </div>

        <!-- Detail Item Retur -->
        <div v-if="allReturnItems.length > 0" class="mt-3 space-y-2 rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/30 dark:bg-error-500/10">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-error-700 dark:text-error-400">Produk Diretur</p>
            <p class="text-[10px] text-error-600 dark:text-error-400">{{ allReturnItems.length }} Item</p>
          </div>
          <div class="space-y-2">
            <div
              v-for="(item, index) in allReturnItems"
              :key="item.product_id"
              class="flex items-start justify-between gap-2 text-[10px]"
            >
              <div class="flex-1 min-w-0">
                <p class="font-medium text-error-700 dark:text-error-300">{{ index + 1 }}. {{ item.product_name }}</p>
                <p class="text-error-600 dark:text-error-400">{{ formatCurrency(item.price) }} × {{ item.quantity }}</p>
              </div>
              <span class="font-bold text-error-600 dark:text-error-400">- {{ formatCurrency(item.subtotal) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. RIWAYAT PEMBAYARAN & KRONOLOGIS -->
      <section class="bg-white rounded-3xl border border-gray-200 p-4 space-y-4 shadow-sm text-xs dark:bg-white/[0.03] dark:border-gray-800">
        <div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800/60">
          <span class="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 dark:text-gray-300">
            <svg class="w-4 h-4 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Riwayat Pembayaran & Penyesuaian
          </span>
          <span class="text-[10px] text-gray-500 font-mono dark:text-gray-400">
            {{ (transaction.payments?.length || 0) + (returnsStore.returns.length || 0) + (returnsStore.linkedReturns.length || 0) + 1 }} Aktivitas
          </span>
        </div>

        <!-- TIMELINE AUDIT KRONOLOGIS -->
        <div class="relative pl-6 space-y-3.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-gray-800/60">
          <!-- Step 1: Faktur Terbit -->
          <div class="relative">
            <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center dark:border-gray-900">
              <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
            </span>
            <div class="flex justify-between items-start">
              <div>
                <p class="font-bold text-gray-900 leading-tight dark:text-white">Faktur Diterbitkan</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">
                  {{ formatDateShort(transaction.created_at) }}, {{ formatTimeShort(transaction.created_at) }} &bull; Total {{ transaction.items?.length || 0 }} Item
                </p>
              </div>
              <span class="font-extrabold text-gray-900 dark:text-white">
                {{ formatCurrency(originalSubtotal) }}
              </span>
            </div>
          </div>

          <!-- Pembayaran & Retur (digabung berdasarkan waktu) -->
          <template v-for="activity in sortedActivities" :key="activity.id">
            <!-- Pembayaran -->
            <div v-if="activity.type === 'payment'" class="relative">
              <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-success-500 border-2 border-white flex items-center justify-center dark:border-gray-900">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-semibold text-gray-700 leading-tight dark:text-gray-200">Pembayaran {{ activity.sequence }}</p>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">
                    {{ formatDateShort(activity.created_at) }}, {{ formatTimeShort(activity.created_at) }} &bull; {{ formatPaymentMethod(activity.payment_method) }}
                  </p>
                </div>
                <span class="font-extrabold font-outfit text-success-500 dark:text-success-400">
                  - {{ formatCurrency(activity.amount) }}
                </span>
              </div>
            </div>

            <!-- Retur -->
            <div v-if="activity.type === 'return'" class="relative">
              <span class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-error-500 border-2 border-white flex items-center justify-center dark:border-gray-900">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
              <div class="flex justify-between items-start bg-error-500/10 p-2 rounded-xl border border-error-500/20 -ml-2 pl-2">
                <div>
                  <p class="font-bold text-error-600 leading-tight font-outfit dark:text-error-400">
                    Retur Barang ({{ activity.return_number }})
                  </p>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">
                    {{ formatDateShort(activity.created_at) }}, {{ formatTimeShort(activity.created_at) }} &bull; {{ activity.items?.length || 0 }} Item
                  </p>
                </div>
                <span class="font-extrabold font-outfit text-error-600 dark:text-error-400">
                  - {{ formatCurrency(activity.total_refund) }}
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- REKAP FINAL AKUNTANSI -->
        <div class="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2 pt-3 dark:bg-gray-900/50 dark:border-gray-800">
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Total Barang (Kotor)</span>
            <span class="font-semibold text-gray-700 dark:text-gray-300">{{ formatCurrency(originalSubtotal) }}</span>
          </div>

          <div v-if="returnAmount > 0" class="flex justify-between text-error-600 dark:text-error-400">
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Potongan Retur
            </span>
            <span class="font-bold">- {{ formatCurrency(returnAmount) }}</span>
          </div>

          <div v-if="transaction.discount > 0" class="flex justify-between text-error-600 dark:text-error-400">
            <span>Diskon</span>
            <span class="font-bold">- {{ formatCurrency(transaction.discount) }}</span>
          </div>

          <div v-if="(transaction.shipping_cost || 0) > 0" class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Ongkir</span>
            <span class="font-semibold text-gray-700 dark:text-gray-300">+ {{ formatCurrency(transaction.shipping_cost) }}</span>
          </div>

          <div class="flex justify-between font-extrabold font-outfit text-gray-900 text-sm pt-2 border-t border-gray-200 dark:text-white dark:border-gray-800">
            <span>Total Bersih Faktur</span>
            <span class="text-brand-500 dark:text-brand-400">{{ formatCurrency(transaction.total) }}</span>
          </div>

          <div class="flex justify-between text-gray-600 pt-0.5 dark:text-gray-400">
            <span>Total Uang Diterima</span>
            <span class="text-success-600 font-bold dark:text-success-400">{{ formatCurrency(totalPaid) }}</span>
          </div>

          <div v-if="transaction.change_amount > 0" class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Kembalian</span>
            <span class="font-semibold text-gray-700 dark:text-gray-300">{{ formatCurrency(transaction.change_amount) }}</span>
          </div>

          <!-- Sisa Tagihan -->
          <div
            :class="[
              'mt-2 p-2.5 rounded-xl border flex justify-between items-center text-xs',
              isOverpaid || effectiveRemaining === 0
                ? 'bg-success-500/10 border-success-500/20'
                : 'bg-warning-500/10 border-warning-500/20'
            ]"
          >
            <span
              :class="[
                'font-bold font-outfit',
                isOverpaid || effectiveRemaining === 0 ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'
              ]"
            >
              Sisa Tagihan
            </span>
            <span
              :class="[
                'text-sm font-black font-outfit',
                isOverpaid || effectiveRemaining === 0 ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'
              ]"
            >
              {{ isOverpaid || effectiveRemaining === 0 ? 'Rp 0 (LUNAS)' : formatCurrency(effectiveRemaining) }}
            </span>
          </div>
        </div>
      </section>

      <!-- 5. DOKUMEN BUKTI RETUR -->
      <section
        v-if="returnsStore.returns.length > 0 || returnsStore.linkedReturns.length > 0"
        class="bg-white rounded-2xl border border-gray-200 p-3.5 space-y-2 text-xs dark:bg-white/[0.03] dark:border-gray-800"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold font-outfit text-gray-700 uppercase tracking-wider flex items-center gap-1.5 dark:text-gray-300">
            <svg class="w-3.5 h-3.5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Berkas Bukti Retur
          </span>
          <span class="text-[10px] text-gray-500 font-mono dark:text-gray-400">{{ returnsStore.returns.length + returnsStore.linkedReturns.length }} Retur</span>
        </div>
        <div
          v-for="ret in [...returnsStore.returns, ...returnsStore.linkedReturns]"
          :key="ret.id"
          class="bg-gray-50 p-2.5 rounded-xl border border-gray-200 space-y-1 text-[11px] text-gray-700 dark:bg-gray-900/50 dark:border-gray-800 dark:text-gray-300"
        >
          <div class="flex justify-between font-bold text-gray-900 dark:text-white">
            <span>{{ ret.return_number }}</span>
            <span class="font-mono">{{ formatCurrency(ret.total_refund) }}</span>
          </div>
          <div v-for="item in ret.items" :key="item.id" class="flex justify-between">
            <span>&bull; {{ item.product_name }} &times; {{ item.quantity }}</span>
            <span class="font-mono">{{ formatCurrency(item.subtotal) }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ================= STICKY ACTION BAR (MOBILE) ================= -->
    <div
      class="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 md:hidden dark:bg-gray-900/95 dark:border-gray-800"
    >
      <!-- Baris 1: Tombol utama -->
      <div class="flex gap-2 mb-2">
        <!-- Tombol Print PDF -->
        <button
          @click="handlePrintPdf"
          :disabled="isGeneratingPdf"
          class="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold font-outfit flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          <svg v-if="!isGeneratingPdf" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isGeneratingPdf ? 'Generating...' : 'PDF' }}</span>
        </button>

        <!-- Tombol Kirim WhatsApp -->
        <button
          @click="handleShareWhatsApp"
          :disabled="isGeneratingPdf"
          class="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold font-outfit flex items-center justify-center gap-1.5 active:scale-95 transition shadow-lg shadow-green-500/30 disabled:opacity-50"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>WhatsApp</span>
        </button>
      </div>

      <!-- Baris 2: Tombol sekunder -->
      <div class="flex gap-2">
        <!-- Tombol Retur Barang -->
        <button
          v-if="transaction.status === 'selesai'"
          @click="showReturnModal = true"
          class="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 text-xs font-bold font-outfit flex items-center justify-center gap-1.5 active:scale-95 transition dark:bg-white/[0.03] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.06]"
        >
          <svg class="w-3.5 h-3.5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          <span>Retur</span>
        </button>

        <!-- Tombol Tambah Pembayaran -->
        <button
          v-if="!isOverpaid && transaction.remaining_amount > 0 && transaction.status === 'selesai'"
          @click="showPaymentModal = true"
          class="flex-1 py-2.5 rounded-xl bg-warning-500 hover:bg-warning-600 text-white text-xs font-bold font-outfit flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Bayar</span>
        </button>

        <!-- Tombol Cetak Nota -->
        <button
          @click="router.push(`${backUrl}/${transaction.id}/cetak`)"
          class="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold font-outfit flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
          </svg>
          <span>Cetak</span>
        </button>
      </div>
    </div>

    <!-- Desktop View (Tetap menggunakan layout lama) -->
    <div class="hidden md:block mx-auto max-w-3xl">
      <!-- Invoice Card -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <!-- Invoice Header -->
        <div class="flex flex-col gap-4 border-b border-gray-200 p-6 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ settingsStore.storeName }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ settingsStore.storeSubtitle }}</p>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-sm font-semibold text-brand-600 dark:text-brand-400">
              {{ transaction.transaction_number }}
            </p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(transaction.created_at) }}</p>
            <div class="mt-2 flex gap-2 sm:justify-end">
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  isOverpaid || transaction.payment_status === 'lunas'
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                    : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                ]"
              >
                {{ isOverpaid || transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  transaction.status === 'selesai'
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                    : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'
                ]"
              >
                {{ transaction.status === 'selesai' ? 'Selesai' : 'Batal' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="grid grid-cols-1 gap-4 border-b border-gray-200 p-6 dark:border-gray-700 sm:grid-cols-2">
          <div>
            <p class="text-xs font-medium text-gray-400 uppercase dark:text-gray-500">Ditagih kepada</p>
            <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {{ transaction.customer_name || 'Umum (tanpa customer)' }}
            </p>
            <p v-if="transaction.notes" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Catatan: {{ transaction.notes }}
            </p>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-xs font-medium text-gray-400 uppercase dark:text-gray-500">Pembayaran</p>
            <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatPaymentMethod(transaction.payment_method) }}
            </p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="border-b border-gray-200 dark:border-gray-700">
          <div v-if="transaction.items && transaction.items.length > 0" class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/50">
                  <th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">No</th>
                  <th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Produk</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Harga</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Qty</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in transaction.items"
                  :key="item.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{{ index + 1 }}</td>
                  <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {{ item.product_name }}
                    <span
                      v-if="returnedQty(item.product_id) > 0"
                      class="block text-xs font-normal text-error-600 dark:text-error-400"
                    >
                      {{ returnedQty(item.product_id) }} item diretur
                    </span>
                  </td>
                  <td class="px-6 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{{ formatCurrency(item.price) }}</td>
                  <td class="px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{{ item.quantity }}</td>
                  <td class="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="px-6 py-6 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada rincian item</p>
          </div>
        </div>

        <!-- Totals -->
        <div class="grid grid-cols-1 gap-6 border-b border-gray-200 p-6 dark:border-gray-700 sm:grid-cols-2">            <!-- Payment History -->
          <div>
            <p class="mb-3 text-xs font-medium text-gray-400 uppercase dark:text-gray-500">Riwayat Pembayaran & Penyesuaian</p>
            <div v-if="(transaction.payments && transaction.payments.length > 0) || isOverpaid" class="space-y-2">
              <div
                v-for="payment in transaction.payments"
                :key="payment.id"
                class="flex items-center justify-between gap-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-gray-700 dark:text-gray-300">
                    {{ formatDate(payment.created_at) }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {{ formatPaymentMethod(payment.payment_method) }}
                  </p>
                </div>
                <span class="text-sm font-semibold text-success-600 dark:text-success-400">
                  - {{ formatCurrency(payment.amount) }}
                </span>
              </div>

            </div>
            <div v-else>
              <p class="text-sm text-gray-400 dark:text-gray-500">Belum ada pembayaran dicatat</p>
            </div>
          </div>

          <!-- Total Summary -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Total Barang</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(originalSubtotal) }}</span>
            </div>
            <div v-if="returnAmount > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Retur</span>
              <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(returnAmount) }}</span>
            </div>
            <div v-if="transaction.discount > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Diskon</span>
              <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(transaction.discount) }}</span>
            </div>
            <div v-if="(transaction.shipping_cost || 0) > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Ongkir</span>
              <span class="font-medium text-gray-900 dark:text-white">+ {{ formatCurrency(transaction.shipping_cost) }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
              <span class="text-lg font-bold text-brand-600 dark:text-brand-400">{{ formatCurrency(transaction.total) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Sudah Dibayar</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(transaction.paid_amount) }}</span>
            </div>
            <div v-if="transaction.change_amount > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Kembalian</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(transaction.change_amount) }}</span>
            </div>
            <div v-if="isOverpaid" class="flex justify-between text-sm">
              <span class="text-success-600 dark:text-success-400">Pengembalian Lebih Bayar</span>
              <span class="font-semibold text-success-600 dark:text-success-400">- {{ formatCurrency(overpayAmount) }}</span>
            </div>
            <div
              v-if="isOverpaid"
              class="flex justify-between rounded-lg bg-success-50 px-3 py-2 dark:bg-success-500/10"
            >
              <span class="text-sm font-medium text-success-700 dark:text-success-400">Sisa Tagihan</span>
              <span class="text-sm font-bold text-success-700 dark:text-success-400">
                {{ formatCurrency(0) }}
              </span>
            </div>
            <div
              v-else-if="effectiveRemaining > 0"
              class="flex justify-between rounded-lg bg-warning-50 px-3 py-2 dark:bg-warning-500/10"
            >
              <span class="text-sm font-medium text-warning-700 dark:text-warning-400">Sisa Cicilan</span>
              <span class="text-sm font-bold text-warning-700 dark:text-warning-400">
                {{ formatCurrency(effectiveRemaining) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-3">
            <button
              v-if="!isOverpaid && transaction.remaining_amount > 0 && transaction.status === 'selesai'"
              @click="showPaymentModal = true"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-500 bg-transparent px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/15"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Pembayaran
            </button>
            <button
              v-if="transaction.status === 'selesai'"
              @click="showReturnModal = true"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-500 bg-transparent px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/15"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Retur Barang
            </button>
            <button
              v-if="transaction.status === 'selesai'"
              @click="showVoidDialog = true"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-error-500 bg-transparent px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Batalkan Transaksi
            </button>
            <button
              @click="router.push(`${backUrl}/${transaction.id}/cetak`)"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
            </svg>
              Cetak Invoice
            </button>
          </div>
          <button
            @click="router.push(backUrl)"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
        </div>
      </div>

      <!-- Keterangan Retur -->
      <div class="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Keterangan Retur</h3>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ returnsStore.returns.length + returnsStore.linkedReturns.length }} retur</span>
        </div>
        <div v-if="returnsStore.returns.length === 0 && returnsStore.linkedReturns.length === 0" class="p-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada retur untuk invoice ini</p>
        </div>
        <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="ret in [...returnsStore.returns, ...returnsStore.linkedReturns]" :key="ret.id" class="p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ ret.return_number }}</p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ formatDate(ret.created_at) }}</p>
                <p v-if="ret.notes" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Catatan: {{ ret.notes }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-bold text-error-600 dark:text-error-400">- {{ formatCurrency(ret.total_refund) }}</span>
                <button
                  @click="openDeleteReturn(ret)"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-error-600 dark:hover:bg-white/[0.03] dark:hover:text-error-500"
                  title="Batalkan Retur"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="mt-3 space-y-1">
              <div
                v-for="item in ret.items"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600 dark:text-gray-400">{{ item.product_name }} × {{ item.quantity }}</span>
                <span class="text-gray-700 dark:text-gray-300">{{ formatCurrency(item.subtotal) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </template>

    <div v-else class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-gray-600 dark:text-gray-400">Invoice tidak ditemukan</p>
      <button
        @click="router.push(backUrl)"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Daftar Invoice
      </button>
    </div>

    <!-- Payment Modal -->
    <PaymentModal
      v-model="showPaymentModal"
      :transaction-number="transaction?.transaction_number"
      :remaining="transaction?.remaining_amount || 0"
      @submit="handleAddPayment"
    />

    <!-- Return Modal -->
    <ReturnModal
      v-model="showReturnModal"
      :transaction-number="transaction?.transaction_number"
      :items="returnableItems"
      @submit="handleReturnSubmit"
    />

    <!-- Void Confirmation Dialog -->
    <ConfirmDialog
      v-model="showVoidDialog"
      title="Batalkan Transaksi?"
      :message="`Apakah Anda yakin ingin membatalkan transaksi '${transaction?.transaction_number}'? Stok produk akan dikembalikan dan transaksi ditandai 'batal'. Riwayat tetap tersimpan.`"
      confirm-text="Ya, Batalkan"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmVoid"
    />

    <ConfirmDialog
      v-model="showDeleteReturnDialog"
      title="Batalkan Retur?"
      :message="`Apakah Anda yakin ingin membatalkan retur '${returnToDelete?.return_number}'? Stok produk akan dikurangi kembali dan total invoice dikembalikan seperti semula.`"
      confirm-text="Ya, Batalkan"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmDeleteReturn"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import PaymentModal from '@/components/common/PaymentModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ReturnModal from '@/components/common/ReturnModal.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useReturnsStore } from '@/stores/returns'
import { useCustomersStore } from '@/stores/customers'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import { usePdfExport } from '@/composables/usePdfExport'

const router = useRouter()
const route = useRoute()
const transactionsStore = useTransactionsStore()
const returnsStore = useReturnsStore()
const customersStore = useCustomersStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()
const { generatePdfBlob, shareToWhatsApp, downloadPdf } = usePdfExport()

const kecamatan = route.params.kecamatan as string
const customerId = route.params.customerId as string
const invoiceId = route.params.invoiceId as string

const transaction = ref<any>(null)
const loading = ref(true)
const showPaymentModal = ref(false)
const showVoidDialog = ref(false)
const showReturnModal = ref(false)
const showDeleteReturnDialog = ref(false)
const returnToDelete = ref<any>(null)
const isGeneratingPdf = ref(false)

// Total nilai barang yang sudah diretur
const totalRefund = computed(() =>
  returnsStore.returns.reduce((sum, r) => sum + (r.total_refund || 0), 0) +
  returnsStore.linkedReturns.reduce((sum, r) => sum + (r.total_refund || 0), 0)
)

// Jumlah retur yang muncul (dari store atau dari transaction object)
const returnAmount = computed(() => {
  const storeTotal = totalRefund.value
  const txReturnAmount = transaction.value?.return_amount || 0
  return Math.max(storeTotal, txReturnAmount)
})

// Total pembayaran
const totalPaid = computed(() =>
  (transaction.value?.payments || []).reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0
  )
)

// Total tagihan awal (sebelum retur & pembayaran)
const originalTotal = computed(() => (transaction.value?.total || 0) + returnAmount.value)

// Sisa tagihan actual (bisa negatif jika overpaid)
const rawRemaining = computed(() => originalTotal.value - totalPaid.value - returnAmount.value)

// Apakah ada kelebihan bayar?
const isOverpaid = computed(() => rawRemaining.value < 0)
const overpayAmount = computed(() => (isOverpaid.value ? Math.abs(rawRemaining.value) : 0))

// Effective remaining (tidak negatif)
const effectiveRemaining = computed(() => Math.max(rawRemaining.value, 0))

// Nilai seluruh barang sebelum retur (jumlah dari rincian item asli)
const originalSubtotal = computed(() => {
  const items = transaction.value?.items
  if (items && items.length > 0) {
    return items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
  }
  return (
    Math.max((transaction.value?.subtotal || 0) - (transaction.value?.discount || 0), 0) +
    returnAmount.value
  )
})

// Gabungkan semua item retur (digest per produk) — dari retur langsung maupun linked
const allReturnItems = computed(() => {
  const items: { product_id: string; product_name: string; price: number; quantity: number; subtotal: number }[] = []

  const processReturns = (retList: typeof returnsStore.returns) => {
    retList.forEach((ret) => {
      ;(ret.items || []).forEach((item) => {
        if (!item.product_id) return
        const existing = items.find((i) => i.product_id === item.product_id)
        if (existing) {
          existing.quantity += item.quantity
          existing.subtotal += item.subtotal
        } else {
          items.push({
            product_id: item.product_id,
            product_name: item.product_name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })
        }
      })
    })
  }

  processReturns(returnsStore.returns)
  processReturns(returnsStore.linkedReturns)
  return items
})

// Jumlah unit yang sudah diretur untuk sebuah produk
const returnedQty = (productId: string) =>
  returnsStore.returns.reduce(
    (sum, ret) =>
      sum +
      (ret.items || [])
        .filter((ri) => ri.product_id && ri.product_id === productId)
        .reduce((s, ri) => s + ri.quantity, 0),
    0
  ) +
  returnsStore.linkedReturns.reduce(
    (sum, ret) =>
      sum +
      (ret.items || [])
        .filter((ri) => ri.product_id && ri.product_id === productId)
        .reduce((s, ri) => s + ri.quantity, 0),
    0
  )

// Item yang bisa diretur: sisa = jumlah dibeli - jumlah yang sudah diretur
const returnableItems = computed(() => {
  const txItems = transaction.value?.items || []
  return txItems
    .filter((item: any) => item.product_id)
    .map((item: any) => {
      const returned = returnsStore.returns.reduce((sum, ret) => {
        return (
          sum +
          (ret.items || [])
            .filter((ri) => ri.product_id === item.product_id)
            .reduce((s, ri) => s + ri.quantity, 0)
        )
      }, 0)
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        max: Math.max(item.quantity - returned, 0),
      }
    })
})

const backUrl = computed(() => `/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}`)

// Initial customer untuk avatar
const customerInitial = computed(() => {
  const name = transaction.value?.customer_name || 'U'
  return name.charAt(0).toUpperCase()
})

// Gabungkan pembayaran dan retur, lalu sort berdasarkan waktu
const sortedActivities = computed(() => {
  const payments = (transaction.value?.payments || []).map((p: any, idx: number) => ({
    ...p,
    type: 'payment',
    sequence: `ke-${idx + 1}`
  }))
  const returns = returnsStore.returns.map((r: any) => ({
    ...r,
    type: 'return'
  }))
  const linkedReturns = returnsStore.linkedReturns.map((r: any) => ({
    ...r,
    type: 'return'
  }))

  return [...payments, ...returns, ...linkedReturns].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
    tempo: 'Tempo',
  }
  return methods[value] || value
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatTimeShort = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }) + ' WIB'
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  const datePart = date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const timePart = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${datePart} ${timePart} WIB`
}

const handleAddPayment = async (payload: {
  amount: number
  payment_method: string
  notes?: string
}) => {
  try {
    await transactionsStore.addPayment(
      invoiceId,
      payload.amount,
      payload.payment_method,
      payload.notes
    )
    toast.success('Berhasil!', 'Pembayaran berhasil dicatat')
    transaction.value = await transactionsStore.getTransaction(invoiceId)
    showPaymentModal.value = false
  } catch (error: any) {
    console.error('Error adding payment:', error)
    toast.error('Gagal!', error.message || 'Gagal mencatat pembayaran')
  }
}

const confirmVoid = async () => {
  try {
    await transactionsStore.voidTransaction(invoiceId)
    toast.success('Berhasil!', 'Transaksi berhasil dibatalkan')
    transaction.value = await transactionsStore.getTransaction(invoiceId)
    showVoidDialog.value = false
  } catch (error: any) {
    console.error('Error voiding invoice:', error)
    toast.error('Gagal!', error.message || 'Gagal membatalkan transaksi')
  }
}

const handleReturnSubmit = async (payload: {
  items: { product_id: string; quantity: number }[]
  notes?: string
}) => {
  try {
    await returnsStore.createReturn(invoiceId, payload.items, payload.notes)
    toast.success('Berhasil!', 'Retur berhasil dicatat')
    transaction.value = await transactionsStore.getTransaction(invoiceId)
    await returnsStore.fetchReturns(invoiceId)
    showReturnModal.value = false
  } catch (error: any) {
    console.error('Error creating return:', error)
    toast.error('Gagal!', error.message || 'Gagal mencatat retur')
  }
}

const openDeleteReturn = (ret: any) => {
  returnToDelete.value = ret
  showDeleteReturnDialog.value = true
}

const confirmDeleteReturn = async () => {
  if (!returnToDelete.value) return
  try {
    await returnsStore.deleteReturn(returnToDelete.value.id, invoiceId)
    toast.success('Berhasil!', 'Retur berhasil dibatalkan')
    transaction.value = await transactionsStore.getTransaction(invoiceId)
    returnToDelete.value = null
  } catch (error: any) {
    console.error('Error deleting return:', error)
    toast.error('Gagal!', error.message || 'Gagal membatalkan retur')
  }
}

const handlePrintPdf = async () => {
  if (isGeneratingPdf.value) return

  isGeneratingPdf.value = true
  try {
    const filename = `Invoice-${transaction.value.transaction_number}.pdf`
    
    // Siapkan data invoice
    const invoiceData = {
      transaction_number: transaction.value.transaction_number,
      created_at: transaction.value.created_at,
      customer_name: transaction.value.customer_name || 'Umum',
      customer_store_name: transaction.value.customer_store_name,
      customer_address: kecamatan || transaction.value.customer_address,
      items: transaction.value.items || [],
      return_items: allReturnItems.value,
      subtotal: originalSubtotal.value,
      discount: transaction.value.discount || 0,
      shipping_cost: transaction.value.shipping_cost || 0,
      return_amount: returnAmount.value,
      total: transaction.value.total,
      payments: transaction.value.payments || [],
      payment_status: transaction.value.payment_status,
      updated_at: transaction.value.updated_at,
    }

    const storeSettings = {
      name: settingsStore.storeName, // Nama toko utama (bukan subtitle)
      address: settingsStore.storeAddress,
      email: settingsStore.storeEmail,
      phone: settingsStore.storePhone,
    }

    const pdfBlob = generatePdfBlob(invoiceData, storeSettings)
    await downloadPdf(pdfBlob, filename)

    toast.success('Berhasil!', 'PDF berhasil dibuat')
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    toast.error('Gagal!', error.message || 'Gagal membuat PDF')
  } finally {
    isGeneratingPdf.value = false
  }
}

const handleShareWhatsApp = async () => {
  if (isGeneratingPdf.value) return

  isGeneratingPdf.value = true
  try {
    // Dapatkan nomor telepon customer dari customersStore
    let customerPhone = ''
    if (transaction.value.customer_id) {
      const customer = await customersStore.customers.find((c: any) => c.id === transaction.value.customer_id)
      customerPhone = customer?.phone || ''
    }

    if (!customerPhone) {
      toast.error('Gagal!', 'Nomor telepon pelanggan tidak ditemukan. Pastikan customer memiliki nomor telepon.')
      isGeneratingPdf.value = false
      return
    }

    const filename = `Invoice-${transaction.value.transaction_number}.pdf`
    
    // Siapkan data invoice
    const invoiceData = {
      transaction_number: transaction.value.transaction_number,
      created_at: transaction.value.created_at,
      customer_name: transaction.value.customer_name || 'Umum',
      customer_store_name: transaction.value.customer_store_name,
      customer_address: kecamatan || transaction.value.customer_address,
      items: transaction.value.items || [],
      return_items: allReturnItems.value,
      subtotal: originalSubtotal.value,
      discount: transaction.value.discount || 0,
      shipping_cost: transaction.value.shipping_cost || 0,
      return_amount: returnAmount.value,
      total: transaction.value.total,
      payments: transaction.value.payments || [],
      payment_status: transaction.value.payment_status,
      updated_at: transaction.value.updated_at,
    }

    const storeSettings = {
      name: settingsStore.storeName, // Nama toko utama (bukan subtitle)
      address: settingsStore.storeAddress,
      email: settingsStore.storeEmail,
      phone: settingsStore.storePhone,
    }

    const pdfBlob = generatePdfBlob(invoiceData, storeSettings)
    await shareToWhatsApp(customerPhone, pdfBlob, filename)

    toast.success('Berhasil!', 'PDF siap dibagikan via WhatsApp')
  } catch (error: any) {
    console.error('Error sharing to WhatsApp:', error)
    toast.error('Gagal!', error.message || 'Gagal kirim ke WhatsApp')
  } finally {
    isGeneratingPdf.value = false
  }
}


onMounted(async () => {
  try {
    // Fetch settings store data first
    await settingsStore.fetchSettings()
    
    transaction.value = await transactionsStore.getTransaction(invoiceId)
    await returnsStore.fetchReturns(invoiceId)
    await returnsStore.fetchLinkedReturns(invoiceId)
    await returnsStore.fetchReturnsForNewTransaction(invoiceId)
  } catch (error) {
    console.error('Error loading invoice:', error)
    toast.error('Gagal!', 'Gagal memuat data invoice')
  } finally {
    loading.value = false
  }
})
</script>
