<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Customer" class="hidden md:block" />
    <div class="space-y-6">
      <!-- Mobile Header -->
      <MobilePageHeader title="Daftar Customer" :subtitle="customersStore.customers.length + ' Customer'" back-to="/">
        <template #actions>
          <button
            @click="addCustomer"
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-500 bg-brand-500 text-white transition hover:bg-brand-600 active:scale-95"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </template>
      </MobilePageHeader>

      <!-- Mobile View: Search & Cards -->
      <div class="space-y-4 md:hidden">
        <!-- Search Bar & Filter -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari customer..."
              class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
            <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            @click="showFilterModal = true"
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-brand-500 bg-white text-brand-500 transition hover:bg-brand-50 active:scale-95 dark:bg-gray-900 dark:hover:bg-brand-500/10"
            :class="{ 'bg-brand-50 dark:bg-brand-500/10': hasActiveFilter }"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        <!-- Active Filter Indicator -->
        <div v-if="hasActiveFilter" class="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-2 dark:bg-brand-500/10">
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="text-xs font-medium text-brand-700 dark:text-brand-300">
              Filter: {{ activeFilterLabel }}
            </span>
          </div>
          <button
            @click="clearFilter"
            class="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Hapus
          </button>
        </div>

        <!-- Customer Cards -->
        <div v-if="paginatedCustomers.length === 0" class="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            {{ searchQuery ? 'Customer tidak ditemukan' : 'Belum ada customer' }}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ searchQuery ? 'Coba kata kunci lain' : 'Tambahkan customer pertama Anda' }}
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="customer in paginatedCustomers"
            :key="customer.id"
            @click="viewCustomer(customer)"
            class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.98] dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ customer.name }}
                </h3>
                <p v-if="customer.store_name" class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  {{ customer.store_name }}
                </p>
                
                <div class="mt-2 space-y-1">
                  <div v-if="customer.phone" class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg class="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>{{ customer.phone }}</span>
                  </div>
                  
                  <div v-if="customer.kecamatan" class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg class="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{{ customer.kecamatan }}</span>
                  </div>
                </div>
              </div>

              <button
                @click.stop="showCustomerMenu(customer, $event)"
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredCustomers.length > 0" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ paginationInfo }}
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              :class="[
                'flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95',
                currentPage === 1
                  ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              ]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              :class="[
                'flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95',
                currentPage === totalPages
                  ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              ]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop: DataTable -->
      <div class="hidden md:block">
        <DataTable
        :columns="columns"
        :data="customersStore.customers"
        :per-page="10"
        :searchable="true"
        :show-add-button="true"
        add-button-text="Tambah Customer"
        title="Daftar Customer"
        :subtitle="`${settingsStore.storeSubtitle} - ${customersStore.customers.length} Customer`"
        :show-import-button="true"
        :show-export-button="true"
        @add-click="addCustomer"
        @menu-action="handleMenuAction"
        @import-click="handleImport"
        @export-click="handleExport"
      >
        <template #header-checkbox>
          <div class="flex items-center gap-2">
            <input
              ref="selectAllCheckbox"
              type="checkbox"
              :checked="allSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </div>
        </template>

        <template #mobile-header>
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              :checked="allSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Nama Customer
            </span>
          </div>
        </template>

        <template #mobile-summary="{ row }">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              v-model="selectedCustomers"
              :value="row.id"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
              @click.stop
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-gray-900 truncate dark:text-white">{{ row.name }}</p>
              <p v-if="row.store_name" class="text-xs text-gray-500 truncate dark:text-gray-400">{{ row.store_name }}</p>
            </div>
          </div>
        </template>

        <template #cell-checkbox="{ row }">
          <input
            type="checkbox"
            v-model="selectedCustomers"
            :value="row.id"
            class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
        </template>

        <template #cell-store_name="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-phone="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-kecamatan="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-address="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #actions>
          <div v-if="selectedCustomers.length > 0" class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedCustomers.length }} dipilih
            </span>
            <button
              @click="bulkDelete"
              class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600"
            >
              Hapus
            </button>
          </div>
        </template>

        <template #rowActions="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="viewCustomer(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Detail"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </button>
            <button
              @click="editCustomer(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Edit"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="deleteCustomer(row)"
              class="rounded-lg p-2 text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
              title="Hapus"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </template>
      </DataTable>
      </div>

      <!-- Mobile Customer Menu Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showMobileMenu"
            class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
            @click.self="showMobileMenu = false"
          >
            <div class="w-full max-w-lg rounded-t-3xl bg-white p-6 dark:bg-gray-900">
              <div class="mb-4 text-center">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ selectedMobileCustomer?.name }}
                </h3>
                <p v-if="selectedMobileCustomer?.store_name" class="text-sm text-gray-500 dark:text-gray-400">
                  {{ selectedMobileCustomer.store_name }}
                </p>
              </div>

              <div class="space-y-2">
                <button
                  @click="viewCustomer(selectedMobileCustomer); showMobileMenu = false"
                  class="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Lihat Detail
                </button>

                <button
                  @click="editCustomer(selectedMobileCustomer); showMobileMenu = false"
                  class="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Customer
                </button>

                <button
                  @click="deleteCustomer(selectedMobileCustomer); showMobileMenu = false"
                  class="w-full flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-100 active:scale-95 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-500/20"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Hapus Customer
                </button>

                <button
                  @click="showMobileMenu = false"
                  class="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Filter Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showFilterModal"
            class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
            @click.self="showFilterModal = false"
          >
            <div class="w-full max-w-lg rounded-t-3xl bg-white p-6 dark:bg-gray-900">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Customer</h3>
                <button
                  @click="showFilterModal = false"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-4">
                <!-- Filter by Kecamatan -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kecamatan
                  </label>
                  <div class="space-y-2 max-h-60 overflow-y-auto">
                    <button
                      @click="selectedKecamatan = null; showFilterModal = false"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition active:scale-95',
                        selectedKecamatan === null
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      ]"
                    >
                      <div class="flex items-center justify-between">
                        <span>Semua Kecamatan</span>
                        <span v-if="selectedKecamatan === null" class="text-brand-600 dark:text-brand-400">✓</span>
                      </div>
                    </button>
                    <button
                      v-for="kec in availableKecamatans"
                      :key="kec"
                      @click="selectedKecamatan = kec; showFilterModal = false"
                      :class="[
                        'w-full rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition active:scale-95',
                        selectedKecamatan === kec
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      ]"
                    >
                      <div class="flex items-center justify-between">
                        <span>{{ kec }}</span>
                        <span v-if="selectedKecamatan === kec" class="text-brand-600 dark:text-brand-400">✓</span>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- Reset Button -->
                <button
                  v-if="hasActiveFilter"
                  @click="clearFilter; showFilterModal = false"
                  class="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Customer?"
      :message="`Apakah Anda yakin ingin menghapus customer '${customerToDelete?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showBulkDeleteDialog"
      title="Hapus Customer Terpilih?"
      :message="`Apakah Anda yakin ingin menghapus ${selectedCustomers.length} customer terpilih? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus Semua"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmBulkDelete"
    />

    <!-- Import CSV Modal -->
    <ImportCsvModal
      v-model="showImportModal"
      :accepted-hint="'.csv — kolom: Nama, Nama Toko, Telepon, Kecamatan, Alamat, Catatan'"
      @import="handleImportFile"
      @download-template="downloadImportTemplate"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ImportCsvModal from '@/components/common/ImportCsvModal.vue'
import { useCustomersStore } from '@/stores/customers'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import {
  downloadCsv,
  parseCsv,
  readFileAsText,
} from '@/composables/useCsv'
import type { CustomerInsert, Customer } from '@/types/database'

const router = useRouter()
const customersStore = useCustomersStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const selectedCustomers = ref<string[]>([])
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const showImportModal = ref(false)
const customerToDelete = ref<any>(null)
const searchQuery = ref('')
const showMobileMenu = ref(false)
const selectedMobileCustomer = ref<any>(null)

// Pagination & Filter
const currentPage = ref(1)
const itemsPerPage = ref(10)
const showFilterModal = ref(false)
const selectedKecamatan = ref<string | null>(null)

// Available Kecamatans (unique list)
const availableKecamatans = computed(() => {
  const kecamatans = customersStore.customers
    .map((c) => c.kecamatan)
    .filter((k) => k && k.trim() !== '') as string[]
  return Array.from(new Set(kecamatans)).sort()
})

// Filter logic
const filteredCustomers = computed(() => {
  let result = customersStore.customers

  // Filter by kecamatan
  if (selectedKecamatan.value) {
    result = result.filter((c) => c.kecamatan === selectedKecamatan.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.store_name && c.store_name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query)) ||
        (c.kecamatan && c.kecamatan.toLowerCase().includes(query))
    )
  }

  return result
})

// Pagination logic
const totalPages = computed(() => Math.ceil(filteredCustomers.value.length / itemsPerPage.value))

const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCustomers.value.slice(start, end)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredCustomers.value.length)
  return `${start}-${end} dari ${filteredCustomers.value.length}`
})

const hasActiveFilter = computed(() => selectedKecamatan.value !== null)

const activeFilterLabel = computed(() => {
  if (selectedKecamatan.value) return selectedKecamatan.value
  return ''
})

// Watch for filter changes to reset page
watchEffect(() => {
  if (searchQuery.value || selectedKecamatan.value) {
    currentPage.value = 1
  }
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const clearFilter = () => {
  selectedKecamatan.value = null
  currentPage.value = 1
}

const showCustomerMenu = (customer: any, event: Event) => {
  event.stopPropagation()
  selectedMobileCustomer.value = customer
  showMobileMenu.value = true
}

const allSelected = computed(() => {
  return customersStore.customers.length > 0 && selectedCustomers.value.length === customersStore.customers.length
})

const someSelected = computed(() => {
  return selectedCustomers.value.length > 0 && selectedCustomers.value.length < customersStore.customers.length
})

watchEffect(() => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = someSelected.value
  }
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedCustomers.value = []
  } else {
    selectedCustomers.value = customersStore.customers.map(c => c.id)
  }
}

const columns = [
  { key: 'checkbox', label: 'Pilih', width: 'w-1/12' },
  { key: 'name', label: 'NAMA CUSTOMER', sortable: true, width: 'w-2/12' },
  { key: 'store_name', label: 'NAMA TOKO', sortable: true, width: 'w-2/12' },
  { key: 'phone', label: 'TELEPON', sortable: true, width: 'w-2/12' },
  { key: 'kecamatan', label: 'KECAMATAN', sortable: true, width: 'w-2/12' },
  { key: 'address', label: 'ALAMAT', sortable: true, width: 'w-3/12' },
]

onMounted(async () => {
  try {
    await customersStore.fetchCustomers()
  } catch (error) {
    console.error('Error loading customers:', error)
    toast.info('Info', 'Gagal memuat data. Silakan refresh halaman.')
  }
})

const addCustomer = () => {
  router.push('/customers/add')
}

const viewCustomer = (customer: any) => {
  router.push(`/customers/${customer.id}`)
}

const editCustomer = (customer: any) => {
  router.push(`/customers/edit/${customer.id}`)
}

const deleteCustomer = async (customer: any) => {
  customerToDelete.value = customer
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!customerToDelete.value) return

  try {
    await customersStore.deleteCustomer(customerToDelete.value.id)
    toast.success('Berhasil!', 'Customer berhasil dihapus')
  } catch (error) {
    console.error('Error deleting customer:', error)
    toast.error('Gagal!', 'Gagal menghapus customer')
  } finally {
    customerToDelete.value = null
  }
}

const bulkDelete = () => {
  showBulkDeleteDialog.value = true
}

const confirmBulkDelete = async () => {
  const count = selectedCustomers.value.length
  try {
    await Promise.all(
      selectedCustomers.value.map(id => customersStore.deleteCustomer(id))
    )
    selectedCustomers.value = []
    toast.success('Berhasil!', `${count} customer berhasil dihapus`)
  } catch (error) {
    console.error('Error deleting customers:', error)
    toast.error('Gagal!', 'Gagal menghapus beberapa customer')
  }
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  switch (action) {
    case 'detail':
      viewCustomer(row)
      break
    case 'edit':
      editCustomer(row)
      break
    case 'delete':
      deleteCustomer(row)
      break
  }
}

const handleImport = () => {
  showImportModal.value = true
}

const handleExport = () => {
  exportCsv()
}

/* ============================================================
 * EXPORT CSV
 * ============================================================ */
const EXPORT_HEADERS = [
  'Nama Customer',
  'Nama Toko',
  'Telepon',
  'Kecamatan',
  'Alamat',
  'Catatan',
]

const exportCsv = () => {
  const rows = customersStore.customers.map((c) => [
    c.name,
    c.store_name || '',
    c.phone || '',
    c.kecamatan || '',
    c.address || '',
    c.notes || '',
  ])
  downloadCsv(`customer-${new Date().toISOString().slice(0, 10)}.csv`, [
    EXPORT_HEADERS,
    ...rows,
  ])
  toast.success('Berhasil!', `${rows.length} customer diekspor ke file CSV`)
}

/* ============================================================
 * TEMPLATE IMPORT CSV
 * ============================================================ */
const downloadImportTemplate = () => {
  downloadCsv('template-import-customer.csv', [
    EXPORT_HEADERS,
    ['Contoh Customer', 'Toko Contoh', '08123456789', 'Pasar Minggu', 'Jl. Contoh No.1', ''],
  ])
  toast.success('Berhasil!', 'Template CSV berhasil diunduh')
}

/* ============================================================
 * IMPORT CSV
 * ============================================================ */
const normalizeHeader = (h: string) =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '')

const findValue = (record: Record<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    if (record[alias] !== undefined) return record[alias]
  }
  return undefined
}

const handleImportFile = async (file: File, updateExisting: boolean) => {
  try {
    const text = await readFileAsText(file)
    const parsed = parseCsv(text)

    if (!parsed.headers || parsed.headers.length === 0) {
      throw new Error('File CSV kosong atau format tidak valid')
    }

    if (parsed.rows.length === 0) {
      throw new Error('Tidak ada data untuk diimpor')
    }

    const normalizedRecords = parsed.rows.map((row) => {
      const out: Record<string, string> = {}
      parsed.headers.forEach((header) => {
        const key = normalizeHeader(header)
        if (key) out[key] = row[header] ?? ''
      })
      return out
    })

    const nameKey = ['namacustomer', 'nama', 'name', 'customer']
    const storeKey = ['namatoko', 'toko', 'storename', 'store']
    const phoneKey = ['telepon', 'phone', 'nohp', 'no']
    const kecamatanKey = ['kecamatan', 'kec', 'district']
    const addressKey = ['alamat', 'address', 'addr']
    const notesKey = ['catatan', 'notes', 'keterangan', 'note']

    // Map untuk deteksi duplikat: phone & (name + store)
    const existingByPhone = new Map<string, Customer>()
    const existingByKey = new Map<string, Customer>()
    customersStore.customers.forEach((c) => {
      if (c.phone) existingByPhone.set(c.phone.toLowerCase(), c)
      const key = `${c.name.toLowerCase()}|${(c.store_name || '').toLowerCase()}`
      existingByKey.set(key, c)
    })

    const importable: CustomerInsert[] = []
    const updates: { id: string; data: CustomerInsert }[] = []
    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (let idx = 0; idx < normalizedRecords.length; idx++) {
      const row = normalizedRecords[idx]
      const rowNumber = idx + 2

      const name = (findValue(row, nameKey) ?? '').trim()
      if (!name) {
        skipped++
        continue
      }

      const phone = (findValue(row, phoneKey) ?? '').trim()
      const kecamatanValue = (findValue(row, kecamatanKey) ?? '').trim()

      // Debug logging
      if (idx === 0) {
        console.log('🔍 Debug Import CSV - Baris pertama:')
        console.log('Headers normalized:', Object.keys(row))
        console.log('Kecamatan keys mencari:', kecamatanKey)
        console.log('Nilai kecamatan ditemukan:', kecamatanValue)
      }

      const payload: CustomerInsert = {
        name,
        store_name: (findValue(row, storeKey) ?? '').trim() || undefined,
        phone: phone || undefined,
        kecamatan: kecamatanValue || undefined,
        address: (findValue(row, addressKey) ?? '').trim() || undefined,
        notes: (findValue(row, notesKey) ?? '').trim() || undefined,
      }

      // Deteksi duplikat: prioritas phone, lalu kombinasi name|store
      const phoneLower = phone ? phone.toLowerCase() : null
      const key = `${name.toLowerCase()}|${(payload.store_name || '').toLowerCase()}`

      let existing: Customer | undefined
      if (phoneLower && existingByPhone.has(phoneLower)) {
        existing = existingByPhone.get(phoneLower)
      } else if (existingByKey.has(key)) {
        existing = existingByKey.get(key)
      }

      if (existing && updateExisting) {
        updates.push({ id: existing.id, data: payload })
        if (phoneLower) existingByPhone.set(phoneLower, existing)
        existingByKey.set(key, existing)
      } else if (existing && !updateExisting) {
        skipped++
        errors.push(`Baris ${rowNumber}: customer "${name}" sudah ada, dilewati (update nonaktif)`)
      } else {
        importable.push(payload)
        if (phoneLower) {
          existingByPhone.set(phoneLower, payload as unknown as Customer)
        }
        existingByKey.set(key, payload as unknown as Customer)
      }
    }

    // Proses update
    for (const { id, data } of updates) {
      try {
        await customersStore.updateCustomer(id, data)
        updated++
      } catch (e: any) {
        errors.push(`Gagal update customer ${data.name}: ${e.message}`)
      }
    }

    // Proses insert (batch)
    if (importable.length > 0) {
      try {
        const createdBatch = await customersStore.createCustomers(importable)
        created += createdBatch.length
      } catch (e: any) {
        errors.push(`Gagal impor ${importable.length} customer baru: ${e.message}`)
      }
    }

    // Refresh data
    await customersStore.fetchCustomers()

    const summaryParts = [
      `${created} customer baru`,
      `${updated} diperbarui`,
      `${skipped} dilewati`,
    ]

    if (errors.length === 0) {
      toast.success('Berhasil!', `Import selesai: ${summaryParts.join(', ')}`)
    } else {
      toast.warning(
        'Selesai dengan catatan',
        `${summaryParts.join(', ')}. ${errors.length} masalah: ${errors[0]}`,
      )
    }

    showImportModal.value = false
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal mengimpor file CSV')
    showImportModal.value = false
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(100%);
}

.modal-enter-to > div,
.modal-leave-from > div {
  transform: translateY(0);
}
</style>
