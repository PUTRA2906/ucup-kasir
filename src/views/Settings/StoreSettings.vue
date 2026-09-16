<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Pengaturan Toko" class="hidden md:block" />

    <div v-if="loading && !settingsStore.loaded" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat pengaturan...</p>
      </div>
    </div>

    <div v-else>
      <!-- Mobile Layout -->
      <div class="mx-auto max-w-3xl space-y-4 pb-6 pr-2 md:hidden">
      <!-- Header Mobile -->
      <MobilePageHeader title="Pengaturan Toko" subtitle="Konfigurasi data usaha dan sistem" hide-back-button />

      <!-- Informasi Toko — navigasi ke halaman terpisah -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="router.push('/settings/store-info')"
          class="flex w-full items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <svg class="h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">Informasi Toko</h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                {{ settingsStore.settings.store_name || 'Nama toko, alamat, kontak, footer struk' }}
              </p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      <!-- Variabel Global -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="router.push('/settings/global-variables')"
          class="flex w-full items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
              <svg class="h-4 w-4 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">Variabel Global</h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Limit kredit & upah bongkar muat</p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      <!-- Profil & Keamanan -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="router.push('/settings/profile')"
          class="flex w-full items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10">
              <svg class="h-4 w-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white">Profil & Keamanan</h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Data pribadi dan kata sandi akun</p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      <!-- Tampilan Aplikasi -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('display')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Tampilan Aplikasi
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Penyesuaian tema visual layar</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.display ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.display"
          class="border-t border-gray-200 p-4 dark:border-gray-800"
        >
          <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p class="font-bold text-gray-900 dark:text-white">Mode Gelap (Dark Mode)</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Kenyamanan mata saat di lapangan</p>
            </div>
            <button
              @click="toggleTheme"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                isDarkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isDarkMode ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
        </div>
      </section>

      <!-- Sinkronisasi Database -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('sync')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Sinkronisasi Database
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Upload & download data dari server</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.sync ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.sync"
          class="space-y-2.5 border-t border-gray-200 p-4 dark:border-gray-800"
        >
          <!-- Status koneksi & pending -->
          <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900">
            <div class="flex items-center gap-2">
              <span
                :class="[
                  'inline-flex h-2.5 w-2.5 rounded-full',
                  !isOnline ? 'bg-gray-400' : backupBusy ? 'bg-amber-500 animate-pulse' : 'bg-success-500',
                ]"
              ></span>
              <div>
                <p class="font-bold text-gray-900 dark:text-white">
                  {{ !isOnline ? 'Offline' : backupBusy ? 'Sedang mengirim...' : hasPending ? 'Ada perubahan menunggu' : 'Tersinkron' }}
                </p>
                <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  {{
                    !isOnline
                      ? 'Tidak terhubung ke internet'
                      : hasPending && !backupBusy
                        ? `${pendingCount} perubahan belum dikirim`
                        : 'Semua perubahan sudah terkirim'
                  }}
                </p>
              </div>
            </div>
            <BackupStatus />
          </div>

          <!-- Info waktu sync terakhir -->
          <div v-if="lastSyncInfo" class="rounded-lg bg-gray-50 p-2.5 text-[10px] dark:bg-gray-900/50">
            <div class="flex items-center justify-between">
              <span class="text-gray-500 dark:text-gray-400">Upload terakhir:</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {{ lastSyncInfo.lastSyncAt ? formatSyncDate(lastSyncInfo.lastSyncAt) : 'Belum pernah' }}
              </span>
            </div>
            <div class="mt-1 flex items-center justify-between">
              <span class="text-gray-500 dark:text-gray-400">Download terakhir:</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {{ lastSyncInfo.lastDownloadAt ? formatSyncDate(lastSyncInfo.lastDownloadAt) : 'Belum pernah' }}
              </span>
            </div>
          </div>

          <!-- Tombol Upload saja (cepat) -->
          <button
            @click="handleUploadChanges"
            :disabled="!isOnline || backupBusy"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 font-outfit text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <svg v-if="backupBusy" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            {{ !isOnline ? 'Tidak Ada Internet' : backupBusy ? 'Mengirim...' : 'Upload Perubahan' }}
          </button>

          <!-- Tombol Sinkronisasi Penuh (upload + download) -->
          <button
            @click="handleFullSync"
            :disabled="syncing || !isOnline"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 font-outfit text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            <svg v-if="syncing" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ syncing ? syncProgress : 'Sinkronisasi Penuh (Upload + Download)' }}
          </button>

          <p v-if="syncError" class="text-[11px] font-medium text-red-500 dark:text-red-400">{{ syncError }}</p>
        </div>
      </section>

      <!-- Sinkronisasi Database -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="router.push('/settings/event-log')"
          class="flex w-full items-center justify-between gap-3 p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6M9 8h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            <div>
              <h2 class="font-outfit text-sm font-bold text-gray-900 dark:text-white">
                Log Event
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Riwayat error &amp; aktivitas (SQLite / Supabase / Sync)</p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </section>

      <!-- Keluar -->
      <section class="rounded-2xl border border-red-200 bg-white shadow-sm dark:border-red-900/30 dark:bg-white/[0.03]">
        <button
          @click="showLogoutConfirm = true"
          class="flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
        >
          <LogoutIcon class="h-5 w-5 text-red-500 dark:text-red-400" />
          <div>
            <h2 class="font-outfit text-sm font-bold text-red-600 dark:text-red-400">
              Keluar
            </h2>
            <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Keluar dari akun aplikasi ini</p>
          </div>
        </button>
      </section>

    </div>

    <!-- Desktop Layout -->
    <div class="mx-auto hidden max-w-3xl space-y-6 md:block">
      <!-- Informasi Toko -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Toko</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Data ini ditampilkan di invoice dan cetak struk</p>
        </div>
        <div class="space-y-4 p-6">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nama Toko
            </label>
            <input
              v-model="formData.store_name"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Ucup Kasir"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Deskripsi Toko
            </label>
            <input
              v-model="formData.store_subtitle"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Deskripsi singkat toko"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Alamat
            </label>
            <textarea
              v-model="formData.store_address"
              rows="2"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Alamat toko"
            ></textarea>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Telepon
              </label>
              <input
                v-model="formData.store_phone"
                type="text"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Email
              </label>
              <input
                v-model="formData.store_email"
                type="email"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="toko@email.com"
              />
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Footer Struk
            </label>
            <input
              v-model="formData.receipt_footer"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Terima kasih atas kunjungan Anda"
            />
          </div>
          <div class="flex justify-end pt-1">
            <button
              @click="saveStoreSection"
              :disabled="savingStore"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <svg v-if="savingStore" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ savingStore ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Variabel Global -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          @click="router.push('/settings/global-variables')"
          class="flex w-full items-center justify-between gap-4 p-6 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
        >
          <div class="flex items-center gap-4">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <svg class="h-5 w-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Variabel Global</h3>
              <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Limit kredit default & upah bongkar muat per karung</p>
            </div>
          </div>
          <svg class="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Pengaturan Tampilan -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Tampilan</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Pengaturan tampilan aplikasi</p>
        </div>
        <div class="space-y-4 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Mode Gelap (Dark Mode)</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Gunakan tampilan gelap untuk kenyamanan mata</p>
            </div>
            <button
              @click="toggleTheme"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                isDarkMode ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isDarkMode ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Backup & Sinkronisasi -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Backup & Sinkronisasi</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Kirim perubahan data aplikasi ke server</p>
        </div>
        <div class="space-y-4 p-6">
          <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center gap-3">
              <span
                :class="[
                  'inline-flex h-2.5 w-2.5 rounded-full',
                  !isOnline ? 'bg-gray-400' : backupBusy ? 'bg-amber-500 animate-pulse' : 'bg-success-500',
                ]"
              ></span>
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ !isOnline ? 'Offline' : backupBusy ? 'Sedang mengirim...' : hasPending ? 'Ada perubahan menunggu' : 'Tersinkron' }}
                </p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{
                    !isOnline
                      ? 'Tidak terhubung ke internet — perubahan disimpan lokal'
                      : hasPending && !backupBusy
                        ? `${pendingCount} perubahan belum dikirim`
                        : 'Semua perubahan aplikasi sudah dikirim ke server'
                  }}
                </p>
              </div>
            </div>
            <BackupStatus />
          </div>

          <p v-if="lastSyncLabel" class="text-xs text-gray-500 dark:text-gray-400">
            Backup terakhir: {{ lastSyncLabel }}
          </p>

          <div class="flex justify-end pt-1">
            <button
              @click="handleUploadChanges"
              :disabled="!isOnline || backupBusy"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <svg v-if="backupBusy" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              {{ !isOnline ? 'Tidak Ada Internet' : backupBusy ? 'Mengirim...' : 'Upload Perubahan Aplikasi' }}
            </button>
          </div>

          <p v-if="syncError" class="text-xs font-medium text-red-500 dark:text-red-400">{{ syncError }}</p>
        </div>
      </div>

      <!-- Keluar -->
      <div class="overflow-hidden rounded-2xl border border-red-200 bg-white dark:border-red-900/30 dark:bg-gray-900">
        <div class="flex items-center justify-between gap-4 p-6">
          <div class="flex items-center gap-3">
            <LogoutIcon class="h-5 w-5 text-red-500 dark:text-red-400" />
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Keluar</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Keluar dari akun aplikasi ini</p>
            </div>
          </div>
          <button
            @click="showLogoutConfirm = true"
            class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <LogoutIcon class="h-4 w-4" />
            Keluar
          </button>
        </div>
      </div>

    </div>
    </div>

    <ConfirmDialog
      v-model="showLogoutConfirm"
      title="Keluar Aplikasi"
      message="Yakin ingin keluar dari akun ini?"
      confirm-text="Keluar"
      cancel-text="Batal"
      variant="danger"
      @confirm="handleLogout"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { useTheme } from '@/components/layout/ThemeProvider.vue'
import { useNetwork } from '@/lib/network'
import BackupStatus from '@/views/Sync/BackupStatus.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { LogoutIcon } from '@/icons'
import { downloadAllFromSupabase, uploadChangesToSupabase, getLastSyncInfo } from '@/services/sync/syncEngine'
import { isNativeApp } from '@/lib/platform'

const settingsStore = useStoreSettingsStore()
const syncStore = useSyncStore()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { isDarkMode, toggleTheme } = useTheme()
const { isOnline } = useNetwork()

const loading = ref(false)
const syncError = ref<string | null>(null)
const lastSyncLabel = ref<string | null>(null)
const showLogoutConfirm = ref(false)

// Auto register/unregister layer di navigation stack
useAutoNavigationStack(showLogoutConfirm, 'settings-logout-confirm-dialog')

// State untuk sinkronisasi
const syncing = ref(false)
const syncProgress = ref('Memulai sinkronisasi...')
const lastSyncInfo = ref<{ lastSyncAt: string | null; lastDownloadAt: string | null } | null>(null)

// Backup & Sinkronisasi — status dari sync store
const backupBusy = computed(() => syncStore.uploading || syncStore.syncing)
const hasPending = computed(() => syncStore.hasPending)
const pendingCount = computed(() => syncStore.pendingCount)

/** Upload perubahan aplikasi (sync_queue) ke server. */
async function handleUploadChanges() {
  if (!isOnline.value || backupBusy.value) return
  syncError.value = null
  try {
    const result = await syncStore.uploadChanges()
    if (result.uploaded && result.uploaded > 0) {
      toast.success('Berhasil!', `${result.uploaded} perubahan berhasil diupload`)
    } else {
      toast.success('Berhasil!', 'Tidak ada perubahan untuk diupload')
    }
    lastSyncLabel.value = syncStore.lastSyncAt || null
  } catch (e: any) {
    syncError.value = e.message || 'Gagal upload perubahan'
    toast.error('Gagal!', syncError.value || 'Gagal upload perubahan')
  }
}

/** Handle sinkronisasi penuh: upload perubahan lokal lalu download data terbaru */
async function handleFullSync() {
  if (!isNativeApp()) {
    toast.error('Gagal!', 'Sinkronisasi hanya tersedia di aplikasi mobile')
    return
  }

  if (!isOnline.value) {
    toast.error('Gagal!', 'Tidak ada koneksi internet')
    return
  }

  if (syncing.value) return

  syncing.value = true
  syncProgress.value = 'Memulai sinkronisasi...'

  try {
    // Step 1: Upload perubahan lokal ke server
    syncProgress.value = 'Mengupload perubahan lokal...'
    const uploadResult = await uploadChangesToSupabase()

    if (!uploadResult.success && uploadResult.message) {
      throw new Error(`Upload gagal: ${uploadResult.message}`)
    }

    const uploadedCount = uploadResult.uploaded || 0
    console.log(`Upload: ${uploadedCount} item berhasil`)

    // Step 2: Download data terbaru dari server
    syncProgress.value = 'Mendownload data terbaru...'
    const downloadResult = await downloadAllFromSupabase()

    if (!downloadResult.success) {
      throw new Error(`Download gagal: ${downloadResult.message}`)
    }

    const downloadedCount = downloadResult.downloaded || 0
    console.log(`Download: ${downloadedCount} data berhasil`)

    // Update info sync terakhir
    await loadLastSyncInfo()

    // Tampilkan notifikasi sukses
    toast.success(
      'Sinkronisasi Berhasil!',
      `Upload: ${uploadedCount} perubahan, Download: ${downloadedCount} data`
    )

  } catch (e: any) {
    console.error('Gagal sinkronisasi:', e)
    toast.error('Gagal Sinkronisasi!', e.message || 'Terjadi kesalahan saat sinkronisasi')
  } finally {
    syncing.value = false
    syncProgress.value = 'Memulai sinkronisasi...'
  }
}

/** Load info sync terakhir */
async function loadLastSyncInfo() {
  try {
    if (isNativeApp()) {
      lastSyncInfo.value = await getLastSyncInfo()
    }
  } catch (e) {
    console.error('Gagal load sync info:', e)
  }
}

/** Format tanggal sync */
function formatSyncDate(dateStr: string | null): string {
  if (!dateStr) return 'Belum pernah'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Kurang dari 1 menit
  if (diff < 60000) return 'Baru saja'

  // Kurang dari 1 jam
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins} menit lalu`
  }

  // Kurang dari 1 hari
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} jam lalu`
  }

  // Format tanggal lengkap
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Per-section saving state
const savingStore = ref(false)

const saveStoreSection = async () => {
  savingStore.value = true
  try {
    await settingsStore.updateSettings({
      store_name: formData.store_name.trim() || 'Ucup Kasir',
      store_subtitle: formData.store_subtitle.trim() || 'Toko',
      store_address: formData.store_address.trim(),
      store_phone: formData.store_phone.trim(),
      store_email: formData.store_email.trim(),
      receipt_footer: formData.receipt_footer.trim(),
    })
    toast.success('Berhasil!', 'Informasi toko berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan informasi toko')
  } finally {
    savingStore.value = false
  }
}

const expandedSections = reactive({
  store: false,
  display: false,
  backup: false,
  sync: false,
})

const toggleSection = (section: keyof typeof expandedSections) => {
  expandedSections[section] = !expandedSections[section]
}

const formData = reactive({
  store_name: '',
  store_subtitle: '',
  store_address: '',
  store_phone: '',
  store_email: '',
  receipt_footer: '',
})

const handleLogout = async () => {
  showLogoutConfirm.value = false
  try {
    const result = await authStore.signOut()
    // Batal oleh user (mis. gagal sinkron lalu pilih "Batal") → tetap di app.
    if (result.cancelled) return
    router.push('/signin')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal keluar dari akun')
  }
}

onMounted(async () => {
  loading.value = true
  await settingsStore.fetchSettings()
  const s = settingsStore.settings
  formData.store_name = s.store_name || ''
  formData.store_subtitle = s.store_subtitle || ''
  formData.store_address = s.store_address || ''
  formData.store_phone = s.store_phone || ''
  formData.store_email = s.store_email || ''
  formData.receipt_footer = s.receipt_footer || ''

  // Muat info backup
  await syncStore.loadInfo()
  lastSyncLabel.value = syncStore.lastSyncAt || null

  // Muat info sync terakhir untuk section sinkronisasi
  await loadLastSyncInfo()

  // Hitung pending queue
  try {
    const { getSyncQueue } = await import('@/lib/sqlite')
    const queue = await getSyncQueue()
    syncStore.pendingCount = queue.length
  } catch {
    // non-critical
  }

  loading.value = false
})
</script>
