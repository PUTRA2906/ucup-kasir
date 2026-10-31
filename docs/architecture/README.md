# 📚 Dokumentasi Struktur Project Ucup Kasir

Selamat datang! Ini adalah dokumentasi lengkap untuk memahami struktur kode aplikasi Ucup Kasir.

---

## 🎯 Untuk Siapa Dokumentasi Ini?

- **Developer baru** yang join project
- **Developer yang ingin memahami codebase**
- **Yourself** di masa depan ketika lupa struktur project
- **Team member** yang ingin kontribusi

---

## 📖 Daftar Dokumentasi

Dokumentasi dipecah menjadi beberapa file untuk kemudahan pembacaan:

### 1️⃣ **ARCHITECTURE.md** — Arsitektur Aplikasi
**Baca ini pertama!**

Membahas:
- Overview arsitektur 3-layer (Views → Stores → Services → Supabase)
- Alur data (Read flow, Write flow, Transaction flow)
- Key principles (Separation of Concerns, Type Safety, Error Logging)
- Diagram arsitektur lengkap
- Best practices & anti-patterns

**Estimasi waktu baca:** 15 menit

[📄 Baca ARCHITECTURE.md](./ARCHITECTURE.md)

---

### 2️⃣ **FOLDER_STRUCTURE.md** — Struktur Folder
**Referensi cepat!**

Membahas:
- Struktur folder lengkap (root sampai detail)
- Isi setiap folder (89 components, 17 services, 17 stores, 100+ pages)
- File counts per direktori
- Import paths & conventions

**Estimasi waktu baca:** 10 menit

[📄 Baca FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)

---

### 3️⃣ **SERVICES_GUIDE.md** — Panduan Services Layer
**Deep dive services!**

Membahas:
- Apa itu services layer?
- Service pattern (CRUD operations)
- RPC functions (atomic transactions)
- Error handling
- 20 services yang ada di project
- Best practices & common patterns

**Estimasi waktu baca:** 20 menit

[📄 Baca SERVICES_GUIDE.md](./SERVICES_GUIDE.md)

---

### 4️⃣ **STORES_GUIDE.md** — Panduan Stores Layer
**Deep dive Pinia stores!**

Membahas:
- Apa itu stores layer?
- Store pattern dengan Composition API
- State management (reactive, computed)
- Actions (fetch, create, update, delete)
- Getters (filtered, sorted, search)
- 17 stores yang ada di project
- Best practices & usage dalam views

**Estimasi waktu baca:** 20 menit

[📄 Baca STORES_GUIDE.md](./STORES_GUIDE.md)

---

## 🚀 Cara Menggunakan Dokumentasi

### Untuk Developer Baru:

**Hari 1: Memahami Big Picture**
1. ✅ Baca `ARCHITECTURE.md` — Pahami arsitektur 3-layer
2. ✅ Baca `FOLDER_STRUCTURE.md` — Kenali struktur folder
3. ✅ Clone repo dan explore codebase dengan VSCode

**Hari 2-3: Deep Dive**
1. ✅ Baca `SERVICES_GUIDE.md` — Pahami data access layer
2. ✅ Baca `STORES_GUIDE.md` — Pahami state management
3. ✅ Baca `CLAUDE.md` di root project — Project-specific guidelines
4. ✅ Run `npm run dev` dan explore aplikasi

**Hari 4-5: Hands-on**
1. ✅ Buat fitur kecil (misal: add field baru di product form)
2. ✅ Follow pattern yang sudah ada
3. ✅ Test di browser
4. ✅ Commit dengan convention yang benar

---

### Untuk Development Fitur Baru:

**Langkah-langkah:**

1. **Planning** (5-10 menit)
   - Baca dokumentasi terkait (misal: untuk fitur laporan, baca `SERVICES_GUIDE.md` section Reports)
   - Identifikasi file mana yang harus diubah/dibuat

2. **Database** (jika perlu)
   - Buat migration file di `supabase/migrations/`
   - Jalankan migration di Supabase Dashboard
   - Update types di `src/types/database.ts`

3. **Service Layer** (jika perlu)
   - Tambah/update functions di `src/services/`
   - Follow pattern CRUD yang sudah ada
   - Test di browser console

4. **Store Layer** (jika perlu)
   - Tambah/update store di `src/stores/`
   - Follow Composition API pattern
   - Test dengan Vue DevTools

5. **View Layer**
   - Buat/update components di `src/components/`
   - Buat/update pages di `src/views/`
   - Follow UI conventions (DateField, SelectField, ConfirmDialog)
   - Test manual di browser

6. **Testing**
   - Type check: `npm run type-check`
   - Build check: `npm run build`
   - Manual testing di browser
   - Test edge cases

7. **Documentation**
   - Update `CLAUDE.md` jika ada pattern baru
   - Update dokumentasi ini jika struktur berubah

---

### Untuk Debugging:

**Step-by-step debugging:**

1. **Identify layer yang error**
   - UI error? → Check `src/views/` dan `src/components/`
   - Data error? → Check `src/stores/`
   - API error? → Check `src/services/`
   - Database error? → Check Supabase logs

2. **Check Event Log**
   - Buka `/settings/event-log`
   - Filter by level (error, warning)
   - Filter by source (supabase, auth, transaction)
   - Lihat detail error (table, operation, filters)

3. **Check Browser Console**
   - Open DevTools (F12)
   - Check console for errors
   - Check Network tab for failed requests

4. **Check Vue DevTools**
   - Install Vue DevTools extension
   - Inspect component state
   - Check Pinia stores
   - View events

5. **Check Supabase Dashboard**
   - Database logs
   - Auth logs
   - API logs

---

## 📊 Quick Stats

### Project Size

| Metric | Count |
|--------|-------|
| Components | **89** |
| Services | **20** |
| Stores | **17** |
| Pages (Views) | **100+** |
| Composables | **12** |
| Icons | **50+** |
| Lines of Code | **~50,000** |

### Tech Stack

- **Frontend:** Vue 3 + TypeScript + Tailwind CSS
- **State:** Pinia
- **Router:** Vue Router 4
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Mobile:** Capacitor (Android)
- **Charts:** ApexCharts
- **PDF:** jsPDF
- **Build:** Vite

---

## 🎓 Learning Resources

### Vue 3
- [Vue 3 Official Docs](https://vuejs.org/)
- [Composition API Guide](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Vue 3 Cheat Sheet](https://vue-cheatsheet.themeselection.com/)

### Pinia
- [Pinia Official Docs](https://pinia.vuejs.org/)
- [Why Pinia instead of Vuex](https://pinia.vuejs.org/introduction.html#comparison-with-vuex)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

### Tailwind CSS
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)

---

## 🔑 Key Takeaways

### Arsitektur 3-Layer
```
View → Store → Service → Supabase
  ↑       ↑        ↑         ↑
  UI    State   Business  Database
```

### Aturan Emas
1. ❌ **JANGAN** import Supabase langsung di View
2. ✅ **GUNAKAN** Store untuk state management
3. ✅ **GUNAKAN** Service untuk akses database
4. ❌ **JANGAN** pakai native dialogs (`alert`, `confirm`)
5. ✅ **GUNAKAN** custom components (`ConfirmDialog`, `DateField`, `SelectField`)
6. ✅ **GUNAKAN** RPC functions untuk transaksi kompleks
7. ✅ **THROW** error di services (jangan return `{data, error}`)
8. ✅ **HANDLE** loading & error states di stores
9. ✅ **TYPE** semua data dengan TypeScript

### Transaction Pattern
```typescript
// ✅ GOOD: Use RPC (atomic)
await supabase.rpc('create_transaction', params)

// ❌ BAD: Multiple queries (not atomic)
await supabase.from('transactions').insert({...})
await supabase.from('transaction_items').insert([...])
await supabase.from('products').update({...})
```

### Price Matrix Priority
1. **Customer-specific price** (highest)
2. **Group price**
3. **Quantity tier price**
4. **Default price** (lowest)

---

## 🤝 Contributing

Saat contribute ke project:

1. **Follow existing patterns** — Jangan reinvent the wheel
2. **Read relevant docs** — Baca dokumentasi layer yang akan diubah
3. **Type everything** — Full TypeScript
4. **Test before commit** — `npm run type-check && npm run build`
5. **Follow commit conventions** — `feat:`, `fix:`, `refactor:`, dll
6. **Update docs if needed** — Jika ada perubahan struktur/pattern

---

## 📝 Maintenance

### Update Dokumentasi

Dokumentasi ini harus di-update ketika:
- ✅ Ada service baru
- ✅ Ada store baru
- ✅ Ada pattern baru yang established
- ✅ Struktur folder berubah
- ✅ Best practices berubah

**Last updated:** 2026-10-30

---

## 💬 Questions?

Jika ada pertanyaan atau menemukan error di dokumentasi:

1. Baca ulang dokumentasi terkait
2. Check `CLAUDE.md` di root project
3. Check code examples di project
4. Ask team member atau lead developer

---

## ✨ Happy Coding!

Semoga dokumentasi ini membantu kamu memahami dan develop aplikasi Ucup Kasir dengan lebih mudah!

**Remember:**
- 📖 Documentation is your friend
- 🎯 Follow the patterns
- 🧪 Test your code
- 💡 Ask when stuck
- 🚀 Keep learning!

---

**Made with ❤️ for Ucup Kasir Team**
