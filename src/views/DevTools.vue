<template>
  <div class="container mx-auto px-4 py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Developer Tools</h1>
      <p class="text-sm text-gray-600 mt-1">Utility untuk debugging dan perbaikan database</p>
    </div>

    <!-- Migration Fix Section -->
    <div class="space-y-4">
      <MigrationFixButton />

      <!-- Info Tambahan -->
      <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 class="text-sm font-semibold text-blue-900 mb-2">Kapan harus pakai ini?</h3>
        <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Error: "table transaction_payments has no column named payment_date"</li>
          <li>Error saat menambah pembayaran di transaksi kredit</li>
          <li>Setelah update aplikasi dan ada perubahan struktur database</li>
        </ul>
      </div>

      <!-- Reset Database Warning -->
      <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 class="text-sm font-semibold text-red-900 mb-2">⚠️ Peringatan Reset Database</h3>
        <ul class="text-xs text-red-800 space-y-1 list-disc list-inside">
          <li>Reset Database akan <strong>menghapus SEMUA data lokal</strong></li>
          <li>Data di cloud (Supabase) tetap aman</li>
          <li>Setelah reset, lakukan sync ulang untuk download data dari cloud</li>
          <li>Gunakan hanya jika migration fix tidak berhasil</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MigrationFixButton from '@/components/dev/MigrationFixButton.vue'
</script>
