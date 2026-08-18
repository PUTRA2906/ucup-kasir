import { defineStore } from 'pinia'
import { ref } from 'vue'
import { categoriesService } from '@/services/categories'
import type { Category, CategoryInsert, CategoryUpdate } from '@/types/database'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCategories() {
    loading.value = true
    error.value = null
    try {
      categories.value = await categoriesService.getAll()
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
      return await categoriesService.getById(id)
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
      const newCategory = await categoriesService.create(category)
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
    try {
      const updatedCategory = await categoriesService.update(id, category)
      const index = categories.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        categories.value[index] = updatedCategory
      }
      return updatedCategory
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteCategory(id: string) {
    loading.value = true
    error.value = null
    try {
      await categoriesService.delete(id)
      categories.value = categories.value.filter((c) => c.id !== id)
    } catch (e: any) {
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
      return await categoriesService.search(query)
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
