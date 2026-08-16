import { ref, computed, type Ref } from 'vue'
import type { Column } from '../components/tables/types'

export interface UseDataTableOptions {
  data: Ref<any[]>
  columns: Column[]
  searchKeys?: string[]
  defaultSortKey?: string
  defaultSortOrder?: 'asc' | 'desc'
  defaultPerPage?: number
}

export function useDataTable(options: UseDataTableOptions) {
  const searchQuery = ref('')
  const sortKey = ref(options.defaultSortKey || '')
  const sortOrder = ref<'asc' | 'desc'>(options.defaultSortOrder || 'asc')
  const currentPage = ref(1)
  const perPage = ref(options.defaultPerPage || 10)

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj)
  }

  const filteredData = computed(() => {
    let result = [...options.data.value]

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter((row) => {
        const keysToSearch = options.searchKeys || options.columns.map((col) => col.key)
        return keysToSearch.some((key) => {
          const value = getNestedValue(row, key)
          return String(value).toLowerCase().includes(query)
        })
      })
    }

    // Sort
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
    return Math.ceil(filteredData.value.length / perPage.value)
  })

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * perPage.value
    const end = start + perPage.value
    return filteredData.value.slice(start, end)
  })

  const handleSort = (key: string) => {
    if (sortKey.value === key) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortKey.value = key
      sortOrder.value = 'asc'
    }
  }

  const resetFilters = () => {
    searchQuery.value = ''
    sortKey.value = options.defaultSortKey || ''
    sortOrder.value = options.defaultSortOrder || 'asc'
    currentPage.value = 1
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  const nextPage = () => {
    goToPage(currentPage.value + 1)
  }

  const prevPage = () => {
    goToPage(currentPage.value - 1)
  }

  return {
    // State
    searchQuery,
    sortKey,
    sortOrder,
    currentPage,
    perPage,

    // Computed
    filteredData,
    paginatedData,
    totalPages,

    // Methods
    handleSort,
    resetFilters,
    goToPage,
    nextPage,
    prevPage,
  }
}
