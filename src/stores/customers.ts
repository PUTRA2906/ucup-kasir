import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sqliteCustomersService } from '@/services/sqlite/customers'
import type { Customer, CustomerInsert, CustomerUpdate } from '@/types/database'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCustomers() {
    loading.value = true
    error.value = null
    try {
      customers.value = await sqliteCustomersService.getAll()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getCustomer(id: string) {
    loading.value = true
    error.value = null
    try {
      return await sqliteCustomersService.getById(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createCustomer(customer: CustomerInsert) {
    loading.value = true
    error.value = null
    try {
      const newCustomer = await sqliteCustomersService.create(customer)
      customers.value.push(newCustomer)
      return newCustomer
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Insert banyak customer sekaligus (import CSV / bulk). */
  async function createCustomers(customersToInsert: CustomerInsert[]) {
    loading.value = true
    error.value = null
    try {
      const newCustomers = await sqliteCustomersService.createMany(customersToInsert)
      // Optimistic: append semua, tanpa refetch
      customers.value.push(...newCustomers)
      return newCustomers
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateCustomer(id: string, customer: CustomerUpdate) {
    loading.value = true
    error.value = null

    const index = customers.value.findIndex((c) => c.id === id)
    const oldCustomer = index !== -1 ? { ...customers.value[index] } : null

    try {
      const updatedCustomer = await sqliteCustomersService.update(id, customer)
      if (index !== -1) {
        customers.value[index] = updatedCustomer
      }
      return updatedCustomer
    } catch (e: any) {
      if (oldCustomer && index !== -1) {
        customers.value[index] = oldCustomer
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(id: string) {
    loading.value = true
    error.value = null

    const index = customers.value.findIndex((c) => c.id === id)
    const oldCustomer = index !== -1 ? { ...customers.value[index] } : null

    try {
      await sqliteCustomersService.delete(id)
      customers.value = customers.value.filter((c) => c.id !== id)
    } catch (e: any) {
      if (oldCustomer && index !== -1) {
        customers.value.splice(index, 0, oldCustomer)
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function searchCustomers(query: string) {
    loading.value = true
    error.value = null
    try {
      return await sqliteCustomersService.search(query)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    getCustomer,
    createCustomer,
    createCustomers,
    updateCustomer,
    deleteCustomer,
    searchCustomers
  }
})