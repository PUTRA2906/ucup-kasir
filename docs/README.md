# 📚 Dokumentasi Project Ucup Kasir

Dokumentasi lengkap untuk memahami dan mengembangkan aplikasi Ucup Kasir.

---

## 🗂️ Struktur Dokumentasi

```
docs/
├── README.md                          # File ini (index)
├── NOTION_SETUP_GUIDE.md              # Setup Notion untuk project management
├── notion-templates/                  # Template Notion (markdown)
│   ├── README.md
│   ├── 01-new-project-template.md
│   ├── 02-feature-request-template.md
│   ├── 03-task-template.md
│   ├── 04-bug-report-template.md
│   ├── 05-sprint-planning-template.md
│   └── 06-meeting-notes-template.md
└── architecture/                      # Dokumentasi arsitektur teknis
    ├── README.md                      # Index arsitektur
    ├── ARCHITECTURE.md                # Arsitektur 3-layer
    ├── FOLDER_STRUCTURE.md            # Struktur folder detail
    ├── SERVICES_GUIDE.md              # Panduan services layer
    └── STORES_GUIDE.md                # Panduan stores layer
```

---

## 🚀 Quick Start

### Untuk Developer Baru

**Hari 1: Setup & Big Picture**
1. ✅ Baca [architecture/README.md](./architecture/README.md) — Overview dokumentasi
2. ✅ Baca [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) — Pahami arsitektur
3. ✅ Setup development environment:
   ```bash
   git clone <repo-url>
   cd ucup-kasir
   npm install
   cp .env.example .env  # Edit dengan credentials Supabase
   npm run dev
   ```

**Hari 2-3: Deep Dive**
1. ✅ Baca [architecture/FOLDER_STRUCTURE.md](./architecture/FOLDER_STRUCTURE.md)
2. ✅ Baca [architecture/SERVICES_GUIDE.md](./architecture/SERVICES_GUIDE.md)
3. ✅ Baca [architecture/STORES_GUIDE.md](./architecture/STORES_GUIDE.md)
4. ✅ Explore codebase dengan VSCode
5. ✅ Baca [CLAUDE.md](../CLAUDE.md) di root — Project-specific guidelines

**Hari 4-5: Hands-on**
1. ✅ Pilih issue kecil dari backlog
2. ✅ Implement dengan mengikuti pattern yang ada
3. ✅ Test & commit
4. ✅ Create PR

---

## 📖 Dokumentasi Utama

### 1. Project Management

#### [NOTION_SETUP_GUIDE.md](./NOTION_SETUP_GUIDE.md)
Setup Notion workspace untuk manage project dari planning sampai deployment.

**Topics:**
- Setup databases (Projects, Features, Bugs, Sprints)
- Buat templates
- Workflow management
- Daily routine

**Waktu baca:** 30 menit  
**Waktu setup:** 45 menit

#### [notion-templates/](./notion-templates/)
Template markdown siap pakai untuk copy-paste ke Notion.

**Includes:**
- Project template
- Feature request template
- Bug report template
- Sprint planning template
- Meeting notes template

---

### 2. Arsitektur Teknis

#### [architecture/README.md](./architecture/README.md) ⭐ **START HERE**
Index dokumentasi arsitektur dengan quick stats dan learning path.

**Topics:**
- Overview semua dokumentasi
- Quick stats (89 components, 20 services, 17 stores)
- Learning resources
- Key takeaways

**Waktu baca:** 5 menit

---

#### [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) 🎯 **BACA PERTAMA**
Arsitektur aplikasi 3-layer dengan diagram dan alur data lengkap.

**Topics:**
- Overview arsitektur (Views → Stores → Services → Supabase)
- Alur data (Read flow, Write flow, Transaction flow)
- Key principles (Separation of Concerns, Type Safety, Error Logging)
- Diagram arsitektur
- Best practices & anti-patterns

**Waktu baca:** 15 menit

---

#### [architecture/FOLDER_STRUCTURE.md](./architecture/FOLDER_STRUCTURE.md) 📁
Struktur folder lengkap dengan detail isi setiap folder.

**Topics:**
- Struktur overview (root → src → detail)
- 89 components (common, forms, layout, dll)
- 20 services (products, transactions, finance, dll)
- 17 stores (auth, products, transactions, dll)
- 100+ pages/views
- File naming conventions
- Import paths

**Waktu baca:** 10 menit

---

#### [architecture/SERVICES_GUIDE.md](./architecture/SERVICES_GUIDE.md) 🔧
Deep dive ke services layer (data access layer).

**Topics:**
- Apa itu services layer?
- Service pattern (CRUD operations)
- RPC functions (atomic transactions)
- Error handling (throw vs return)
- 20 services yang ada
- Best practices & common patterns
- Testing services

**Waktu baca:** 20 menit

---

#### [architecture/STORES_GUIDE.md](./architecture/STORES_GUIDE.md) 📦
Deep dive ke stores layer (state management dengan Pinia).

**Topics:**
- Apa itu stores layer?
- Store pattern (Composition API)
- State management (reactive, computed)
- Actions (fetch, create, update, delete)
- Getters (filtered, sorted, search)
- 17 stores yang ada
- Best practices & usage dalam views
- Real examples from project

**Waktu baca:** 20 menit

---

## 🎓 Learning Path

### Path 1: Quick Overview (1 jam)
Untuk developer yang butuh understanding cepat.

```
1. architecture/README.md          (5 min)
2. architecture/ARCHITECTURE.md    (15 min)
3. architecture/FOLDER_STRUCTURE.md (10 min)
4. Explore codebase                (30 min)
```

### Path 2: Complete Understanding (4 jam)
Untuk developer yang akan actively develop.

```
1. architecture/README.md          (5 min)
2. architecture/ARCHITECTURE.md    (15 min)
3. architecture/FOLDER_STRUCTURE.md (10 min)
4. architecture/SERVICES_GUIDE.md  (20 min)
5. architecture/STORES_GUIDE.md    (20 min)
6. CLAUDE.md (root)                (15 min)
7. Explore codebase                (90 min)
8. Run & test app                  (45 min)
```

### Path 3: Project Management (1 jam)
Untuk setup workflow management dengan Notion.

```
1. NOTION_SETUP_GUIDE.md           (30 min)
2. Setup Notion workspace          (30 min)
3. Copy templates dari notion-templates/ (15 min)
```

---

## 🔍 Quick Reference

### Cari Informasi Spesifik

| Ingin tau tentang... | Baca ini |
|---------------------|----------|
| Arsitektur aplikasi | [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) |
| Struktur folder | [FOLDER_STRUCTURE.md](./architecture/FOLDER_STRUCTURE.md) |
| Cara bikin service baru | [SERVICES_GUIDE.md](./architecture/SERVICES_GUIDE.md) |
| Cara bikin store baru | [STORES_GUIDE.md](./architecture/STORES_GUIDE.md) |
| Setup Notion | [NOTION_SETUP_GUIDE.md](./NOTION_SETUP_GUIDE.md) |
| Project conventions | [CLAUDE.md](../CLAUDE.md) |
| Database schema | `supabase/migrations/` |
| RPC functions | [SERVICES_GUIDE.md](./architecture/SERVICES_GUIDE.md#rpc-functions) |
| Error handling | [SERVICES_GUIDE.md](./architecture/SERVICES_GUIDE.md#error-handling) |
| State management | [STORES_GUIDE.md](./architecture/STORES_GUIDE.md) |

---

## 🛠️ Development Workflow

### Untuk Fitur Baru

```
1. Planning
   └─ Baca dokumentasi terkait
   └─ Create issue di Notion/GitHub
   └─ Design approach

2. Database (jika perlu)
   └─ Buat migration: supabase/migrations/
   └─ Update types: src/types/database.ts

3. Service Layer (jika perlu)
   └─ Tambah functions: src/services/
   └─ Follow CRUD pattern
   └─ Test di console

4. Store Layer (jika perlu)
   └─ Tambah store: src/stores/
   └─ Follow Composition API pattern
   └─ Test dengan Vue DevTools

5. View Layer
   └─ Buat components: src/components/
   └─ Buat pages: src/views/
   └─ Follow UI conventions

6. Testing
   └─ Type check: npm run type-check
   └─ Build: npm run build
   └─ Manual test di browser

7. Commit & PR
   └─ Follow commit convention
   └─ Create PR
   └─ Request review
```

### Untuk Bug Fix

```
1. Reproduce
   └─ Coba reproduce bug
   └─ Note steps to reproduce

2. Debug
   └─ Check Event Log: /settings/event-log
   └─ Check Browser Console
   └─ Check Vue DevTools
   └─ Check Supabase logs

3. Identify Root Cause
   └─ Identify layer yang error
   └─ Read relevant code

4. Fix
   └─ Edit file yang perlu
   └─ Test fix

5. Test
   └─ Test golden path
   └─ Test edge cases
   └─ Regression test

6. Commit & PR
   └─ Commit message: "fix: <description>"
   └─ Create PR
   └─ Close issue
```

---

## 📊 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | Vue 3 + TypeScript + Tailwind CSS 4 |
| **State** | Pinia |
| **Router** | Vue Router 4 |
| **Backend** | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| **Mobile** | Capacitor (Android) |
| **Charts** | ApexCharts |
| **PDF** | jsPDF |
| **Build** | Vite |

---

## 🔐 Conventions

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.vue | `ProductCard.vue` |
| Views | PascalCase.vue | `ProductList.vue` |
| Services | camelCase.ts | `products.ts` |
| Stores | camelCase.ts | `products.ts` |
| Composables | useCamelCase.ts | `useToast.ts` |

### Import Paths

```typescript
// ✅ Use @/ alias
import { useToast } from '@/composables/useToast'
import type { Product } from '@/types/database'

// ❌ Don't use relative paths
import { useToast } from '../../../composables/useToast'
```

### Commit Messages

```
feat: add discount feature to price matrix
fix: correct invoice total calculation
refactor: extract payment logic to service
docs: update SERVICES_GUIDE with RPC examples
test: add unit tests for price calculation
chore: update dependencies
```

---

## 🤝 Contributing

1. **Read relevant documentation** sebelum coding
2. **Follow existing patterns** — jangan reinvent the wheel
3. **Type everything** dengan TypeScript
4. **Test before commit** — type check + build + manual test
5. **Follow commit conventions** — feat/fix/refactor/docs/test/chore
6. **Update docs** jika ada perubahan pattern/struktur

---

## 📝 Maintenance

### Update Dokumentasi Kapan?

- ✅ Ada service/store/component baru
- ✅ Pattern baru yang established
- ✅ Struktur folder berubah
- ✅ Best practices berubah
- ✅ Tech stack update

**Cara update:**
1. Edit file dokumentasi yang relevan
2. Update "Last updated" date
3. Commit dengan message: `docs: update <topic>`

---

## 🆘 Troubleshooting

### Build Error

```bash
# Type check
npm run type-check

# Fix auto-fixable issues
npm run lint

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Runtime Error

1. Check Browser Console (F12)
2. Check Event Log: `/settings/event-log`
3. Check Supabase logs di Dashboard
4. Check Vue DevTools untuk state

### Database Error

1. Check migration files: `supabase/migrations/`
2. Check RLS policies di Supabase Dashboard
3. Check user permissions
4. Check Event Log untuk detail error

---

## 📚 External Resources

- [Vue 3 Docs](https://vuejs.org/)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Capacitor Docs](https://capacitorjs.com/docs)

---

## ✨ Summary

**Dokumentasi ini berisi:**
- ✅ Arsitektur 3-layer lengkap dengan diagram
- ✅ Struktur folder detail (89 components, 20 services, 17 stores)
- ✅ Panduan services layer (CRUD + RPC)
- ✅ Panduan stores layer (Pinia + Composition API)
- ✅ Setup Notion untuk project management
- ✅ Template-template siap pakai
- ✅ Best practices & anti-patterns
- ✅ Development workflow
- ✅ Troubleshooting guide

**Happy Coding! 🚀**

---

**Last updated:** 2026-10-30  
**Maintained by:** Ucup Kasir Team
