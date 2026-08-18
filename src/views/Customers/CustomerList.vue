<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Customer" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- DataTable -->
      <DataTable
        :columns="columns"
        :data="customersStore.customers"
        :per-page="10"
        :searchable="true"
        :show-add-button="true"
        add-button-text="Tambah Customer"
        title="Daftar Customer"
        :subtitle="`${settingsStore.storeSubtitle} - ${customersStore.customers.length} Customer`"
        @add-click="addCustomer"
        @menu-action="handleMenuAction"
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
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useCustomersStore } from '@/stores/customers'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const customersStore = useCustomersStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const selectedCustomers = ref<string[]>([])
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const customerToDelete = ref<any>(null)

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
    alert('Gagal memuat data. Silakan refresh halaman.')
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
</script>
