import { test, expect } from '@playwright/test'

/**
 * Contoh E2E Test untuk Ucup Kasir
 * Test navigasi dan tampilan halaman utama
 */

test.describe('Halaman Utama', () => {
  test('halaman signin dapat diakses', async ({ page }) => {
    await page.goto('/signin')

    // Cek halaman berhasil dimuat
    await expect(page).toHaveURL(/\/signin/)

    // Cek elemen penting ada
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('halaman signup dapat diakses', async ({ page }) => {
    await page.goto('/signup')

    // Cek halaman berhasil dimuat
    await expect(page).toHaveURL(/\/signup/)

    // Cek form signup ada
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('redirect ke signin jika belum login', async ({ page }) => {
    // Coba akses dashboard tanpa login
    await page.goto('/')

    // Harus redirect ke signin
    await expect(page).toHaveURL(/\/signin/)
  })
})
