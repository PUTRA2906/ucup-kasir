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
      <div class="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-6 md:hidden">
      <!-- Header Mobile -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-outfit text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
            Pengaturan Toko
          </h1>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">Konfigurasi data usaha dan sistem</p>
        </div>
      </div>

      <!-- Informasi Toko -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('store')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Informasi Toko
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Data ini ditampilkan pada faktur invoice</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.store ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.store"
          class="space-y-2.5 border-t border-gray-200 p-4 text-xs dark:border-gray-800"
        >
          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Nama Toko</label>
            <input
              v-model="formData.store_name"
              type="text"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="Ucup Kasir"
            />
          </div>

          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Deskripsi Toko</label>
            <input
              v-model="formData.store_subtitle"
              type="text"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="Deskripsi singkat toko"
            />
          </div>

          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Alamat Gudang / Toko</label>
            <textarea
              v-model="formData.store_address"
              rows="2"
              class="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="Alamat lengkap toko"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">No. WhatsApp/Telp</label>
              <input
                v-model="formData.store_phone"
                type="tel"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="081234567890"
              />
            </div>
            <div>
              <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Email Toko</label>
              <input
                v-model="formData.store_email"
                type="email"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="toko@email.com"
              />
            </div>
          </div>

          <button
            @click="saveStoreSection"
            :disabled="savingStore"
            class="w-full rounded-xl bg-blue-600 py-2.5 font-outfit text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {{ savingStore ? 'Menyimpan...' : 'Simpan Informasi Toko' }}
          </button>
        </div>
      </section>

      <!-- Pengaturan Pajak -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('tax')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Pengaturan Pajak
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Konfigurasi PPN atau tarif tambahan</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.tax ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.tax"
          class="space-y-3 border-t border-gray-200 p-4 text-xs dark:border-gray-800"
        >
          <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p class="font-bold text-gray-900 dark:text-white">Aktifkan Pajak</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Pajak otomatis ditambahkan ke total nota</p>
            </div>
            <button
              @click="formData.tax_enabled = !formData.tax_enabled"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                formData.tax_enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  formData.tax_enabled ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>

          <div v-if="formData.tax_enabled">
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Tarif Pajak (%)</label>
            <div class="relative">
              <input
                v-model.number="formData.tax_rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-outfit font-bold text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="0"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 transform text-xs font-bold text-gray-500 dark:text-gray-400">%</span>
            </div>
          </div>

          <button
            @click="saveTaxSection"
            :disabled="savingTax"
            class="w-full rounded-xl bg-emerald-600 py-2.5 font-outfit text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {{ savingTax ? 'Menyimpan...' : 'Simpan Pengaturan Pajak' }}
          </button>
        </div>
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

      <!-- Informasi Profil -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('profile')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Informasi Profil
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Data pribadi dan akun Anda</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.profile ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.profile"
          class="space-y-2.5 border-t border-gray-200 p-4 text-xs dark:border-gray-800"
        >
          <!-- Avatar -->
          <div class="flex flex-col items-center gap-2">
            <div class="relative">
              <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                <img
                  v-if="profileData.avatarUrl"
                  :src="profileData.avatarUrl"
                  alt="Avatar"
                  class="h-full w-full object-cover"
                />
                <span
                  v-else
                  class="text-2xl font-semibold text-gray-500 dark:text-gray-400"
                >
                  {{ profileInitial }}
                </span>
              </div>
              <button
                type="button"
                @click="fileInput?.click()"
                :disabled="uploading"
                class="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white shadow-lg hover:bg-blue-600 disabled:opacity-60 dark:border-gray-900"
              >
                <svg v-if="uploading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarSelected"
            />
            <p class="text-center text-[10px] text-gray-500 dark:text-gray-400">
              JPG/PNG/WebP, maks. 2 MB
            </p>
          </div>

          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Nama Lengkap</label>
            <input
              v-model="profileData.fullName"
              type="text"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="Nama lengkap Anda"
            />
          </div>

          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Email</label>
            <input
              type="email"
              :value="authStore.user?.email || ''"
              disabled
              class="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-[11px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            />
            <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              Email tidak dapat diubah
            </p>
          </div>

          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">No. Telepon</label>
            <input
              v-model="profileData.phone"
              type="tel"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="081234567890"
            />
          </div>

          <button
            @click="saveProfileSection"
            :disabled="savingProfile"
            class="w-full rounded-xl bg-indigo-600 py-2.5 font-outfit text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {{ savingProfile ? 'Menyimpan...' : 'Simpan Informasi Profil' }}
          </button>
        </div>
      </section>

      <!-- Backup & Sinkronisasi -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('backup')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-sky-500 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Backup & Sinkronisasi
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Kirim perubahan data aplikasi ke server</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.backup ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.backup"
          class="space-y-3 border-t border-gray-200 p-4 text-xs dark:border-gray-800"
        >
          <!-- Status backup -->
          <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
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

          <!-- Info backup terakhir -->
          <div v-if="lastSyncLabel" class="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Backup terakhir: {{ lastSyncLabel }}
          </div>

          <!-- Tombol upload -->
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
            {{ !isOnline ? 'Tidak Ada Internet' : backupBusy ? 'Mengirim...' : 'Upload Perubahan Aplikasi' }}
          </button>

          <p v-if="syncError" class="text-[11px] font-medium text-red-500 dark:text-red-400">{{ syncError }}</p>
        </div>
      </section>

      <!-- Keamanan -->
      <section class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <button
          @click="toggleSection('security')"
          class="flex w-full items-center justify-between p-4 text-left transition active:scale-[0.99]"
        >
          <div class="flex items-center gap-1.5">
            <svg class="h-4 w-4 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h2 class="font-outfit text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Keamanan Akun
              </h2>
              <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">Ubah kata sandi akun Anda</p>
            </div>
          </div>
          <svg
            :class="[
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              expandedSections.security ? 'rotate-180' : ''
            ]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="expandedSections.security"
          class="space-y-2.5 border-t border-gray-200 p-4 text-xs dark:border-gray-800"
        >
          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Kata Sandi Baru</label>
            <input
              v-model="profileData.newPassword"
              type="password"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <div>
            <label class="mb-1 block text-[11px] font-medium text-gray-500 dark:text-gray-400">Konfirmasi Kata Sandi</label>
            <input
              v-model="profileData.confirmPassword"
              type="password"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
              placeholder="Ulangi kata sandi baru"
            />
          </div>

          <button
            @click="changePassword"
            :disabled="changingPassword"
            class="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-outfit text-xs font-bold text-amber-600 transition hover:bg-amber-500/20 active:scale-95 disabled:opacity-50 dark:text-amber-400"
          >
            {{ changingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi' }}
          </button>
        </div>
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

      <!-- Pengaturan Pajak -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pengaturan Pajak</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Konfigurasi pajak untuk transaksi</p>
        </div>
        <div class="space-y-4 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Aktifkan Pajak</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Pajak akan ditambahkan ke total transaksi</p>
            </div>
            <button
              @click="formData.tax_enabled = !formData.tax_enabled"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                formData.tax_enabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  formData.tax_enabled ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
          <div v-if="formData.tax_enabled">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Tarif Pajak (%)
            </label>
            <input
              v-model.number="formData.tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="11"
            />
          </div>
          <div class="flex justify-end pt-1">
            <button
              @click="saveTaxSection"
              :disabled="savingTax"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <svg v-if="savingTax" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ savingTax ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
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

    </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/components/layout/ThemeProvider.vue'
import { useNetwork } from '@/lib/network'
import BackupStatus from '@/views/Sync/BackupStatus.vue'
import { supabase } from '@/lib/supabase'

const settingsStore = useStoreSettingsStore()
const authStore = useAuthStore()
const syncStore = useSyncStore()
const toast = useToast()
const { isDarkMode, toggleTheme } = useTheme()
const { isOnline } = useNetwork()

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const changingPassword = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const syncError = ref<string | null>(null)
const lastSyncLabel = ref<string | null>(null)

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

// Per-section saving state
const savingStore = ref(false)
const savingTax = ref(false)
const savingProfile = ref(false)

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
      tax_enabled: formData.tax_enabled,
      tax_rate: formData.tax_rate,
    })
    toast.success('Berhasil!', 'Informasi toko berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan informasi toko')
  } finally {
    savingStore.value = false
  }
}

const saveTaxSection = async () => {
  savingTax.value = true
  try {
    await settingsStore.updateSettings({
      store_name: formData.store_name.trim() || 'Ucup Kasir',
      store_subtitle: formData.store_subtitle.trim() || 'Toko',
      store_address: formData.store_address.trim(),
      store_phone: formData.store_phone.trim(),
      store_email: formData.store_email.trim(),
      receipt_footer: formData.receipt_footer.trim(),
      tax_enabled: formData.tax_enabled,
      tax_rate: formData.tax_rate,
    })
    toast.success('Berhasil!', 'Pengaturan pajak berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan pengaturan pajak')
  } finally {
    savingTax.value = false
  }
}

const saveProfileSection = async () => {
  savingProfile.value = true
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profileData.fullName.trim(),
        phone: profileData.phone.trim() || undefined,
        avatar_url: profileData.avatarUrl || undefined,
      },
    })
    if (error) throw error
    toast.success('Berhasil!', 'Informasi profil berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan profil')
  } finally {
    savingProfile.value = false
  }
}

const expandedSections = reactive({
  store: false,
  tax: false,
  display: false,
  profile: false,
  security: false,
  backup: false,
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
  tax_enabled: false,
  tax_rate: 0,
  receipt_footer: '',
})

const profileData = reactive({
  avatarUrl: '',
  fullName: '',
  phone: '',
  newPassword: '',
  confirmPassword: '',
})

const profileInitial = computed(() => {
  const name = profileData.fullName.trim() || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

const loadProfile = () => {
  const meta = authStore.user?.user_metadata || {}
  profileData.fullName = (meta.full_name as string) || ''
  profileData.phone = (meta.phone as string) || ''
  profileData.avatarUrl = (meta.avatar_url as string) || ''
}

const handleAvatarSelected = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.error('Gagal!', 'File harus berupa gambar (JPG/PNG/WebP)')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.error('Gagal!', 'Ukuran foto maksimal 2 MB')
    return
  }

  uploading.value = true
  try {
    const userId = authStore.user?.id
    if (!userId) throw new Error('User tidak ditemukan')

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    profileData.avatarUrl = data.publicUrl
    toast.success('Berhasil!', 'Foto profil diunggah')
  } catch (error) {
    console.error('Error uploading avatar:', error)
    toast.error('Gagal!', 'Gagal mengunggah foto profil')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const changePassword = async () => {
  if (changingPassword.value) return
  if (profileData.newPassword.length < 6) {
    toast.error('Gagal!', 'Kata sandi minimal 6 karakter')
    return
  }
  if (profileData.newPassword !== profileData.confirmPassword) {
    toast.error('Gagal!', 'Konfirmasi kata sandi tidak cocok')
    return
  }

  changingPassword.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: profileData.newPassword })
    if (error) throw error
    profileData.newPassword = ''
    profileData.confirmPassword = ''
    toast.success('Berhasil!', 'Kata sandi berhasil diperbarui')
  } catch (error) {
    console.error('Error changing password:', error)
    toast.error('Gagal!', 'Gagal memperbarui kata sandi')
  } finally {
    changingPassword.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    // Save store settings
    await settingsStore.updateSettings({
      store_name: formData.store_name.trim() || 'Ucup Kasir',
      store_subtitle: formData.store_subtitle.trim() || 'Toko Berkat Jaya Makmur',
      store_address: formData.store_address.trim(),
      store_phone: formData.store_phone.trim(),
      store_email: formData.store_email.trim(),
      tax_enabled: formData.tax_enabled,
      tax_rate: formData.tax_rate,
      receipt_footer: formData.receipt_footer.trim(),
    })

    // Save profile data
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: profileData.fullName.trim(),
        phone: profileData.phone.trim() || undefined,
        avatar_url: profileData.avatarUrl || undefined,
      },
    })
    if (error) throw error

    toast.success('Berhasil!', 'Semua pengaturan berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan pengaturan')
  } finally {
    saving.value = false
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
  formData.tax_enabled = s.tax_enabled || false
  formData.tax_rate = s.tax_rate || 0
  formData.receipt_footer = s.receipt_footer || ''
  loadProfile()

  // Muat info backup
  await syncStore.loadInfo()
  lastSyncLabel.value = syncStore.lastSyncAt || null
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
