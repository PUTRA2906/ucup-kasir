<template>
  <div class="space-y-4">
    <!-- Search dan Actions -->
    <div v-if="searchable || $slots.actions" class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div v-if="searchable" class="relative max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
        />
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Desktop Table View -->
    <div class="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block dark:border-gray-800 dark:bg-white/[0.03]">
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
                <div class="flex items-center gap-2">
                  <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                    {{ column.label }}
                  </p>
                  <span v-if="column.sortable && sortKey === column.key" class="text-gray-400">
                    {{ sortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </div>
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
    </div>

    <!-- Mobile Card View -->
    <div class="md:hidden space-y-3">
      <!-- Mobile Column Header -->
      <div class="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3 flex-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {{ columns[0]?.label }}
          </span>
        </div>
      </div>

      <div
        v-if="paginatedData.length === 0"
        class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-gray-500 text-theme-sm dark:text-gray-400">
          {{ emptyText }}
        </p>
      </div>

      <div
        v-for="(row, index) in paginatedData"
        :key="index"
        class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <!-- Card Header - Always Visible (Only First Column) -->
        <div
          class="flex items-center p-4"
          :class="expandedRows.has(index) ? 'border-b border-gray-200 dark:border-gray-700' : ''"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="flex-1 min-w-0">
              <slot
                :name="`mobile-summary`"
                :row="row"
                :columns="columns"
              >
                <!-- Default: Show only first column -->
                <div class="font-medium text-gray-900 truncate dark:text-white">
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
            class="ml-3 text-gray-400 flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800"
            @click="toggleMobileRow(index)"
          >
            <svg
              :class="['h-5 w-5 transition-transform', expandedRows.has(index) ? 'rotate-180' : '']"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <!-- Card Details - Expandable -->
        <transition
          @enter="startMobileTransition"
          @after-enter="endMobileTransition"
          @before-leave="startMobileTransition"
          @after-leave="endMobileTransition"
        >
          <div v-show="expandedRows.has(index)">
            <div class="bg-gray-50 p-4 space-y-3 dark:bg-gray-900/50">
              <!-- Show all columns starting from second -->
              <div
                v-for="column in columns.slice(1)"
                :key="column.key"
                class="flex justify-between items-start gap-4"
              >
                <span class="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                  {{ column.label }}
                </span>
                <span class="text-sm text-gray-900 text-right dark:text-white">
                  <slot
                    :name="`cell-${column.key}`"
                    :row="row"
                    :value="getNestedValue(row, column.key)"
                  >
                    {{ formatValue(getNestedValue(row, column.key), column.format) }}
                  </slot>
                </span>
              </div>

              <!-- Row Actions in Mobile -->
              <div v-if="$slots.rowActions" class="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
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
        <div class="text-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ startIndex + 1 }} - {{ Math.min(endIndex, filteredData.length) }} dari
          {{ filteredData.length }} data
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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
}

const props = withDefaults(defineProps<DataTableProps>(), {
  searchable: true,
  searchPlaceholder: 'Cari...',
  paginated: true,
  perPage: 10,
  emptyText: 'Tidak ada data',
})

const searchQuery = ref('')
const sortKey = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const expandedRows = ref(new Set<number>())

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
      }).format(value)
    case 'number':
      return new Intl.NumberFormat('id-ID').format(value)
    default:
      return value
  }
}

const filteredData = computed(() => {
  let result = [...props.data]

  if (props.searchable && searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
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
  return Math.ceil(filteredData.value.length / props.perPage)
})

const startIndex = computed(() => {
  if (!props.paginated) return 0
  return (currentPage.value - 1) * props.perPage
})

const endIndex = computed(() => {
  if (!props.paginated) return filteredData.value.length
  return startIndex.value + props.perPage
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

const toggleMobileRow = (index: number) => {
  if (expandedRows.value.has(index)) {
    expandedRows.value.delete(index)
  } else {
    expandedRows.value.add(index)
  }
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

watch(searchQuery, () => {
  currentPage.value = 1
  expandedRows.value.clear()
})

watch(() => props.data, () => {
  currentPage.value = 1
  expandedRows.value.clear()
})
</script>
