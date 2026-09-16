<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Tambah Supplier" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader 
      title="Tambah Supplier" 
      subtitle="Tambah Data Pemasok Baru" 
      back-to="/purchasing/suppliers"
    />

    <!-- Form Card -->
    <div class="mx-auto max-w-2xl">
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nama Supplier *
            </label>
            <input 
              v-model="form.name" 
              type="text" 
              placeholder="Nama pemasok" 
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" 
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kontak Person
            </label>
            <input 
              v-model="form.contact_person" 
              type="text" 
              placeholder="Nama sales" 
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" 
            />
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telepon
              </label>
              <input 
                v-model="form.phone" 
                type="text" 
                placeholder="08xxx" 
                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" 
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input 
                v-model="form.email" 
                type="email" 
                placeholder="email@example.com" 
                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" 
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Alamat
            </label>
            <textarea 
              v-model="form.address" 
              rows="3" 
              placeholder="Alamat supplier" 
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipe Supplier
              </label>
              <SelectField
                v-model="form.supplier_type"
                :options="[
                  { label: 'Langsung', value: 'langsung' },
                  { label: 'Distributor', value: 'distributor' },
                  { label: 'Grosir', value: 'grosir' },
                  { label: 'Importir', value: 'importir' }
                ]"
                title="Tipe Supplier"
                placeholder="Pilih tipe..."
                button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Termin Pembayaran
              </label>
              <SelectField
                v-model="form.payment_term"
                :options="[
                  { label: 'Tunai', value: 'tunai' },
                  { label: '7 Hari', value: '7' },
                  { label: '14 Hari', value: '14' },
                  { label: '30 Hari', value: '30' }
                ]"
                title="Termin Pembayaran"
                placeholder="Pilih termin..."
                button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Plafon Kredit
            </label>
            <CurrencyInput 
              v-model="form.credit_limit" 
              placeholder="0" 
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Catatan
            </label>
            <textarea 
              v-model="form.notes" 
              rows="3" 
              placeholder="Catatan (opsional)" 
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            ></textarea>
          </div>

          <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status Aktif</span>
            <label class="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" v-model="form.is_active" class="peer sr-only" />
              <div class="h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-blue-600 dark:bg-gray-700"></div>
              <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5"></div>
            </label>
          </div>

          <div v-if="formError" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
            <p class="text-sm text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>

          <div class="flex flex-col-reverse gap-3 pt-2 md:flex-row md:justify-end">
            <button
              @click="$router.back()"
              class="w-full rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 md:w-auto dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
            </button>
            <button
              @click="handleSave"
              :disabled="saving"
              class="w-full rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 md:w-auto"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Supplier' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import SelectField from '@/components/common/SelectField.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import { useToast } from '@/composables/useToast'
import type { SupplierInsert } from '@/types/database'

const router = useRouter()
const store = usePurchasingStore()
const toast = useToast()

const saving = ref(false)
const formError = ref<string | null>(null)

const form = ref<SupplierInsert>({
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  supplier_type: 'langsung',
  payment_term: 'tunai',
  credit_limit: 0,
  notes: '',
  is_active: true,
})

const handleSave = async () => {
  formError.value = null
  
  if (!form.value.name.trim()) {
    formError.value = 'Nama supplier wajib diisi'
    return
  }

  saving.value = true
  try {
    await store.createSupplier({
      ...form.value,
      contact_person: form.value.contact_person || undefined,
      phone: form.value.phone || undefined,
      email: form.value.email || undefined,
      address: form.value.address || undefined,
      notes: form.value.notes || undefined,
    })
    
    toast.success('Berhasil!', 'Supplier berhasil ditambahkan')
    router.push('/purchasing/suppliers')
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}
</script>
