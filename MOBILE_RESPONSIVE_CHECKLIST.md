# Checklist Perbaikan Responsivitas Mobile
**Tanggal:** 19 Agustus 2026  
**Status:** 🔄 Dalam Progress

---

## 📱 Area yang Perlu Diperbaiki

### ✅ Sudah Diperbaiki:
1. ✅ **StockAdjustmentModal.vue**
   - Transisi slide-up dari bawah untuk mobile
   - Button tipe penyesuaian responsif
   - Preview perubahan dengan layout grid responsif
   - Spacing dan padding yang disesuaikan untuk mobile

### 🔄 Sedang Dikerjakan:
2. **DataTable.vue** - Tabel data perlu perbaikan mobile
   - Scroll horizontal untuk tabel besar
   - Card view untuk mobile
   - Filter dan search yang lebih mudah diakses di mobile

### 📋 Antrian Perbaikan:

#### Layout & Navigation
3. **AdminLayout.vue** - Layout utama
   - Sidebar collapse otomatis di mobile
   - Bottom navigation untuk mobile
   - Padding dan margin yang konsisten

4. **AppHeader.vue** - Header navbar
   - Menu hamburger untuk mobile
   - Search bar collapse di mobile
   - Notifikasi dropdown responsif

5. **AppSidebar.vue** - Sidebar navigasi
   - Drawer animation untuk mobile
   - Touch-friendly link sizes
   - Icon-only mode untuk narrow screens

#### Dashboard & Stats
6. **Ecommerce.vue** (Dashboard)
   - Stats cards 1 kolom di mobile
   - Button actions stack vertical
   - Chart responsif untuk mobile

7. **DashboardStats.vue**
   - Grid 1-2 kolom di mobile
   - Font size yang lebih kecil
   - Icon size responsif

#### Product Management
8. **ProductList.vue**
   - Card view untuk mobile
   - Quick actions accessible
   - Image thumbnail size responsif

9. **AddProduct.vue / EditProduct.vue**
   - Form layout 1 kolom di mobile
   - Upload image area yang lebih besar
   - Button positioning untuk mobile

10. **ProductDetail.vue**
    - Info layout stack vertical
    - Action buttons full width di mobile
    - Image gallery swipe untuk mobile

#### Transaction & Invoice
11. **TransactionList.vue**
    - Transaction cards untuk mobile
    - Status badges lebih kecil
    - Quick filter dropdown

12. **AddTransaction.vue**
    - Product picker modal full screen
    - Cart items lebih compact
    - Keypad untuk input angka

13. **TransactionDetail.vue**
    - Info sections stack vertical
    - Print button sticky di bottom
    - Return/refund modal full screen

14. **InvoicePage.vue**
    - Invoice layout responsif
    - Print view optimized
    - Share button untuk mobile

#### Customer Management
15. **CustomerList.vue**
    - Customer cards untuk mobile
    - Quick contact buttons
    - Filter modal full screen

16. **CustomerDetail.vue**
    - Tabs untuk sections
    - Transaction history cards
    - Contact actions sticky

#### Stock Management
17. **StockManagement.vue**
    - Stats cards 2 kolom di mobile
    - Stock table card view
    - Quick action buttons

18. **StockMovements.vue**
    - Movement cards dengan timeline
    - Filter date picker mobile-friendly
    - Export button accessible

19. **StockOpnameModal.vue**
    - Product list scroll vertical
    - Input fields touch-friendly
    - Save button sticky bottom

#### Reports
20. **SalesReport.vue**
    - Date filter dropdown di mobile
    - Chart full width dengan scroll
    - Stats cards 1 kolom

21. **SalesSummaryCards.vue** ✅ (Sudah ada di memory: garis warna)
    - Grid 1-2 kolom responsif
    - Font size lebih kecil di mobile

22. **SalesSummaryDetail.vue**
    - Sections collapsible di mobile
    - Table scroll horizontal
    - Export button positioned

#### Settings & Others
23. **StoreSettings.vue**
    - Form sections stack vertical
    - Logo upload area lebih besar
    - Save button sticky

24. **CategoryList.vue**
    - Category cards 2 kolom mobile
    - Quick edit modal
    - Delete confirmation mobile-friendly

---

## 🎯 Prioritas Perbaikan

### High Priority (P0):
1. DataTable.vue - Paling banyak digunakan
2. AddTransaction.vue - Core feature
3. ProductList.vue - Frequently accessed
4. Dashboard (Ecommerce.vue) - First impression

### Medium Priority (P1):
5. StockManagement.vue
6. CustomerList.vue
7. TransactionList.vue
8. AdminLayout & Navigation

### Low Priority (P2):
9. Reports
10. Settings
11. Detail pages
12. Modals lainnya

---

## 📐 Standar Responsivitas

### Breakpoints:
```css
/* Tailwind default breakpoints */
sm: 640px   /* Small devices (landscape phones) */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (desktops) */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2XL devices */
```

### Mobile-First Guidelines:
1. **Spacing**: p-4 (mobile) → p-6 (desktop)
2. **Font Size**: text-sm/base (mobile) → text-base/lg (desktop)
3. **Buttons**: Full width atau flex-1 di mobile, auto width di desktop
4. **Grids**: 1-2 kolom (mobile) → 3-4 kolom (desktop)
5. **Modals**: Full screen bottom sheet (mobile) → centered dialog (desktop)
6. **Tables**: Card view (mobile) → Table view (desktop)
7. **Touch Targets**: Minimal 44x44px untuk mobile

### Component Patterns:
```vue
<!-- Stack vertical di mobile, horizontal di desktop -->
<div class="flex flex-col gap-4 sm:flex-row sm:items-center">

<!-- Full width di mobile, auto di desktop -->
<button class="w-full sm:w-auto">

<!-- Grid responsif -->
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

<!-- Hide di mobile, show di desktop -->
<div class="hidden md:block">

<!-- Show di mobile, hide di desktop -->
<div class="md:hidden">

<!-- Bottom sheet mobile, centered modal desktop -->
<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
  <div class="w-full rounded-t-2xl sm:max-w-lg sm:rounded-2xl">
```

---

## ✅ Checklist Perbaikan Per Komponen

Untuk setiap komponen yang diperbaiki, pastikan:
- [ ] Layout responsif (1 kolom mobile → multi kolom desktop)
- [ ] Font size responsif (text-sm mobile → text-base desktop)
- [ ] Padding/margin responsif (p-4 mobile → p-6 desktop)
- [ ] Button full width di mobile, auto di desktop
- [ ] Touch target minimal 44x44px
- [ ] Modal/dialog full screen di mobile
- [ ] Table jadi card view di mobile
- [ ] Image/icon size responsif
- [ ] No horizontal scroll (kecuali disengaja)
- [ ] Test di berbagai ukuran layar (320px - 1920px)

---

## 🚀 Progress Tracking

- **Total Komponen**: 24
- **Selesai**: 1 (4%)
- **Sedang Dikerjakan**: 1 (4%)
- **Belum Dimulai**: 22 (92%)

**Target**: Selesai dalam 2-3 hari
**Estimasi**: ~30 menit per komponen = ~12 jam total
