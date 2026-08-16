<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Data Table" />
    <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Data Table Example</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Contoh penggunaan komponen DataTable dengan berbagai fitur
      </p>
    </div>

    <!-- Basic DataTable -->
    <ComponentCard title="Basic Data Table" desc="Tabel dengan fitur search, sort, dan pagination">
      <DataTable
        :columns="basicColumns"
        :data="users"
        search-placeholder="Cari nama atau email..."
      />
    </ComponentCard>

    <!-- DataTable with Custom Cells -->
    <ComponentCard
      title="Data Table dengan Custom Cell"
      desc="Menggunakan slot untuk custom cell rendering"
    >
      <DataTable :columns="customColumns" :data="users">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 overflow-hidden rounded-full">
              <img :src="row.avatar" :alt="row.name" class="h-full w-full object-cover" />
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">{{ row.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ row.email }}</p>
            </div>
          </div>
        </template>

        <template #cell-status="{ value }">
          <span
            :class="[
              'inline-flex rounded-full px-2 py-1 text-xs font-medium',
              {
                'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500':
                  value === 'Active',
                'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400':
                  value === 'Inactive',
                'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500':
                  value === 'Suspended',
              },
            ]"
          >
            {{ value }}
          </span>
        </template>

        <template #rowActions="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="editUser(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              @click="deleteUser(row)"
              class="rounded-lg p-2 text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
    </ComponentCard>

    <!-- DataTable with Actions -->
    <ComponentCard title="Data Table dengan Actions" desc="Menambahkan tombol aksi di header">
      <DataTable :columns="basicColumns" :data="users">
        <template #actions>
          <button
            @click="addUser"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tambah User
          </button>
        </template>
      </DataTable>
    </ComponentCard>

    <!-- DataTable with Formatted Values -->
    <ComponentCard
      title="Data Table dengan Format"
      desc="Format otomatis untuk tanggal, currency, dan angka"
    >
      <DataTable :columns="formattedColumns" :data="orders" />
    </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DataTable from '@/components/tables/DataTable.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const basicColumns = [
  { key: 'name', label: 'Nama', sortable: true, width: 'w-3/12' },
  { key: 'email', label: 'Email', sortable: true, width: 'w-3/12' },
  { key: 'role', label: 'Role', sortable: true, width: 'w-2/12' },
  { key: 'status', label: 'Status', sortable: true, width: 'w-2/12' },
  { key: 'joinDate', label: 'Tanggal Bergabung', sortable: true, width: 'w-2/12' },
]

const customColumns = [
  { key: 'name', label: 'User', width: 'w-4/12' },
  { key: 'role', label: 'Role', sortable: true, width: 'w-3/12' },
  { key: 'status', label: 'Status', sortable: true, width: 'w-2/12' },
  { key: 'joinDate', label: 'Tanggal Bergabung', sortable: true, width: 'w-3/12' },
]

const formattedColumns = [
  { key: 'orderNumber', label: 'No. Order', sortable: true, width: 'w-2/12' },
  { key: 'customer', label: 'Customer', sortable: true, width: 'w-3/12' },
  { key: 'amount', label: 'Total', sortable: true, format: 'currency' as const, width: 'w-2/12' },
  { key: 'quantity', label: 'Qty', sortable: true, format: 'number' as const, width: 'w-2/12' },
  { key: 'orderDate', label: 'Tanggal', sortable: true, format: 'date' as const, width: 'w-3/12' },
]

const users = ref([
  {
    name: 'Ahmad Fauzi',
    email: 'ahmad.fauzi@email.com',
    avatar: '/images/user/user-17.jpg',
    role: 'Administrator',
    status: 'Active',
    joinDate: '2024-01-15',
  },
  {
    name: 'Siti Nurhaliza',
    email: 'siti.nurhaliza@email.com',
    avatar: '/images/user/user-18.jpg',
    role: 'Manager',
    status: 'Active',
    joinDate: '2024-02-20',
  },
  {
    name: 'Budi Santoso',
    email: 'budi.santoso@email.com',
    avatar: '/images/user/user-19.jpg',
    role: 'Kasir',
    status: 'Active',
    joinDate: '2024-03-10',
  },
  {
    name: 'Rina Wijaya',
    email: 'rina.wijaya@email.com',
    avatar: '/images/user/user-20.jpg',
    role: 'Kasir',
    status: 'Inactive',
    joinDate: '2024-01-25',
  },
  {
    name: 'Dedi Kurniawan',
    email: 'dedi.kurniawan@email.com',
    avatar: '/images/user/user-21.jpg',
    role: 'Supervisor',
    status: 'Active',
    joinDate: '2024-04-05',
  },
  {
    name: 'Maya Putri',
    email: 'maya.putri@email.com',
    avatar: '/images/user/user-17.jpg',
    role: 'Kasir',
    status: 'Suspended',
    joinDate: '2024-02-14',
  },
  {
    name: 'Agus Setiawan',
    email: 'agus.setiawan@email.com',
    avatar: '/images/user/user-18.jpg',
    role: 'Kasir',
    status: 'Active',
    joinDate: '2024-03-20',
  },
  {
    name: 'Lina Marlina',
    email: 'lina.marlina@email.com',
    avatar: '/images/user/user-19.jpg',
    role: 'Supervisor',
    status: 'Active',
    joinDate: '2024-04-12',
  },
  {
    name: 'Hendra Gunawan',
    email: 'hendra.gunawan@email.com',
    avatar: '/images/user/user-20.jpg',
    role: 'Kasir',
    status: 'Active',
    joinDate: '2024-05-01',
  },
  {
    name: 'Dewi Sartika',
    email: 'dewi.sartika@email.com',
    avatar: '/images/user/user-21.jpg',
    role: 'Kasir',
    status: 'Inactive',
    joinDate: '2024-05-15',
  },
  {
    name: 'Tono Suryono',
    email: 'tono.suryono@email.com',
    avatar: '/images/user/user-17.jpg',
    role: 'Kasir',
    status: 'Active',
    joinDate: '2024-06-01',
  },
  {
    name: 'Sari Melati',
    email: 'sari.melati@email.com',
    avatar: '/images/user/user-18.jpg',
    role: 'Manager',
    status: 'Active',
    joinDate: '2024-06-10',
  },
])

const orders = ref([
  {
    orderNumber: 'ORD-001',
    customer: 'John Doe',
    amount: 150000,
    quantity: 3,
    orderDate: '2024-01-15',
  },
  {
    orderNumber: 'ORD-002',
    customer: 'Jane Smith',
    amount: 275000,
    quantity: 5,
    orderDate: '2024-01-16',
  },
  {
    orderNumber: 'ORD-003',
    customer: 'Bob Johnson',
    amount: 89000,
    quantity: 2,
    orderDate: '2024-01-17',
  },
  {
    orderNumber: 'ORD-004',
    customer: 'Alice Brown',
    amount: 450000,
    quantity: 8,
    orderDate: '2024-01-18',
  },
  {
    orderNumber: 'ORD-005',
    customer: 'Charlie Wilson',
    amount: 125000,
    quantity: 4,
    orderDate: '2024-01-19',
  },
  {
    orderNumber: 'ORD-006',
    customer: 'David Lee',
    amount: 320000,
    quantity: 6,
    orderDate: '2024-01-20',
  },
  {
    orderNumber: 'ORD-007',
    customer: 'Emma Davis',
    amount: 185000,
    quantity: 3,
    orderDate: '2024-01-21',
  },
  {
    orderNumber: 'ORD-008',
    customer: 'Frank Miller',
    amount: 420000,
    quantity: 7,
    orderDate: '2024-01-22',
  },
  {
    orderNumber: 'ORD-009',
    customer: 'Grace Taylor',
    amount: 95000,
    quantity: 2,
    orderDate: '2024-01-23',
  },
  {
    orderNumber: 'ORD-010',
    customer: 'Henry Anderson',
    amount: 560000,
    quantity: 10,
    orderDate: '2024-01-24',
  },
  {
    orderNumber: 'ORD-011',
    customer: 'Ivy Martinez',
    amount: 210000,
    quantity: 4,
    orderDate: '2024-01-25',
  },
  {
    orderNumber: 'ORD-012',
    customer: 'Jack Robinson',
    amount: 380000,
    quantity: 6,
    orderDate: '2024-01-26',
  },
])

const editUser = (user: any) => {
  alert(`Edit user: ${user.name}`)
}

const deleteUser = (user: any) => {
  if (confirm(`Hapus user ${user.name}?`)) {
    const index = users.value.findIndex((u) => u.email === user.email)
    if (index !== -1) {
      users.value.splice(index, 1)
    }
  }
}

const addUser = () => {
  alert('Tambah user baru')
}
</script>
