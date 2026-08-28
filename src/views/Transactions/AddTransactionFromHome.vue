<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Transaksi Baru" class="hidden md:block" />

    <!-- Mobile Header with Close Button -->
    <div class="mb-4 flex items-center justify-between md:hidden">
      <div class="flex items-center gap-2.5">
        <button
          @click="router.push('/')"
          class="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-extrabold leading-tight text-gray-900 dark:text-white">Transaksi Baru</h1>
          <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDateShort(new Date()) }}</p>
        </div>
      </div>
      <button
        type="button"
        @click="resetForm"
        class="text-xs font-bold text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-400"
      >
        Reset
      </button>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- Mobile Layout -->
      <div class="space-y-4 pb-32 md:hidden">
        <!-- 0. Card Tanggal Transaksi -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <label class="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            <svg class="h-3.5 w-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Tanggal Transaksi
          </label>
          <input
            type="datetime-local"
            v-model="transactionDate"
            class="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <!-- 1. Card Data Customer -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-2.5 flex items-center justify-between">
            <label class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              <svg class="h-3.5 w-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Data Customer
            </label>
            <span v-if="customersStore.customers.length > 0" class="text-[10px] font-medium text-blue-500">
              Pilih dari Daftar
            </span>
          </div>

          <button
            v-if="!selectedCustomer"
            type="button"
            @click="showCustomerPicker = true"
            class="group flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-left transition hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-500/10"
          >
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-500 transition group-hover:bg-blue-500 group-hover:text-white">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <span class="block text-xs font-bold text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                  + Pilih Customer dari Daftar
                </span>
                <span class="text-[10px] text-gray-500 dark:text-gray-400">Klik untuk mencari mitra</span>
              </div>
            </div>
            <svg class="h-4 w-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div v-else class="flex items-center gap-3 rounded-xl border border-blue-500 bg-blue-50/50 p-3 dark:border-blue-500 dark:bg-blue-500/10">
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
              {{ selectedCustomer.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold text-gray-900 dark:text-white">
                {{ selectedCustomer.name }}
                <span v-if="selectedCustomer.store_name" class="font-normal text-gray-600 dark:text-gray-400">
                  ({{ selectedCustomer.store_name }})
                </span>
              </p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {{ selectedCustomer.kecamatan || '-' }}
                <span v-if="selectedCustomer.phone"> · {{ selectedCustomer.phone }}</span>
              </p>
            </div>
            <button
              type="button"
              @click="selectedCustomerId = ''"
              class="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-error-600 dark:hover:bg-white/[0.03] dark:hover:text-error-500"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p v-if="!selectedCustomerId && customersStore.customers.length > 0" class="mt-2 text-xs text-error-500 dark:text-error-400">
            Customer harus dipilih
          </p>
          <p v-if="customersStore.customers.length === 0" class="mt-2 text-xs text-warning-600 dark:text-warning-400">
            Belum ada customer.
            <button
              type="button"
              @click="router.push('/customers/add')"
              class="underline hover:no-underline"
            >
              Tambah baru
            </button>
          </p>
        </div>

        <!-- 2. Card Rincian Item -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <div class="flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Rincian Item</span>
              <span class="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {{ cartItems.length }} item
              </span>
            </div>
            <button
              type="button"
              @click="showProductPicker = true"
              class="flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-500 hover:bg-blue-500/20"
            >
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Produk
            </button>
          </div>

          <!-- Empty State -->
          <div v-if="cartItems.length === 0" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Keranjang masih kosong</p>
            <p class="text-[10px] text-gray-400 dark:text-gray-500">Klik "Tambah Produk" untuk memilih barang</p>
          </div>

          <!-- Cart Items -->
          <div v-else class="space-y-2.5">
            <div
              v-for="(item, index) in cartItems"
              :key="item.product_id"
              class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="mb-2.5 flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h4 class="text-xs font-bold leading-snug text-gray-900 dark:text-white">{{ item.name }}</h4>
                  <span class="text-[10px] text-gray-500 dark:text-gray-400">Stok: {{ item.stock }}</span>
                </div>
                <button
                  type="button"
                  @click="removeFromCart(item.product_id)"
                  class="flex-shrink-0 p-1 text-gray-400 hover:text-error-500"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
                <div>
                  <label class="mb-0.5 block text-[10px] text-gray-500 dark:text-gray-400">Harga Jual (Rp)</label>
                  <input
                    type="text"
                    inputmode="numeric"
                    :value="formatNumber(item.price)"
                    @input="updatePrice(item, ($event.target as HTMLInputElement).value)"
                    class="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label class="mb-0.5 block text-[10px] text-gray-500 dark:text-gray-400">Jumlah (Qty)</label>
                  <div class="flex items-center justify-between rounded-lg border border-gray-300 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
                    <button
                      type="button"
                      @click="decrementQuantity(item)"
                      class="flex h-6 w-6 items-center justify-center rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      :value="getQtyDisplay(item)"
                      @input="updateQuantity(item, ($event.target as HTMLInputElement).value)"
                      @blur="validateQuantity(item)"
                      class="w-12 bg-transparent text-center text-xs font-bold text-gray-900 focus:outline-none dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      @click="incrementQuantity(item)"
                      class="flex h-6 w-6 items-center justify-center rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 text-xs dark:border-gray-700">
                <span class="text-[10px] text-gray-500 dark:text-gray-400">Subtotal Item</span>
                <span class="font-extrabold text-gray-900 dark:text-white">{{ formatCurrency(item.subtotal) }}</span>
              </div>
            </div>
          </div>

          <!-- Return Items -->
          <div v-if="returnItems.length > 0" class="mt-3 space-y-2 rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-500/30 dark:bg-error-500/10">
            <div class="flex items-center justify-between">
              <h4 class="flex items-center gap-1.5 text-xs font-semibold text-error-700 dark:text-error-400">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Item Retur ({{ returnItems.length }})
              </h4>
              <button
                type="button"
                @click="returnItems = []"
                class="text-xs font-medium text-error-600 hover:text-error-700 dark:text-error-400"
              >
                Hapus
              </button>
            </div>
            <div
              v-for="item in returnItems"
              :key="`${item.transaction_id}_${item.product_id}`"
              class="flex items-center justify-between text-xs"
            >
              <span class="text-error-700 dark:text-error-300">
                {{ item.product_name }} × {{ item.quantity }}
                <span class="text-[10px] text-error-500 dark:text-error-400">({{ item.transaction_number }})</span>
              </span>
              <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(item.subtotal) }}</span>
            </div>
          </div>

          <!-- Button Klaim Retur -->
          <button
            v-if="selectedCustomerId && returnItems.length === 0"
            type="button"
            @click="showReturnPicker = true"
            class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-error-500 bg-transparent py-2 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/15"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Klaim Retur
          </button>
        </div>

        <!-- 3. Card Metode Bayar & Diskon -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
            <span class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              <svg class="h-3.5 w-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Ringkasan & Pembayaran
            </span>
          </div>

          <div class="mb-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="payment = { amount: netTotal, payment_method: 'tunai' }"
              :class="[
                'rounded-xl border p-2 text-center text-xs font-bold transition',
                payment?.payment_method === 'tunai'
                  ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              ]"
            >
              Tunai (Lunas)
            </button>
            <button
              type="button"
              @click="payment = { amount: 0, payment_method: 'tempo' }"
              :class="[
                'rounded-xl border p-2 text-center text-xs font-semibold transition',
                payment?.payment_method === 'tempo'
                  ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              ]"
            >
              Hutang / Tempo
            </button>
            <button
              type="button"
              @click="showPaymentModal = true"
              :class="[
                'rounded-xl border p-2 text-center text-xs font-semibold transition',
                payment && payment.payment_method !== 'tunai' && payment.payment_method !== 'tempo' && payment.amount > 0 && payment.amount < netTotal
                  ? 'border-purple-500 bg-purple-500 text-white shadow-sm'
                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              ]"
            >
              DP / Cicilan
            </button>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Potongan / Diskon</span>
              <div class="relative w-36">
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">Rp</span>
                <input
                  v-model="discountInput"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  class="w-full rounded-xl border border-gray-300 bg-gray-50 py-1.5 pl-8 pr-2.5 text-right text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div v-if="payment && payment.amount > 0" class="flex items-center justify-between">
              <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Uang Diterima (Bayar)</span>
              <div class="relative w-36">
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">Rp</span>
                <input
                  :value="formatNumber(payment.amount)"
                  type="text"
                  inputmode="numeric"
                  disabled
                  class="w-full rounded-xl border border-emerald-500/40 bg-emerald-50 py-1.5 pl-8 pr-2.5 text-right text-xs font-bold text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticky Bottom Bar Mobile -->
      <div class="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 p-3.5 backdrop-blur-md md:hidden dark:border-gray-800 dark:bg-gray-900/95">
        <div>
          <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Bersih</span>
          <span class="text-xl font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(netTotal) }}</span>
        </div>
        <button
          type="submit"
          :disabled="isSubmitting || !selectedCustomerId || cartItems.length === 0"
          class="flex max-w-[200px] flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-extrabold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi' }}</span>
        </button>
      </div>

      <!-- Desktop Layout -->
      <div class="hidden space-y-6 md:block">
        <!-- 1. Data Customer (Kepala Dokumen) -->
        <ComponentCard title="Data Customer" desc="Pilih customer untuk transaksi ini">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nama Customer
              </label>
              <!-- Pilihan customer yang sudah dipilih -->
              <div v-if="selectedCustomer" class="flex items-center gap-3 rounded-lg border border-brand-500 bg-brand-50/50 p-3 dark:bg-brand-500/10">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {{ selectedCustomer.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedCustomer.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    <span v-if="selectedCustomer.store_name">{{ selectedCustomer.store_name }} · </span>
                    {{ selectedCustomer.kecamatan || '-' }}
                  </p>
                </div>
                <button
                  type="button"
                  @click="selectedCustomerId = ''"
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-error-600 dark:hover:bg-white/[0.03] dark:hover:text-error-500"
                  title="Hapus pilihan"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                @click="showCustomerPicker = true"
                class="h-11 w-full rounded-lg border border-dashed border-gray-300 bg-transparent px-4 py-2.5 text-left text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500 dark:hover:text-brand-400"
              >
                <span v-if="!selectedCustomer">+ Pilih Customer dari Daftar</span>
                <span v-else>Ganti Customer</span>
              </button>

              <p v-if="!selectedCustomerId" class="mt-1.5 text-xs text-error-500 dark:text-error-400">
                Customer harus dipilih dari daftar yang tersedia
              </p>
              <p v-if="customersStore.customers.length === 0" class="mt-1.5 text-xs text-warning-600 dark:text-warning-400">
                Belum ada customer. <button type="button" @click="showCustomerPicker = false; router.push('/customers/add')" class="underline hover:no-underline">Tambah customer baru</button>
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Tanggal Transaksi
              </label>
              <input
                type="datetime-local"
                v-model="transactionDate"
                class="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </ComponentCard>

        <!-- 2. Rincian Item (Dokumen Penjualan) -->
        <ComponentCard title="Rincian Item" :desc="`${cartItems.length} item dalam transaksi`">
          <div class="mb-4 flex items-center justify-between">
            <p v-if="cartItems.length === 0" class="hidden text-sm text-gray-500 dark:text-gray-400 md:block">
              Belum ada item, tambahkan produk di bawah ini.
            </p>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              Total item: {{ cartItems.length }}
            </p>
            <div class="flex items-center gap-2">
              <button
                v-if="selectedCustomerId"
                type="button"
                @click="showReturnPicker = true"
                class="inline-flex items-center gap-2 rounded-lg border border-error-500 bg-transparent px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-400 dark:hover:bg-error-500/15"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Klaim Retur
              </button>
              <button
                type="button"
                @click="showProductPicker = true"
                class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Produk
              </button>
            </div>
          </div>

          <!-- Table - Desktop -->
          <div v-if="cartItems.length > 0" class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="w-12 px-4 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">No</th>
                  <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Produk</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Jumlah</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Harga</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Subtotal</th>
                  <th class="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in cartItems"
                  :key="item.product_id"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ index + 1 }}</td>
                  <td class="px-4 py-3">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Stok: {{ item.stock }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center">
                      <input
                        type="text"
                        inputmode="numeric"
                        autocomplete="off"
                        :value="getQtyDisplay(item)"
                        @input="updateQuantity(item, ($event.target as HTMLInputElement).value)"
                        @blur="() => validateQuantity(item)"
                        class="w-16 rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-center text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-1">
                      <span class="text-xs text-gray-400 dark:text-gray-600">Rp</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        :value="formatNumber(item.price)"
                        @input="updatePrice(item, ($event.target as HTMLInputElement).value)"
                        class="w-24 rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-right text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(item.subtotal) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      @click="removeFromCart(item.product_id)"
                      class="text-error-600 hover:text-error-500 dark:text-error-500"
                      title="Hapus"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile: stacked items -->
          <div v-else-if="cartItems.length === 0" class="rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Keranjang masih kosong. Klik "Tambah Produk" untuk mulai.
            </p>
          </div>

          <!-- Return Items Summary -->
          <div v-if="returnItems.length > 0" class="mt-4 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-semibold text-error-700 dark:text-error-400">
                <span class="inline-flex items-center gap-1.5">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Item Retur ({{ returnItems.length }})
                </span>
              </h4>
              <button
                type="button"
                @click="returnItems = []"
                class="text-xs font-medium text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
              >
                Hapus Semua
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="item in returnItems"
                :key="`${item.transaction_id}_${item.product_id}`"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-error-700 dark:text-error-300">
                  {{ item.product_name }} × {{ item.quantity }}
                  <span class="text-xs text-error-500 dark:text-error-400">
                    ({{ item.transaction_number }})
                  </span>
                </span>
                <span class="font-medium text-error-600 dark:text-error-400">
                  - {{ formatCurrency(item.subtotal) }}
                </span>
              </div>
            </div>
          </div>
        </ComponentCard>

        <!-- 3. Ringkasan & Pembayaran -->
        <ComponentCard title="Ringkasan & Pembayaran">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Summary -->
            <div class="space-y-4">
              <div class="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(subtotal) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Diskon</span>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-400 dark:text-gray-600">Rp</span>
                    <input
                      v-model="discountInput"
                      type="text"
                      inputmode="numeric"
                      placeholder="0"
                      class="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-right text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div v-if="totalReturnAmount > 0" class="flex justify-between text-sm">
                  <span class="text-error-600 dark:text-error-400">Potongan Retur</span>
                  <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(totalReturnAmount) }}</span>
                </div>
                <div class="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Bersih</span>
                  <span class="text-lg font-bold text-brand-600 dark:text-brand-400">{{ formatCurrency(netTotal) }}</span>
                </div>
              </div>

            </div>

            <!-- Payment details -->
            <div class="space-y-4">
              <!-- Payment Button / Summary -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Pembayaran
                </label>

                <!-- Belum ada pembayaran -->
                <div v-if="!payment" class="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
                  <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    Belum ada pembayaran. Bisa dibayar lunas atau dicicil.
                  </p>
                  <button
                    type="button"
                    @click="showPaymentModal = true"
                    class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Pembayaran
                  </button>
                </div>

                <!-- Pembayaran sudah dicatat -->
                <div v-else class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                  <div class="flex items-center justify-between">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ formatCurrency(payment.amount) }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatPaymentMethod(payment.payment_method) }}
                        <span v-if="payment.notes"> · {{ payment.notes }}</span>
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        @click="showPaymentModal = true"
                        class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        @click="payment = null"
                        class="rounded-lg border border-error-500 bg-transparent px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p v-if="payment.amount < total" class="mt-2 text-xs text-warning-600 dark:text-warning-500">
                    Pembayaran sebagian — sisa cicilan: {{ formatCurrency(total - payment.amount) }}
                  </p>
                  <p v-else-if="payment.amount > total" class="mt-2 text-xs text-success-600 dark:text-success-400">
                    Kembalian: {{ formatCurrency(payment.amount - total) }}
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Catatan
                </label>
                <textarea
                  v-model="notes"
                  rows="3"
                  placeholder="Catatan transaksi (opsional)"
                  class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                ></textarea>
              </div>

              <button
                type="submit"
                :disabled="isSubmitting || !selectedCustomerId || cartItems.length === 0"
                class="w-full rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi' }}
              </button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </form>

    <!-- Product Picker Modal -->
    <ProductPickerModal
      v-model="showProductPicker"
      :products="productsStore.products"
      @add="handleAddProduct"
    />

    <!-- Payment Modal -->
    <PaymentModal
      v-model="showPaymentModal"
      :transaction-number="'Transaksi Baru'"
      :remaining="netTotal"
      @submit="handlePaymentSubmit"
    />

    <!-- Customer Picker Modal -->
    <CustomerPickerModal
      v-model="showCustomerPicker"
      :customers="customersStore.customers"
      :selected-id="selectedCustomerId"
      @update:selected-id="selectedCustomerId = $event"
    />

    <!-- Return Picker Modal -->
    <ReturnPickerModal
      v-model="showReturnPicker"
      :customer-id="selectedCustomerId"
      @confirm="handleReturnConfirm"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ProductPickerModal from '@/components/common/ProductPickerModal.vue'
import PaymentModal from '@/components/common/PaymentModal.vue'
import CustomerPickerModal from '@/components/common/CustomerPickerModal.vue'
import ReturnPickerModal from '@/components/common/ReturnPickerModal.vue'
import { useProductsStore } from '@/stores/products'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useReturnsStore } from '@/stores/returns'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const returnsStore = useReturnsStore()
const toast = useToast()

const selectedCustomerId = ref((route.query.customer as string) || '')
const discountInput = ref('')
const notes = ref('')
const isSubmitting = ref(false)
const showProductPicker = ref(false)
const showPaymentModal = ref(false)
const showCustomerPicker = ref(false)
const showReturnPicker = ref(false)

// Format datetime-local value dari Date (YYYY-MM-DDTHH:mm)
const formatDateTimeLocal = (date: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const transactionDate = ref(formatDateTimeLocal(new Date()))

const selectedCustomer = computed(() =>
  customersStore.customers.find((c) => c.id === selectedCustomerId.value) || null
)

interface ReturnSelection {
  transaction_id: string
  transaction_number: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

const returnItems = ref<ReturnSelection[]>([])

const totalReturnAmount = computed(() =>
  returnItems.value.reduce((sum, item) => sum + item.subtotal, 0)
)

const netTotal = computed(() =>
  Math.max(subtotal.value - discount.value - totalReturnAmount.value, 0)
)

interface Payment {
  amount: number
  payment_method: string
  notes?: string
}

const payment = ref<Payment | null>(null)

interface CartItem {
  product_id: string
  name: string
  price: number
  stock: number
  quantity: number
  subtotal: number
}

const cartItems = reactive<CartItem[]>([])

const subtotal = computed(() =>
  cartItems.reduce((sum, item) => sum + item.subtotal, 0)
)

const discount = computed(() => {
  return parseInt(discountInput.value.replace(/\D/g, '')) || 0
})

const total = computed(() => Math.max(subtotal.value - discount.value, 0))

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatNumber = (value: number) =>
  (value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const parseNumber = (value: string) => parseInt(value.replace(/\D/g, '')) || 0

const updatePrice = (item: CartItem, rawValue: string) => {
  item.price = parseNumber(rawValue)
  item.subtotal = item.price * item.quantity
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatDateShort = (date: Date) =>
  date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const resetForm = () => {
  if (confirm('Reset data transaksi ini?')) {
    selectedCustomerId.value = ''
    cartItems.splice(0, cartItems.length)
    discountInput.value = ''
    notes.value = ''
    payment.value = null
    returnItems.value = []
    transactionDate.value = formatDateTimeLocal(new Date())
  }
}

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

const handlePaymentSubmit = (payload: {
  amount: number
  payment_method: string
  notes?: string
}) => {
  payment.value = { ...payload }
  toast.success('Berhasil!', 'Pembayaran dicatat')
  showPaymentModal.value = false
}

const handleReturnConfirm = (items: ReturnSelection[]) => {
  returnItems.value = items
  showReturnPicker.value = false
  if (items.length > 0) {
    toast.success('Retur Dipilih', `${items.length} item akan diretur (-${formatCurrency(totalReturnAmount.value)})`)
  }
}

// ============================================================
// Quantity handlers — pakai draft non-reaktif agar di Android
// WebView input tidak ter-override Vue re-render saat user
// mengetik multi-digit.
// ============================================================
const quantityDrafts = new Map<CartItem, string>()

const getQtyDisplay = (item: CartItem) => quantityDrafts.get(item) ?? item.quantity

const decrementQuantity = (item: CartItem) => {
  quantityDrafts.delete(item)
  item.quantity = Math.max(1, item.quantity - 1)
  item.subtotal = item.quantity * item.price
}

const incrementQuantity = (item: CartItem) => {
  quantityDrafts.delete(item)
  item.quantity = Math.min(item.stock, item.quantity + 1)
  item.subtotal = item.quantity * item.price
}

const updateQuantity = (item: CartItem, value: string) => {
  // Simpan draft mentah — jangan update item.quantity dulu
  if (value === '') {
    quantityDrafts.set(item, '')
    return
  }
  const filtered = value.replace(/\D/g, '')
  if (filtered === '') return
  quantityDrafts.set(item, filtered)
}

const validateQuantity = (item: CartItem) => {
  const draft = quantityDrafts.get(item)
  if (draft !== undefined) {
    quantityDrafts.delete(item)
    const parsed = parseInt(draft)
    if (!isNaN(parsed) && parsed > 0) {
      item.quantity = Math.min(parsed, item.stock)
    } else {
      item.quantity = 1
    }
  }
  // Ensure quantity is valid
  if (!item.quantity || item.quantity < 1) {
    item.quantity = 1
  } else if (item.quantity > item.stock) {
    item.quantity = item.stock
    toast.warning('Perhatian', `Stok maksimal: ${item.stock}`)
  }
  item.subtotal = item.quantity * item.price
}

const handleAddProduct = ({ products, quantity }: { products: any[]; quantity: number }) => {
  let addedCount = 0
  products.forEach((product) => {
    const existing = cartItems.find((item) => item.product_id === product.id)
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, existing.stock)
      existing.quantity = newQty
      existing.subtotal = newQty * existing.price
    } else {
      cartItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price_sell,
        stock: product.stock,
        quantity: Math.min(quantity, product.stock),
        subtotal: product.price_sell * Math.min(quantity, product.stock),
      })
    }
    addedCount += 1
  })
  toast.success('Ditambahkan', `${addedCount} produk masuk keranjang`)
}

const removeFromCart = (productId: string) => {
  const index = cartItems.findIndex((i) => i.product_id === productId)
  if (index !== -1) cartItems.splice(index, 1)
}

const handleSubmit = async () => {
  if (isSubmitting.value) return

  if (!selectedCustomerId.value) {
    toast.error('Gagal!', 'Customer harus dipilih dari daftar yang tersedia')
    return
  }

  if (cartItems.length === 0) {
    toast.error('Gagal!', 'Belum ada produk di keranjang')
    return
  }

  isSubmitting.value = true
  try {
    const selectedCustomer = customersStore.customers.find(
      (c) => c.id === selectedCustomerId.value
    )

    const transactionId = await transactionsStore.createTransaction({
      customer_id: selectedCustomer?.id || undefined,
      customer_name: selectedCustomer?.name,
      payment_method: payment.value?.payment_method || 'tunai',
      paid_amount: payment.value?.amount || 0,
      discount: discount.value,
      return_amount: totalReturnAmount.value,
      notes: notes.value.trim() || undefined,
      transaction_date: new Date(transactionDate.value).toISOString(),
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      })),
    })

    // Process returns if any
    if (returnItems.value.length > 0) {
      // Group returns by transaction_id
      const returnsByTx = new Map<string, { product_id: string; quantity: number }[]>()
      returnItems.value.forEach((item) => {
        if (!returnsByTx.has(item.transaction_id)) {
          returnsByTx.set(item.transaction_id, [])
        }
        returnsByTx.get(item.transaction_id)!.push({
          product_id: item.product_id,
          quantity: item.quantity,
        })
      })

      // Create returns for each transaction
      for (const [txId, items] of returnsByTx) {
        await returnsStore.createReturn(txId, items, `Retur gabungan dengan transaksi baru`)
      }
    }

    toast.success('Berhasil!', 'Transaksi berhasil disimpan')
    router.push(`/transactions/${transactionId}`)
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    toast.error('Gagal!', error.message || 'Gagal menyimpan transaksi')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      productsStore.fetchProducts(),
      customersStore.fetchCustomers(),
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    toast.error('Gagal!', 'Gagal memuat data produk/customer')
  }
})
</script>
