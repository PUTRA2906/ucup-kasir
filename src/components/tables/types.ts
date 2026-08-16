export type ColumnFormat = 'date' | 'currency' | 'number' | ((value: any) => string)

export interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  format?: ColumnFormat | string
  component?: any
}

export interface DataTableProps {
  columns: Column[]
  data: any[]
  searchable?: boolean
  searchPlaceholder?: string
  paginated?: boolean
  perPage?: number
  emptyText?: string
}

export type SortOrder = 'asc' | 'desc'

export interface DataTableEmits {
  (e: 'row-click', row: any): void
  (e: 'sort', key: string, order: SortOrder): void
  (e: 'page-change', page: number): void
  (e: 'search', query: string): void
}
