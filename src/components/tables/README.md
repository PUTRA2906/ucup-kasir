# DataTable Component

Komponen DataTable yang dapat digunakan kembali dengan fitur lengkap seperti search, sorting, pagination, dan custom cell rendering.

## Fitur

- ✅ Search / Filter data
- ✅ Sortable columns
- ✅ Pagination
- ✅ Custom cell rendering dengan slots
- ✅ Row actions
- ✅ Header actions
- ✅ Format otomatis (currency, date, number)
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Empty state

## Instalasi

```vue
import DataTable from '@/components/tables/DataTable.vue'
```

## Props

| Prop | Type | Default | Deskripsi |
|------|------|---------|-----------|
| `columns` | `Column[]` | **required** | Konfigurasi kolom tabel |
| `data` | `any[]` | **required** | Data yang akan ditampilkan |
| `searchable` | `boolean` | `true` | Aktifkan fitur search |
| `searchPlaceholder` | `string` | `'Cari...'` | Placeholder untuk input search |
| `paginated` | `boolean` | `true` | Aktifkan pagination |
| `perPage` | `number` | `10` | Jumlah data per halaman |
| `emptyText` | `string` | `'Tidak ada data'` | Teks saat data kosong |

## Column Configuration

```typescript
interface Column {
  key: string                    // Key dari data object
  label: string                  // Label header kolom
  sortable?: boolean            // Kolom bisa di-sort
  width?: string                // Tailwind width class (e.g., 'w-3/12')
  format?: 'date' | 'currency' | 'number' | ((value: any) => string)
  component?: any               // Custom component untuk cell
}
```

## Slots

### `actions`
Slot untuk menambahkan tombol aksi di header table

```vue
<DataTable :columns="columns" :data="data">
  <template #actions>
    <button>Tambah Data</button>
  </template>
</DataTable>
```

### `cell-{key}`
Slot untuk custom rendering cell berdasarkan key kolom

```vue
<DataTable :columns="columns" :data="data">
  <template #cell-name="{ row, value }">
    <div class="flex items-center gap-2">
      <img :src="row.avatar" class="w-8 h-8 rounded-full" />
      <span>{{ value }}</span>
    </div>
  </template>
</DataTable>
```

### `rowActions`
Slot untuk menambahkan aksi pada setiap row

```vue
<DataTable :columns="columns" :data="data">
  <template #rowActions="{ row, index }">
    <button @click="edit(row)">Edit</button>
    <button @click="delete(row)">Delete</button>
  </template>
</DataTable>
```

## Contoh Penggunaan

### Basic Table

```vue
<script setup>
import DataTable from '@/components/tables/DataTable.vue'

const columns = [
  { key: 'name', label: 'Nama', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role' },
]

const data = [
  { name: 'Ahmad', email: 'ahmad@email.com', role: 'Admin' },
  { name: 'Siti', email: 'siti@email.com', role: 'User' },
]
</script>

<template>
  <DataTable :columns="columns" :data="data" />
</template>
```

### Table dengan Format

```vue
<script setup>
const columns = [
  { key: 'orderNumber', label: 'No. Order', sortable: true },
  { key: 'amount', label: 'Total', sortable: true, format: 'currency' },
  { key: 'quantity', label: 'Qty', format: 'number' },
  { key: 'date', label: 'Tanggal', format: 'date' },
]

const data = [
  { orderNumber: 'ORD-001', amount: 150000, quantity: 3, date: '2024-01-15' },
]
</script>

<template>
  <DataTable :columns="columns" :data="data" />
</template>
```

### Table dengan Custom Cell

```vue
<template>
  <DataTable :columns="columns" :data="users">
    <template #cell-status="{ value }">
      <span
        :class="[
          'px-2 py-1 rounded-full text-xs',
          value === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        ]"
      >
        {{ value }}
      </span>
    </template>

    <template #rowActions="{ row }">
      <button @click="handleEdit(row)">Edit</button>
      <button @click="handleDelete(row)">Delete</button>
    </template>
  </DataTable>
</template>
```

### Table dengan Actions

```vue
<template>
  <DataTable :columns="columns" :data="data">
    <template #actions>
      <button class="btn-primary">
        Tambah User
      </button>
      <button class="btn-secondary">
        Export
      </button>
    </template>
  </DataTable>
</template>
```

### Custom Format Function

```vue
<script setup>
const columns = [
  {
    key: 'price',
    label: 'Harga',
    format: (value) => `Rp ${value.toLocaleString('id-ID')}`
  },
  {
    key: 'discount',
    label: 'Diskon',
    format: (value) => `${value}%`
  },
]
</script>
```

### Nested Object Access

```vue
<script setup>
const columns = [
  { key: 'user.name', label: 'Nama User', sortable: true },
  { key: 'user.profile.address', label: 'Alamat' },
]

const data = [
  {
    user: {
      name: 'Ahmad',
      profile: { address: 'Jakarta' }
    }
  }
]
</script>
```

## Styling

Komponen ini menggunakan Tailwind CSS dan mendukung dark mode secara otomatis. Semua class dapat di-override sesuai kebutuhan.

## Tips

1. Gunakan `width` prop pada column untuk mengatur lebar kolom agar konsisten
2. Aktifkan `sortable` hanya pada kolom yang memerlukan sorting
3. Gunakan custom format function untuk format data yang kompleks
4. Manfaatkan slots untuk rendering yang lebih fleksibel
5. Nonaktifkan pagination dengan `paginated: false` jika data sedikit

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
