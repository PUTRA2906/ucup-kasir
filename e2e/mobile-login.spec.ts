import { test, expect, devices } from '@playwright/test'

/**
 * Test Login Mobile - Ucup Kasir
 * Test kredensial: test2@test.id / test12
 */

// Konfigurasi mobile di level top (bukan di dalam describe)


test.describe('Mobile Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navigasi ke halaman login
    await page.goto('/signin')
  })

  test('harus menampilkan form login dengan benar di mobile', async ({ page }) => {
    // Cek apakah halaman login ter-render dengan benar
    await expect(page).toHaveTitle(/Ucup Kasir/)

    // Cek elemen form login ada (gunakan selector yang sama dengan auth.spec.ts)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible()
  })

  test('harus bisa login dengan kredensial yang benar', async ({ page }) => {
    // Input email (gunakan selector type)
    await page.locator('input[type="email"]').fill('test2@test.id')

    // Input password (gunakan selector type)
    await page.locator('input[type="password"]').fill('test12')

    // Klik tombol Masuk
    await page.getByRole('button', { name: /masuk/i }).click()

    // Tunggu redirect ke dashboard setelah login berhasil
    await page.waitForURL('/', { timeout: 10000 })

    // Verifikasi bahwa user sudah login dan berada di dashboard
    await expect(page).toHaveURL('/')

    // Cek apakah ada elemen dashboard (misal: greeting atau menu)
    await expect(page.locator('text=/Selamat Datang|Dashboard|Beranda/i')).toBeVisible()
  })

  test('harus menampilkan error jika kredensial salah', async ({ page }) => {
    // Input email yang salah (gunakan selector type)
    await page.locator('input[type="email"]').fill('wrong@test.id')
    await page.locator('input[type="password"]').fill('wrongpassword')

    // Klik tombol Masuk
    await page.getByRole('button', { name: /masuk/i }).click()

    // Tunggu error message muncul
    await expect(page.locator('text=/Invalid|Gagal|Error/i')).toBeVisible({ timeout: 5000 })
  })

  test('harus menampilkan error jika field kosong', async ({ page }) => {
    // Klik tombol Masuk tanpa mengisi form
    await page.getByRole('button', { name: /masuk/i }).click()

    // Browser validation atau custom validation akan muncul
    // Karena field email required, browser akan menampilkan validation message
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('harus bisa toggle visibility password', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]')

    // Awalnya password type="password" (hidden)
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // Cari tombol toggle password (biasanya icon mata)
    const toggleButton = page.locator('button[aria-label*="password"], button:has(svg):near(:text("Password"))')

    if (await toggleButton.count() > 0) {
      // Klik toggle untuk show password
      await toggleButton.first().click()

      // Password sekarang type="text" (visible)
      await expect(passwordInput).toHaveAttribute('type', 'text')

      // Klik lagi untuk hide
      await toggleButton.first().click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })

  test('harus responsive di berbagai ukuran mobile', async ({ page }) => {
    // Test di berbagai ukuran viewport mobile
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 390, height: 844, name: 'iPhone 12' },
      { width: 360, height: 740, name: 'Android Medium' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)

      // Cek elemen masih terlihat dengan baik (gunakan selector type)
      await expect(page.locator('input[type="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"]')).toBeVisible()
      await expect(page.getByRole('button', { name: /masuk/i })).toBeVisible()

      // Cek tidak ada horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // +1 untuk toleransi
    }
  })

  test('harus bisa navigasi ke halaman signup', async ({ page }) => {
    // Cari link ke halaman signup
    const signupLink = page.locator('a:has-text("Daftar"), a:has-text("Sign Up"), a:has-text("Buat Akun")')

    if (await signupLink.count() > 0) {
      await signupLink.first().click()

      // Verifikasi redirect ke halaman signup
      await expect(page).toHaveURL(/signup|daftar/)
    }
  })

  test('harus persist login setelah refresh', async ({ page, context }) => {
    // Login terlebih dahulu (gunakan selector type)
    await page.locator('input[type="email"]').fill('test2@test.id')
    await page.locator('input[type="password"]').fill('test12')
    await page.getByRole('button', { name: /masuk/i }).click()

    // Tunggu redirect ke dashboard
    await page.waitForURL('/', { timeout: 10000 })

    // Refresh halaman
    await page.reload()

    // Verifikasi user masih login (tidak redirect ke /signin)
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL('/')
  })

  test('harus bisa logout setelah login', async ({ page }) => {
    // Login terlebih dahulu (gunakan selector type)
    await page.locator('input[type="email"]').fill('test2@test.id')
    await page.locator('input[type="password"]').fill('test12')
    await page.getByRole('button', { name: /masuk/i }).click()

    // Tunggu redirect ke dashboard
    await page.waitForURL('/', { timeout: 10000 })

    // Cari tombol logout (biasanya di menu atau profile)
    const logoutButton = page.locator('button:has-text("Keluar"), button:has-text("Logout"), a:has-text("Keluar")')

    if (await logoutButton.count() > 0) {
      await logoutButton.first().click()

      // Verifikasi redirect ke halaman login
      await expect(page).toHaveURL(/signin|login/)
    }
  })
})
