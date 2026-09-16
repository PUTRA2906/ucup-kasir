# E2E Testing dengan Playwright

Proyek Ucup Kasir sudah dilengkapi dengan Playwright untuk end-to-end testing.

## Setup yang Sudah Selesai

1. ✅ Package `@playwright/test` sudah terinstall
2. ✅ Konfigurasi Playwright (`playwright.config.ts`) sudah dibuat
3. ✅ Folder `e2e/` dengan contoh test sudah dibuat
4. ✅ Script npm untuk menjalankan test sudah ditambahkan

## Instalasi Browser (Diperlukan Sebelum Test Pertama)

Karena disk space terbatas, instalasi browser Playwright perlu dilakukan manual:

```bash
# Install browser Chromium saja (lebih hemat space)
npx playwright install chromium

# Atau jika space cukup, install semua browser
npx playwright install
```

## Menjalankan Test

```bash
# Jalankan semua e2e test (headless)
npm run test:e2e

# Jalankan dengan UI mode (interactive)
npm run test:e2e:ui

# Jalankan dengan browser terlihat (headed mode)
npm run test:e2e:headed

# Debug mode (step-by-step)
npm run test:e2e:debug

# Lihat laporan hasil test
npm run test:e2e:report
```

## Struktur Test

```
e2e/
├── README.md              # Dokumentasi ini
├── example.spec.ts        # Contoh test dasar (navigasi, redirect)
└── auth.spec.ts           # Test autentikasi (signin, signup)
```

## Menulis Test Baru

Buat file baru dengan ekstensi `.spec.ts` di folder `e2e/`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Fitur Baru', () => {
  test('test case 1', async ({ page }) => {
    await page.goto('/')
    
    // Tulis assertion di sini
    await expect(page).toHaveTitle(/Ucup Kasir/)
  })
})
```

## Tips Testing

1. **Dev Server Otomatis:** Playwright config sudah diset untuk start dev server otomatis saat test berjalan
2. **Base URL:** Semua test menggunakan `http://localhost:5173` sebagai base URL
3. **Screenshot:** Screenshot otomatis diambil saat test gagal
4. **Trace:** Trace disimpan saat retry untuk debugging

## Test yang Sudah Ada

### `example.spec.ts`
- Cek halaman signin dapat diakses
- Cek halaman signup dapat diakses  
- Cek redirect ke signin jika belum login

### `auth.spec.ts`
- Cek tampilan form signin
- Cek link ke halaman signup
- Validasi form signin (email kosong, format salah)
- Test login dengan kredensial valid (di-skip, perlu setup test user)

## Setup Test User di Supabase

Untuk test login yang lengkap, perlu membuat test user di Supabase:

1. Buka Supabase Dashboard → Authentication → Users
2. Buat user baru untuk testing (misal: `test@example.com`)
3. Update test di `auth.spec.ts` dengan kredensial test user
4. Hapus `.skip()` dari test login

## Troubleshooting

### Error: Browser not installed
Jalankan: `npx playwright install chromium`

### Error: ENOSPC (disk space penuh)
- Hapus file tidak terpakai dengan `npm prune`
- Atau install browser di lokasi lain dengan environment variable `PLAYWRIGHT_BROWSERS_PATH`

### Test timeout
- Tingkatkan timeout di `playwright.config.ts`
- Atau tambahkan `test.setTimeout(60000)` di test spesifik

## Referensi

- Dokumentasi Playwright: https://playwright.dev
- Best Practices: https://playwright.dev/docs/best-practices
- Selectors: https://playwright.dev/docs/selectors
