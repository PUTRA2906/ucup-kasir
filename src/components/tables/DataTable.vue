<template>
  <div class="space-y-4">
    <!-- Mobile Header -->
    <div v-if="title" class="md:hidden">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ subtitle }}</p>
    </div>

    <!-- Desktop Header -->
    <div v-if="title || showImportButton || showExportButton || $slots.actions" class="hidden md:flex items-start justify-between">
      <div v-if="title">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Custom actions slot (mis. tombol hapus untuk item terpilih) -->
        <slot name="actions"></slot>
        <button
          v-if="showImportButton"
          @click="$emit('import-click')"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Impor Data
        </button>
        <button
          v-if="showExportButton"
          @click="$emit('export-click')"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Ekspor Data
        </button>
        <button
          v-if="showAddButton"
          @click="$emit('add-click')"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ addButtonText }}
        </button>
      </div>
    </div>

    <!-- Desktop Search and Filters -->
    <div v-if="categoryOptions.length > 0 || statusFilterButtons.length > 0" class="hidden md:block space-y-4">
      <div class="flex items-center gap-4">
        <!-- Search Bar -->
        <div v-if="searchable" class="relative w-72">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="internalSearchQuery"
            type="text"
            :placeholder="searchPlaceholder"
            class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        <!-- Category Filter -->
        <div v-if="categoryOptions.length > 0" class="relative w-72">
          <select
            v-model="selectedCategory"
            @change="$emit('category-change', selectedCategory)"
            class="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-700 dark:text-gray-400">
            <svg class="stroke-current" width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </div>

        <!-- Status Filter Buttons -->
        <div v-if="statusFilterButtons.length > 0" class="flex items-center gap-2 ml-auto">
          <button
            v-for="button in statusFilterButtons"
            :key="button.value"
            @click="selectedStatusFilter = button.value; $emit('status-filter-change', button.value)"
            :class="[
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              selectedStatusFilter === button.value
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
            ]"
          >
            {{ button.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Custom Header Actions -->
    <div v-if="searchable || showFilter || showAddButton || $slots.actions" class="md:hidden space-y-4">
      <!-- Search Bar -->
      <div v-if="searchable" class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="internalSearchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
      </div>

      <!-- Action Buttons -->
      <div v-if="showFilter || showAddButton" class="flex items-center gap-2">
        <button
          v-if="showFilter"
          @click="emit('filter-click')"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>
        <button
          v-if="showAddButton"
          @click="$emit('add-click')"
          class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ addButtonText }}
        </button>
      </div>

      <!-- Custom Actions Slot (mis. tombol hapus untuk item terpilih) -->
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Desktop Table View -->
    <div class="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="max-w-full overflow-x-auto custom-scrollbar">
        <table class="min-w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th
                v-for="column in columns"
                :key="column.key"
                :class="[
                  'px-5 py-3 text-left sm:px-6',
                  column.width || '',
                  column.sortable ? 'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.03]' : '',
                ]"
                @click="column.sortable ? handleSort(column.key) : null"
              >
                <slot :name="`header-${column.key}`" :column="column">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                      {{ column.label }}
                    </p>
                    <span v-if="column.sortable && sortKey === column.key" class="text-gray-400">
                      {{ sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </slot>
              </th>
              <th v-if="$slots.rowActions" class="px-5 py-3 text-left sm:px-6">
                <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Actions</p>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-if="paginatedData.length === 0"
              class="border-t border-gray-100 dark:border-gray-800"
            >
              <td :colspan="columns.length + ($slots.rowActions ? 1 : 0)" class="px-5 py-8 text-center sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">
                  {{ emptyText }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(row, index) in paginatedData"
              :key="index"
              class="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                class="px-5 py-4 sm:px-6"
              >
                <slot
                  :name="`cell-${column.key}`"
                  :row="row"
                  :value="getNestedValue(row, column.key)"
                >
                  <component
                    v-if="column.component"
                    :is="column.component"
                    :value="getNestedValue(row, column.key)"
                    :row="row"
                  />
                  <p v-else class="text-gray-800 text-theme-sm dark:text-white/90">
                    {{ formatValue(getNestedValue(row, column.key), column.format) }}
                  </p>
                </slot>
              </td>
              <td v-if="$slots.rowActions" class="px-5 py-4 sm:px-6">
                <slot name="rowActions" :row="row" :index="index"></slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Desktop Pagination -->
      <div
        v-if="paginated && totalPages > 1"
        class="flex items-center justify-between border-t border-gray-200 px-5 py-4 sm:px-6 dark:border-gray-700"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Tampilkan:</span>
          <select
            v-model="itemsPerPage"
            @change="changeItemsPerPage(itemsPerPage)"
            class="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
          <span>
            Menampilkan {{ startIndex + 1 }} - {{ Math.min(endIndex, filteredData.length) }} dari
            {{ filteredData.length }} data
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="currentPage = 1"
            :disabled="currentPage === 1"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            ««
          </button>
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            «
          </button>
          <span class="px-3 py-2 text-sm text-gray-700 dark:text-gray-400">
            Halaman {{ currentPage }} dari {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            »
          </button>
          <button
            @click="currentPage = totalPages"
            :disabled="currentPage === totalPages"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            »»
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden">
      <!-- Mobile Column Header -->
      <div class="flex items-center px-4 py-3 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
        <div class="flex items-center gap-3 flex-1">
          <slot name="mobile-header" :column="columns[0]">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {{ columns[0]?.label }}
            </span>
          </slot>
        </div>
      </div>

      <div
        v-if="paginatedData.length === 0"
        class="border-b border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-transparent"
      >
        <p class="text-gray-500 text-theme-sm dark:text-gray-400">
          {{ emptyText }}
        </p>
      </div>

      <div
        v-for="(row, index) in paginatedData"
        :key="index"
        class="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-transparent relative"
      >
        <!-- Card Header - Always Visible (Only First Column) -->
        <div
          class="flex items-center py-3"
          @click="togglePopup(index, $event)"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0 px-4">
            <div class="flex-1 min-w-0">
              <slot
                :name="`mobile-summary`"
                :row="row"
                :columns="columns"
              >
                <!-- Default: Show only first column -->
                <div class="text-sm font-medium text-gray-900 truncate dark:text-white">
                  <slot
                    :name="`cell-${columns[0]?.key}`"
                    :row="row"
                    :value="getNestedValue(row, columns[0]?.key)"
                  >
                    {{ formatValue(getNestedValue(row, columns[0]?.key), columns[0]?.format) }}
                  </slot>
                </div>
              </slot>
            </div>
          </div>
          <button
            class="mr-4 text-gray-400 flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800"
            @click.stop="toggleMobileRow(index)"
          >
            <svg
              :class="['h-4 w-4 transition-transform', expandedRows.has(index) ? 'rotate-180' : '']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <!-- Popup Menu -->
        <div
          v-if="activePopup === index"
          class="absolute right-4 top-12 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
          @click.stop
        >
          <div class="py-1">
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="$emit('menu-action', { action: 'detail', row }); closePopup()"
            >
              Detail
            </button>
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="$emit('menu-action', { action: 'edit', row }); closePopup()"
            >
              Ubah
            </button>
            <button
              class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="$emit('menu-action', { action: 'outlet', row }); closePopup()"
            >
              Atur Per Outlet
            </button>
            <button
              class="w-full px-4 py-2 text-left text-sm text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
              @click="$emit('menu-action', { action: 'delete', row }); closePopup()"
            >
              Hapus
            </button>
          </div>
        </div>

        <!-- Card Details - Expandable -->
        <transition
          @enter="startMobileTransition"
          @after-enter="endMobileTransition"
          @before-leave="startMobileTransition"
          @after-leave="endMobileTransition"
        >
          <div v-show="expandedRows.has(index)">
            <div class="bg-gray-50 dark:bg-gray-900/50">
              <!-- Show all columns starting from third (skip checkbox and name) -->
              <div
                v-for="column in columns.slice(2)"
                :key="column.key"
                class="flex justify-between items-center gap-4 py-3 border-b border-gray-200 dark:border-gray-700"
                style="padding-left: calc(1rem + 1rem + 0.75rem); padding-right: 1rem;"
              >
                <span class="text-xs font-medium text-gray-500 uppercase dark:text-gray-400 flex-shrink-0">
                  {{ column.label }}
                </span>
                <div class="flex flex-1 items-center justify-end text-sm text-gray-900 dark:text-white">
                  <slot
                    :name="`cell-${column.key}`"
                    :row="row"
                    :value="getNestedValue(row, column.key)"
                  >
                    {{ formatValue(getNestedValue(row, column.key), column.format) }}
                  </slot>
                </div>
              </div>

              <!-- Row Actions in Mobile -->
              <div v-if="$slots.rowActions" class="flex gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <slot name="rowActions" :row="row" :index="index"></slot>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Pagination -->
      <div
        v-if="paginated && totalPages > 1"
        class="flex flex-col gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700"
      >
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Tampilkan:</span>
          <select
            v-model="itemsPerPage"
            @change="changeItemsPerPage(itemsPerPage)"
            class="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>
          <span class="hidden sm:inline">
            Menampilkan {{ startIndex + 1 }} - {{ Math.min(endIndex, filteredData.length) }} dari
            {{ filteredData.length }} data
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="currentPage = 1"
            :disabled="currentPage === 1"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            ««
          </button>
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            «
          </button>
          <span class="px-3 py-2 text-sm text-gray-700 dark:text-gray-400">
            Halaman {{ currentPage }} dari {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            »
          </button>
          <button
            @click="currentPage = totalPages"
            :disabled="currentPage === totalPages"
            class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            »»
          </button>
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <FilterModal
      :is-open="showFilterModal"
      v-model="filterValues"
      :category-options="filterCategoryOptions"
      @close="showFilterModal = false"
      @apply="emit('apply-filter', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import FilterModal from '@/components/common/FilterModal.vue'

const emit = defineEmits(['menu-action', 'add-click', 'filter-click', 'import-click', 'export-click', 'category-change', 'status-filter-change', 'apply-filter'])

interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  format?: 'date' | 'currency' | 'number' | ((value: any) => string)
  component?: any
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  searchable?: boolean
  searchPlaceholder?: string
  paginated?: boolean
  perPage?: number
  emptyText?: string
  externalSearch?: string
  showFilter?: boolean
  showAddButton?: boolean
  addButtonText?: string
  // Desktop specific props
  title?: string
  subtitle?: string
  showImportButton?: boolean
  showExportButton?: boolean
  categoryOptions?: { value: string; label: string }[]
  statusFilterButtons?: { value: string; label: string }[]
}

const props = withDefaults(defineProps<DataTableProps>(), {
  searchable: true,
  searchPlaceholder: 'Cari...',
  paginated: true,
  perPage: 10,
  emptyText: 'Tidak ada data',
  externalSearch: '',
  showFilter: false,
  showAddButton: false,
  addButtonText: 'Tambah',
  title: '',
  subtitle: '',
  showImportButton: false,
  showExportButton: false,
  categoryOptions: () => [],
  statusFilterButtons: () => [],
})

const sortKey = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const expandedRows = ref(new Set<number>())
const activePopup = ref<number | null>(null)
const itemsPerPage = ref(props.perPage)
const showFilterModal = ref(false)
const filterValues = ref({ category: '', status: '', stock: '' })

// Opsi kategori untuk FilterModal (tanpa opsi "Semua Kategori" yang kosong)
const filterCategoryOptions = computed(() =>
  props.categoryOptions.filter((o) => o.value !== '')
)
const internalSearchQuery = ref('')
const selectedCategory = ref('')
const selectedStatusFilter = ref('')

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj)
}

const formatValue = (value: any, format?: Column['format']) => {
  if (value === null || value === undefined) return '-'

  if (!format) return value

  if (typeof format === 'function') {
    return format(value)
  }

  switch (format) {
    case 'date':
      return new Date(value).toLocaleDateString('id-ID')
    case 'currency':
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case 'number':
      return new Intl.NumberFormat('id-ID').format(value)
    default:
      return value
  }
}

const filteredData = computed(() => {
  let result = [...props.data]

  // Gunakan externalSearch jika ada, jika tidak gunakan internalSearchQuery
  const activeQuery = props.externalSearch || internalSearchQuery.value

  if (activeQuery) {
    const query = activeQuery.toLowerCase()
    result = result.filter((row) => {
      return props.columns.some((column) => {
        const value = getNestedValue(row, column.key)
        return String(value).toLowerCase().includes(query)
      })
    })
  }

  if (sortKey.value) {
    result.sort((a, b) => {
      const aVal = getNestedValue(a, sortKey.value)
      const bVal = getNestedValue(b, sortKey.value)

      if (aVal === bVal) return 0

      const comparison = aVal > bVal ? 1 : -1
      return sortOrder.value === 'asc' ? comparison : -comparison
    })
  }

  return result
})

const totalPages = computed(() => {
  if (!props.paginated) return 1
  return Math.ceil(filteredData.value.length / itemsPerPage.value)
})

const startIndex = computed(() => {
  if (!props.paginated) return 0
  return (currentPage.value - 1) * itemsPerPage.value
})

const endIndex = computed(() => {
  if (!props.paginated) return filteredData.value.length
  return startIndex.value + itemsPerPage.value
})

const paginatedData = computed(() => {
  if (!props.paginated) return filteredData.value
  return filteredData.value.slice(startIndex.value, endIndex.value)
})

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

const changeItemsPerPage = (value: number) => {
  itemsPerPage.value = value
  currentPage.value = 1
}

const toggleMobileRow = (index: number) => {
  if (expandedRows.value.has(index)) {
    expandedRows.value.delete(index)
  } else {
    expandedRows.value.add(index)
  }
}

const togglePopup = (index: number, event: Event) => {
  event.stopPropagation()
  if (activePopup.value === index) {
    activePopup.value = null
  } else {
    activePopup.value = index
  }
}

const closePopup = () => {
  activePopup.value = null
}

const startMobileTransition = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = 'auto'
  const height = htmlEl.scrollHeight
  htmlEl.style.height = '0px'
  htmlEl.offsetHeight // force reflow
  htmlEl.style.height = height + 'px'
}

const endMobileTransition = (el: Element) => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
}

watch(internalSearchQuery, () => {
  currentPage.value = 1
  expandedRows.value.clear()
})

watch(() => props.data, () => {
  currentPage.value = 1
  expandedRows.value.clear()
})

onMounted(() => {
  document.addEventListener('click', closePopup)
})

onUnmounted(() => {
  document.removeEventListener('click', closePopup)
})
</script>
