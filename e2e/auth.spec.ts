import { test, expect } from '@playwright/test'

/**
 * E2E Test untuk Autentikasi
 * Test alur signup dan signin
 */

test.describe('Autentikasi', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate ke halaman signin sebelum setiap test
    await page.goto('/signin')
  })

  test('halaman signin tampil dengan benar', async ({ page }) => {
    // Cek judul halaman
    await expect(page).toHaveTitle(/Ucup Kasir/)

    // Cek elemen form signin ada
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible()
  })

  test('link ke halaman signup berfungsi', async ({ page }) => {
    // Klik link signup
    await page.getByRole('link', { name: /daftar/i }).click()

    // Cek URL berubah ke /signup
    await expect(page).toHaveURL(/\/signup/)
  })

  test('validasi form signin - email kosong', async ({ page }) => {
    // Klik tombol masuk tanpa isi form
    await page.getByRole('button', { name: /masuk/i }).click()

    // Cek validasi HTML5
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('validasi form signin - format email salah', async ({ page }) => {
    // Isi dengan email tidak valid
    await page.locator('input[type="email"]').fill('bukan-email')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /masuk/i }).click()

    // Browser akan menampilkan pesan validasi HTML5
    const emailInput = page.locator('input[type="email"]')
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage)
    expect(validationMessage).toBeTruthy()
  })

  test.skip('signin dengan kredensial valid', async ({ page }) => {
    // Skip test ini karena memerlukan user test yang sudah terdaftar
    // Untuk dijalankan, perlu setup test user di Supabase

    await page.locator('input[type="email"]').fill('test@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /masuk/i }).click()

    // Setelah login, redirect ke dashboard
    await expect(page).toHaveURL('/')

    // Cek ada header/sidebar (user sudah login)
    await expect(page.getByText(/dashboard/i)).toBeVisible()
  })
})
