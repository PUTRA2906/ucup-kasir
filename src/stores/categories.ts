import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoriesServiceAdapter } from '@/services'
import type { Category, CategoryInsert, CategoryUpdate } from '@/types/database'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories() {
    loading.value = true
    error.value = null
    try {
      categories.value = await categoriesServiceAdapter.getAll()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getCategory(id: string) {
    loading.value = true
    error.value = null
    try {
      return await categoriesServiceAdapter.getById(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createCategory(category: CategoryInsert) {
    loading.value = true
    error.value = null
    try {
      const newCategory = await categoriesServiceAdapter.create(category)
      categories.value.push(newCategory)
      return newCategory
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateCategory(id: string, category: CategoryUpdate) {
    loading.value = true
    error.value = null

    const index = categories.value.findIndex((c) => c.id === id)
    const oldCategory = index !== -1 ? { ...categories.value[index] } : null

    try {
      const updatedCategory = await categoriesServiceAdapter.update(id, category)
      if (index !== -1) {
        categories.value[index] = updatedCategory
      }
      return updatedCategory
    } catch (e: any) {
      if (oldCategory && index !== -1) {
        categories.value[index] = oldCategory
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteCategory(id: string) {
    loading.value = true
    error.value = null

    const index = categories.value.findIndex((c) => c.id === id)
    const oldCategory = index !== -1 ? { ...categories.value[index] } : null

    try {
      await categoriesServiceAdapter.delete(id)
      categories.value = categories.value.filter((c) => c.id !== id)
    } catch (e: any) {
      if (oldCategory && index !== -1) {
        categories.value.splice(index, 0, oldCategory)
      }
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function searchCategories(query: string) {
    loading.value = true
    error.value = null
    try {
      return await categoriesServiceAdapter.search(query)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    searchCategories
  }
})