# 📋 Testing Guide: Fix Laporan Laba Rugi Payment-Only

## Quick Summary

**Bug:** Laporan laba rugi tidak menampilkan data saat hanya ada pembayaran (tanpa transaksi baru)
**Fix:** Query sekarang include transaksi yang punya pembayaran dalam periode
**Status:** ✅ Code Complete | 🔄 Manual Testing Required

## 🧪 Manual Testing Guide

### Prerequisites
```bash
# 1. Build project
npm run build

# 2. Sync ke Android (jika test di mobile)
npx cap sync

# 3. Start dev server
npm run dev
```

### Test Case 1: Baseline (Existing Functionality)
**Tujuan:** Pastikan existing functionality tidak break

**Steps:**
1. Buka Laporan > Laporan Laba Rugi
2. Pilih periode hari ini
3. Pastikan ada transaksi yang dibuat hari ini
4. Verifikasi semua card menampilkan data yang benar

**Expected Result:**
- ✅ Omzet Bersih sesuai total transaksi
- ✅ Kas Masuk sesuai pembayaran
- ✅ Laba Terealisasi sesuai perhitungan
- ✅ Top 5 produk muncul

---

### Test Case 2: BUG FIX UTAMA - Pembayaran Luar Periode
**Tujuan:** Verify fix untuk transaksi lama dengan pembayaran baru

**Setup:**
```sql
-- Di Supabase SQL Editor atau via app:
-- 1. Buat transaksi kredit di tanggal lalu (misalnya 20 Okt)
--    Customer: Test Customer
--    Total: Rp 1.000.000
--    Status: belum_lunas
--    
-- 2. Buat pembayaran untuk transaksi tersebut HARI INI (31 Okt)
--    Amount: Rp 500.000
```

**Steps:**
1. Buka Laporan > Laporan Laba Rugi
2. Pilih periode: **31 Oktober 2026** (hari ini saja)
3. Periksa data yang muncul

**Expected Result (AFTER FIX):**
- ✅ **Kas Masuk: Rp 500.000** (menampilkan pembayaran hari ini)
- ✅ **Laba Terealisasi: (proporsi dari Rp 500k)** (bertambah sesuai pembayaran)
- ✅ Transaksi dari 20 Okt **muncul di list** meskipun created_at di luar periode
- ✅ Detail transaksi menunjukkan "Kas Diterima: Rp 500.000"

**Before Fix (Bug Behavior):**
- ❌ Semua card Rp 0
- ❌ Transaksi dari 20 Okt tidak muncul
- ❌ Kas masuk tidak tercatat

---

### Test Case 3: Multiple Payments Satu Transaksi
**Tujuan:** Verify filter pembayaran berdasarkan payment_date

**Setup:**
```
1. Buat transaksi kredit Rp 2.000.000 tanggal 25 Okt
2. Bayar DP Rp 500k tanggal 25 Okt
3. Bayar cicilan Rp 500k tanggal 31 Okt (hari ini)
4. (Optional) Bayar cicilan Rp 500k tanggal 5 Nov (masa depan)
```

**Steps:**
1. Pilih periode: **31 Oktober saja**
2. Check Kas Masuk

**Expected Result:**
- ✅ Kas Masuk: **Rp 500.000** (hanya cicilan tanggal 31 Okt)
- ✅ Tidak termasuk DP tanggal 25 Okt
- ✅ Tidak termasuk cicilan tanggal 5 Nov

**Steps:**
1. Pilih periode: **25-31 Oktober**
2. Check Kas Masuk

**Expected Result:**
- ✅ Kas Masuk: **Rp 1.000.000** (DP + cicilan = Rp 500k + Rp 500k)

---

### Test Case 4: Mix Transaksi Baru + Pembayaran Lama
**Tujuan:** Verify agregasi yang benar

**Setup:**
```
1. Buat transaksi BARU lunas Rp 1.000.000 hari ini (31 Okt)
2. Ada transaksi LAMA dengan pembayaran Rp 500k hari ini (dari Test Case 2)
```

**Steps:**
1. Pilih periode: **31 Oktober**
2. Check Kas Masuk

**Expected Result:**
- ✅ Kas Masuk: **Rp 1.500.000** (Rp 1jt + Rp 500k)
- ✅ Kedua transaksi muncul di list
- ✅ Total transaksi = 2

---

### Test Case 5: Edge Case - Transaksi Tanpa Pembayaran
**Tujuan:** Verify tidak ada regression untuk transaksi tempo

**Setup:**
```
1. Buat transaksi kredit Rp 1.000.000 hari ini
2. TIDAK ada pembayaran sama sekali
```

**Steps:**
1. Pilih periode: **31 Oktober**
2. Check data

**Expected Result:**
- ✅ Kas Masuk: **Rp 0**
- ✅ Piutang: **Rp 1.000.000**
- ✅ Transaksi muncul dengan status "Belum Lunas"
- ✅ Laba Terealisasi: **Rp 0**
- ✅ Laba Tertahan: **(sesuai laba kotor transaksi)**

---

## 📱 Mobile Android Testing

### Responsive Layout Check
1. Buka app di Android device
2. Navigasi ke Laporan > Laporan Laba Rugi
3. Verify:
   - ✅ 4 cards di layout **2 kolom** (grid-cols-2)
   - ✅ Semua text readable (tidak terpotong)
   - ✅ Angka formatted dengan benar
   - ✅ Filter modal berfungsi
   - ✅ Scroll smooth tanpa lag

### Performance Check
1. Pilih periode dengan banyak data (misalnya 1 bulan penuh)
2. Monitor:
   - ⏱️ Loading time < 5 detik
   - 📊 Data muncul lengkap
   - 🔄 Tidak ada freeze/hang

---

## 🐛 Regression Testing

### Areas to Check:
1. **Laporan Penjualan** (halaman lain)
   - Pastikan tidak terpengaruh oleh perubahan
   
2. **Invoice per Customer**
   - Verifikasi pembayaran tetap tercatat dengan benar
   
3. **Detail Transaksi**
   - Check laba terealisasi per transaksi akurat

4. **Filter Status Pembayaran**
   - Test filter "Lunas", "Tempo", "Semua"
   - Pastikan masih berfungsi dengan benar

---

## ✅ Success Criteria

### Must Pass:
- [x] Build berhasil tanpa error
- [x] Type check pass
- [ ] Test Case 2 (PRIMARY BUG FIX) pass
- [ ] Kas Masuk akurat untuk pembayaran dalam periode
- [ ] Tidak ada regression di existing functionality

### Should Pass:
- [ ] Semua 5 test cases pass
- [ ] Mobile layout responsive
- [ ] Performance acceptable (< 5s load time)

### Nice to Have:
- [ ] Test dengan data produksi
- [ ] Load test dengan periode 1 tahun

---

## 📝 Testing Notes Template

Gunakan template ini untuk dokumentasi testing:

```
## Test Session: [Date/Time]
**Tester:** [Your Name]
**Environment:** [Web/Android]
**Device:** [Browser/Phone Model]

### Test Case 2 - PRIMARY BUG FIX
- [ ] Pass
- [ ] Fail

**Details:**
- Transaksi lama: [ID/Date]
- Pembayaran baru: [Amount/Date]
- Kas Masuk expected: [Amount]
- Kas Masuk actual: [Amount]
- Notes: [Any observations]

### Test Case 3 - Multiple Payments
- [ ] Pass
- [ ] Fail

**Details:** ...

### Regression Check
- [ ] Laporan Penjualan: OK
- [ ] Invoice per Customer: OK
- [ ] Filter Status: OK

### Performance
- Load time: [X seconds]
- Memory usage: [Normal/High]
- Smooth scrolling: [Yes/No]

### Issues Found
1. [Issue description]
2. [Issue description]

### Screenshots
- [Link to screenshots]
```

---

## 🚨 Red Flags to Watch

1. **Kas Masuk = 0 padahal ada pembayaran**
   - Check: payment_date apakah dalam periode?
   - Check: filter date range di query

2. **Duplicate transaksi di list**
   - Check: deduplikasi di merge logic
   - Should not happen (sudah ada filter `!existingTxnIds.has(id)`)

3. **Laba Terealisasi tidak match kas masuk**
   - Check: calculateRealizedProfitFromItems
   - Verify: transaction_item_payments data

4. **Performance sangat lambat**
   - Check: jumlah transaksi dalam periode
   - Consider: add loading skeleton/progress indicator

---

## 📞 Next Steps After Testing

### If All Tests Pass:
1. Mark Task #4 as completed
2. Commit changes dengan message yang jelas
3. Create PR ke branch main
4. Update bug report dengan test results

### If Tests Fail:
1. Document failure details dengan screenshot
2. Analyze root cause
3. Fix dan re-test
4. Update changelog dengan additional fixes

---

**Happy Testing! 🎉**
