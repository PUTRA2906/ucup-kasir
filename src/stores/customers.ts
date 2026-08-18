import { defineStore } from 'pinia'
import { ref } from 'vue'
import { customersService } from '@/services/customers'
import type { Customer, CustomerInsert, CustomerUpdate } from '@/types/database'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCustomers() {
    loading.value = true
    error.value = null
    try {
      customers.value = await customersService.getAll()
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
      return await customersService.getById(id)
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
      const newCustomer = await customersService.create(customer)
      customers.value.push(newCustomer)
      return newCustomer
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
    try {
      const updatedCustomer = await customersService.update(id, customer)
      const index = customers.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        customers.value[index] = updatedCustomer
      }
      return updatedCustomer
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(id: string) {
    loading.value = true
    error.value = null
    try {
      await customersService.delete(id)
      customers.value = customers.value.filter((c) => c.id !== id)
    } catch (e: any) {
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
      return await customersService.search(query)
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
    updateCustomer,
    deleteCustomer,
    searchCustomers
  }
})
