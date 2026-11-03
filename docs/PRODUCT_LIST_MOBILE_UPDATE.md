# Update Tampilan Mobile Halaman Daftar Produk

## Ringkasan
Memperbarui tampilan mobile pada halaman daftar produk agar lebih terstruktur, rapi, dan informatif dengan desain yang lebih modern.

## Perubahan yang Dibuat

### 1. Search Bar
**Sebelum:** Search bar sederhana dengan border
**Sesudah:** Search bar dalam card dengan shadow, icon yang lebih besar, dan spacing yang lebih lapang

```
- Background: white card dengan border dan shadow
- Padding lebih lapang (py-3)
- Icon search lebih besar (4.5x4.5)
- Placeholder lebih deskriptif
```

### 2. Filter Chips
**Sebelum:** Filter chips langsung di bawah search, scrollable horizontal
**Sesudah:** Filter chips dalam card terpisah dengan header "Filter Status"

```
- Wrapped dalam card dengan border dan shadow
- Header dengan icon filter dan label
- Pills lebih modern dengan rounded-lg
- Spacing antar chip lebih konsisten
- Counter dalam opacity 70% untuk hierarchy visual
```

### 3. Product Cards
**Perubahan Mayor:**

**Layout:**
- **Sebelum:** Card dengan expand/collapse untuk detail harga
- **Sesudah:** Card dengan semua info langsung terlihat (no expand/collapse)

**Struktur Card:**
```
┌─────────────────────────────────────┐
│ Nama Produk              [Badge]    │
│ 🏷️ Kategori • SKU12345              │
│                                      │
│ ┌──────┐  ┌──────┐  ┌──────┐       │
│ │ Stok │  │ Beli │  │ Jual │       │
│ │  25  │  │ 10rb │  │ 15rb │       │
│ │ pcs  │  │      │  │      │       │
│ └──────┘  └──────┘  └──────┘       │
│                                      │
│ [Detail]  [Edit]  [🗑]              │
└─────────────────────────────────────┐
```

**Komponen Detail:**

1. **Header Section:**
   - Nama produk (font bold, text-sm)
   - Badge status (Aman/Menipis/Habis) di kanan atas
   - Kategori dengan icon + SKU (jika ada)

2. **Stats Grid (3 kolom):**
   - **Kolom Stok:** 
     - Background gray
     - Angka besar dengan warna dinamis (hijau/kuning/merah)
     - Label "pcs" di bawah
   
   - **Kolom Harga Beli:**
     - Background gray
     - Format ringkas (10rb, 1.5jt)
   
   - **Kolom Harga Jual:**
     - Background brand (biru)
     - Format ringkas
     - Highlight sebagai harga utama

3. **Action Buttons:**
   - 3 tombol: Detail (outline), Edit (brand primary), Hapus (icon only)
   - Spacing konsisten dengan gap-2
   - Active scale effect untuk feedback

### 4. Empty State
**Perubahan:**
- Icon dalam circle dengan background
- Text hierarchy lebih jelas
- Spacing lebih lapang (p-12)

### 5. Loading Skeleton
**Perubahan:**
- Skeleton sesuai struktur card baru
- Tampilkan 3 box untuk stats grid
- Spacing dan sizing konsisten

### 6. Pagination
**Perubahan:**
- Wrapped dalam card dengan border dan shadow
- Info halaman lebih detail (total produk)
- Button dengan icon arrow (bukan text)
- Disabled state lebih jelas

## Fungsi Baru

### formatCurrencyShort()
Fungsi untuk memformat harga dalam format ringkas:
- < 1000: "Rp 500"
- >= 1000: "10rb", "150rb"
- >= 1.000.000: "1jt", "2.5jt"

```typescript
const formatCurrencyShort = (value: number) => {
  if (!value) return 'Rp 0'
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}jt`.replace('.0', '')
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}rb`
  }
  return `Rp ${value}`
}
```

## Perbaikan UX

1. **Informasi Lebih Cepat:**
   - Tidak perlu expand card untuk lihat harga
   - Semua info penting langsung terlihat

2. **Hierarchy Visual:**
   - Harga jual di-highlight dengan background brand
   - Stok dengan warna dinamis (hijau/kuning/merah)
   - Badge status langsung terlihat

3. **Spacing & Rhythm:**
   - Konsisten menggunakan gap-2, gap-3
   - Card spacing 3 unit
   - Section padding 4 unit

4. **Touch Target:**
   - Button minimal 40px (h-10)
   - Spacing antar button cukup untuk finger
   - Active scale feedback

5. **Dark Mode:**
   - Semua komponen support dark mode
   - Border dan background disesuaikan

## Keunggulan Desain Baru

✅ **Lebih Informatif** - Semua data penting langsung terlihat
✅ **Lebih Rapi** - Layout terstruktur dengan grid system
✅ **Lebih Modern** - Card design dengan shadow dan rounded corners
✅ **Lebih Cepat** - Tidak perlu expand/collapse untuk akses info
✅ **Lebih Konsisten** - Spacing dan sizing mengikuti design system
✅ **Better Hierarchy** - Visual hierarchy jelas (harga jual = primary)

## File yang Diubah

- `src/views/Products/ProductList.vue` - Update tampilan mobile section

## Breaking Changes

Tidak ada breaking changes. Tampilan desktop tetap menggunakan DataTable component yang sama.

## Testing

1. Buka halaman `/products` di mobile browser atau emulator
2. Verifikasi:
   - Search bar responsive dan functional
   - Filter chips scrollable horizontal
   - Product cards menampilkan semua info
   - Stats grid (3 kolom) rapi
   - Action buttons mudah di-tap
   - Pagination functional
   - Empty state tampil dengan benar
   - Loading skeleton sesuai struktur card
   - Dark mode berfungsi dengan baik

## Screenshots Concept

**Card Structure:**
```
┌─────────────────────────────────────────┐
│  Nama Produk Panjang          [AMAN]   │  ← Header
│  🏷️ Makanan • SKU123                   │  ← Metadata
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  Stok   │ │  Beli   │ │  Jual   │  │  ← Stats Grid
│  │   25    │ │  10rb   │ │  15rb   │  │
│  │  pcs    │ │         │ │         │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  [Detail]    [Edit]    [🗑️]            │  ← Actions
└─────────────────────────────────────────┘
```

## Notes

- Removed expand/collapse pattern untuk simplicity
- Format harga ringkas menghemat space tanpa mengurangi clarity
- 3-column stats grid optimal untuk mobile (tidak terlalu penuh, tidak terlalu kosong)
- Badge status langsung terlihat (tidak perlu scroll atau expand)
