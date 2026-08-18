<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Customer" class="hidden md:block" />

    <!-- Mobile Header with Back Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="router.push('/customers')"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Detail Customer</h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data customer...</p>
      </div>
    </div>

    <div v-else-if="customer" class="space-y-6">
      <!-- Info Card -->
      <ComponentCard title="Informasi Customer" desc="Detail lengkap customer">
        <div class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Nama Customer</label>
              <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ customer.name }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Nama Toko</label>
              <p v-if="customer.store_name" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.store_name }}</p>
              <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">No. Telepon</label>
              <p v-if="customer.phone" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.phone }}</p>
              <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Kecamatan</label>
              <p v-if="customer.kecamatan" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.kecamatan }}</p>
              <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Alamat</label>
            <p v-if="customer.address" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.address }}</p>
            <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Catatan</label>
            <p v-if="customer.notes" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.notes }}</p>
            <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Dibuat Pada</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(customer.created_at) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Terakhir Diupdate</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(customer.updated_at) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            @click="router.push(`/customers/edit/${customerId}`)"
            class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
          >
            Edit Customer
          </button>
          <button
            @click="showDeleteDialog = true"
            class="rounded-lg border border-error-500 bg-transparent px-5 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-500 dark:hover:bg-error-500/15"
          >
            Hapus Customer
          </button>
          <button
            @click="router.push('/customers')"
            class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
        </div>
      </ComponentCard>
    </div>

    <div v-else class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-gray-600 dark:text-gray-400">Customer tidak ditemukan</p>
      <button
        @click="router.push('/customers')"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Daftar Customer
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Customer?"
      :message="`Apakah Anda yakin ingin menghapus customer '${customer?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useCustomersStore } from '@/stores/customers'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const toast = useToast()

const customerId = route.params.id as string
const customer = ref<any>(null)
const loading = ref(true)
const showDeleteDialog = ref(false)

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

const confirmDelete = async () => {
  try {
    await customersStore.deleteCustomer(customerId)
    toast.success('Berhasil!', 'Customer berhasil dihapus')
    router.push('/customers')
  } catch (error) {
    console.error('Error deleting customer:', error)
    toast.error('Gagal!', 'Gagal menghapus customer')
  }
}

onMounted(async () => {
  try {
    customer.value = await customersStore.getCustomer(customerId)
  } catch (error) {
    console.error('Error loading customer:', error)
    toast.error('Gagal!', 'Gagal memuat data customer')
  } finally {
    loading.value = false
  }
})
</script>
