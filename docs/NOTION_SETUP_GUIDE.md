# Notion Setup Guide untuk Project Management

Panduan lengkap setup Notion workspace untuk manage project development dari awal sampai akhir.

## Prerequisites
- Akun Notion (gratis sudah cukup)
- Browser

## Setup Steps

### 1. Buat Workspace Baru (Opsional)

Jika kamu mau dedicated workspace untuk development:
1. Buka Notion
2. Klik nama workspace di sidebar → "Join or create workspace"
3. Pilih "Create a new workspace"
4. Nama: "Development Projects" atau sesuai keinginan

### 2. Buat Main Page

1. Klik "+ New page" di sidebar
2. Nama: "🚀 Project Hub"
3. Pilih icon dan cover yang kamu suka

### 3. Setup Databases

#### A. Projects Database

1. Di dalam "Project Hub" page, ketik `/database` → pilih "Database - Inline"
2. Nama database: "Projects"
3. Tambah properties (klik "+ New property"):
   - Status (Select): Planning, Active, On Hold, Completed
   - Priority (Select): High, Medium, Low
   - Start Date (Date)
   - Target Date (Date)
   - Tech Stack (Multi-select): Vue, Supabase, TypeScript, Tailwind, Capacitor, etc
   - Team (Person)
   - Progress (Number) → format: Number with "%"
   - GitHub Repo (URL)
   - Description (Text)

4. Buat view "Active Projects":
   - Klik "..." → "New view" → "Table"
   - Filter: Status is Active
   - Sort: Priority descending, then Target Date ascending

5. Buat template "New Project":
   - Klik "..." di database → "New template"
   - Nama: "New Project Template"
   - Paste konten dari template di bawah

**Template Content:**
```markdown
# Overview
**Goal:** 

**Target Users:** 

**Success Metrics:** 
- [ ] 
- [ ] 

## Tech Stack
- Frontend: 
- Backend: 
- Database: 
- Mobile: 

## Milestones
- [ ] Phase 1:  - 
- [ ] Phase 2:  - 
- [ ] Phase 3:  - 

## Resources
- Design: 
- Documentation: 
- GitHub: 

## Team
- Developer: 
- Designer: 
- PM: 

## Notes
```

#### B. Features & Tasks Database

1. Buat heading baru di page: "## Features & Tasks"
2. Ketik `/database` → "Database - Inline"
3. Nama: "Features & Tasks"
4. Tambah properties:
   - Project (Relation) → pilih "Projects" database
   - Type (Select): Feature, Task, Research, Refactor
   - Status (Select): Backlog, Todo, In Progress, In Review, Done
   - Priority (Select): P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
   - Assignee (Person)
   - Estimate (Select): 1h, 2h, 4h, 1d, 2d, 3d, 1w
   - Sprint (Relation) → akan dibuat nanti
   - Start Date (Date)
   - Due Date (Date)
   - Tags (Multi-select): frontend, backend, database, ui, bug-fix, testing
   - GitHub PR (URL)
   - Related Bugs (Relation) → akan dibuat nanti
   - Completed Date (Date)

5. Buat views:
   
   **View 1: Kanban Board**
   - Klik "..." → "New view" → "Board"
   - Nama: "Kanban"
   - Group by: Status
   - Sub-group by: Priority
   - Sort: Priority ascending
   
   **View 2: My Tasks**
   - View type: Table
   - Filter: Assignee → Contains → [your name]
   - Sort: Due Date ascending
   
   **View 3: Current Sprint**
   - View type: Table
   - Filter: Sprint → [nanti set ke current sprint]
   - Group by: Status
   
   **View 4: By Priority**
   - View type: Table
   - Group by: Priority
   - Sort: Due Date ascending
   
   **View 5: Timeline**
   - View type: Timeline
   - Timeline by: Start Date - Due Date

6. Buat template "Feature Request":
   - Klik "..." → "New template"
   - Nama: "Feature Request"
   - Set default properties:
     - Type: Feature
     - Status: Backlog
   - Paste content template feature request

7. Buat template "Task":
   - Nama: "Task"
   - Set default properties:
     - Type: Task
     - Status: Todo
   - Paste content template task

**Feature Request Template:**
```markdown
# Problem Statement
**As a** [role]  
**I want** [feature]  
**So that** [benefit]

## User Story


## Acceptance Criteria
- [ ] 
- [ ] 
- [ ] 

## Design
[Link to mockup/wireframe]

## Technical Approach

### Database Changes
```sql

```

### API Changes
- [ ] 
- [ ] 

### UI Changes
- [ ] 
- [ ] 

## Dependencies
- [ ] 

## Testing Plan
- [ ] Unit tests for 
- [ ] Integration test for 
- [ ] Manual testing:
  - [ ] 
  - [ ] 

## Documentation Updates
- [ ] Update CLAUDE.md
- [ ] Update API docs
- [ ] Update user guide

## Risks & Considerations


## Resources
- Related Issues: 
- GitHub PR: 
- Design: 

## Progress Log
```

**Task Template:**
```markdown
# Description


## Steps
- [ ] 
- [ ] 
- [ ] 

## Blockers


## Notes
```

#### C. Bugs & Issues Database

1. Buat heading: "## Bugs & Issues"
2. Ketik `/database` → "Database - Inline"
3. Nama: "Bugs & Issues"
4. Tambah properties:
   - Project (Relation) → Projects
   - Status (Select): New, Confirmed, In Progress, Fixed, Closed, Won't Fix
   - Severity (Select): Critical, High, Medium, Low
   - Priority (Select): P0, P1, P2, P3
   - Reported By (Person)
   - Assigned To (Person)
   - Reported Date (Date)
   - Fixed Date (Date)
   - Environment (Select): Production, Staging, Development
   - Platform (Multi-select): Web, Android, iOS
   - Tags (Multi-select): crash, ui, performance, data-loss, security
   - Related Feature (Relation) → Features & Tasks
   - GitHub Issue (URL)
   - Root Cause (Text)

5. Buat views:
   
   **View 1: Active Bugs**
   - Type: Table
   - Filter: Status → Is not → Fixed, Closed
   - Sort: Severity (Critical first), then Priority
   
   **View 2: By Severity**
   - Type: Table
   - Group by: Severity
   - Sort: Reported Date descending
   
   **View 3: Critical Issues**
   - Type: Table
   - Filter: Severity → Is → Critical
   
   **View 4: Production Bugs**
   - Type: Table
   - Filter: Environment → Is → Production
   - Sort: Severity, Priority
   
   **View 5: My Bugs**
   - Type: Table
   - Filter: Assigned To → Contains → [you]

6. Buat template "Bug Report":
   - Set defaults:
     - Status: New
     - Reported Date: Today
   - Paste content

**Bug Report Template:**
```markdown
# 🐛 Bug Description


## Environment
- Platform: [ ] Web [ ] Android [ ] iOS
- Environment: [ ] Production [ ] Staging [ ] Development
- Browser/Version: 
- OS: 
- App Version: 

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior


## Actual Behavior


## Screenshots/Videos


## Error Messages
```

```

## Impact
**Affected Users:** 
**Frequency:** 
**Workaround:** 

---

## Root Cause Analysis
*(Diisi setelah investigation)*

**Root Cause:**


**Why it happened:**


## Fix Implementation
*(Diisi saat fixing)*

**Changes:**
- 
- 

**Migration needed:** [ ] Yes [ ] No

## Testing
- [ ] Unit test added
- [ ] Manual testing passed
- [ ] Regression testing passed

## Related
- Related bugs: 
- Related features: 
- GitHub PR: 

## Prevention

```

#### D. Sprints/Milestones Database

1. Buat heading: "## Sprints & Milestones"
2. Ketik `/database` → "Database - Inline"
3. Nama: "Sprints"
4. Tambah properties:
   - Project (Relation) → Projects
   - Type (Select): Sprint, Milestone, Release
   - Status (Select): Planning, Active, Completed
   - Start Date (Date)
   - End Date (Date)
   - Goal (Text)
   - Features (Relation) → Features & Tasks (allow linking multiple)
   - Story Points (Number)
   - Completed Points (Number)
   - Notes (Text)

5. Buat view "Current Sprint":
   - Filter: Status → Is → Active
   - Sort: Start Date descending

6. Buat template "Sprint Planning"

**Sprint Planning Template:**
```markdown
# Sprint Goal


## Planned Features
- [ ] 
- [ ] 

**Total Story Points:** 

## Definition of Done
- [ ] Code review passed
- [ ] Tests written and passed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] Manual testing completed

## Team Capacity


## Risks


## Daily Progress
**Day 1:** 
**Day 2:** 

---

## Sprint Review
*(Diisi di akhir sprint)*

**Completed:**
- ✅ 

**Not Completed:**
- ❌ 

**Velocity:** 

## Retrospective

**What went well:**


**What didn't go well:**


**Action items:**
- [ ] 
```

#### E. Update Relations

Sekarang kembali ke Features & Tasks database dan update relations:
1. Edit property "Sprint" → Relation → pilih "Sprints" database
2. Edit property "Related Bugs" → Relation → pilih "Bugs & Issues" database

### 4. Buat Documentation Hub

1. Buat page baru di sidebar: "📚 Documentation"
2. Struktur:

```markdown
# 📚 Documentation Hub

## 📋 Project Documentation
- [[Project Overview]]
- [[CLAUDE.md]] - Development guide
- [[Architecture]] - System architecture
- [[Database Schema]] - ERD dan table definitions
- [[API Reference]] - API endpoints

## 🛠️ Development Guides
- [[Setup Guide]]
- [[Development Workflow]]
- [[Deployment Guide]]
- [[Testing Guide]]

## 🎨 Design System
- [[UI Components]]
- [[Design Principles]]
- [[Brand Assets]]

## 📖 User Documentation
- [[User Guide]]
- [[FAQ]]
- [[Troubleshooting]]

## ⚙️ Technical Specs
- [[Tech Stack]]
- [[Dependencies]]
- [[Environment Variables]]

## 📝 Meeting Notes
- [[Weekly Sync Template]]
- [[Decision Log]]

## 🔗 Resources
- GitHub: 
- Figma: 
- Staging: 
- Production: 
```

3. Buat page-page di atas sesuai kebutuhan (bisa dibuat bertahap)

### 5. Buat Meeting Notes Template

1. Di Documentation Hub, buat page "Weekly Sync Template"
2. Klik "..." → "Turn into template"
3. Content:

```markdown
# Meeting - [Topic] - [Date]

**Attendees:** 

**Agenda:**
1. 
2. 
3. 

---

## Discussion Notes

### Topic 1


**Decision:** 
**Action items:**
- [ ] @person - 

---

## Parking Lot


---

## Next Meeting
**Date:** 
**Agenda:** 
```

### 6. Link Databases ke Features & Tasks

Karena Sprint dan Bugs sudah dibuat, sekarang update relational properties di Features & Tasks:

1. Buka Features & Tasks database
2. Edit property "Sprint" → Relation to → Sprints
3. Edit property "Related Bugs" → Relation to → Bugs & Issues

### 7. Buat Dashboard View (Main Page)

Kembali ke "🚀 Project Hub" page dan susun strukturnya:

```markdown
# 🚀 Project Hub

> Central hub untuk manage semua project development

## Quick Stats
[Buat 4 callout boxes dengan stats]

---

## 📊 Projects
[Linked view ke Projects database - tampilkan sebagai Gallery]

---

## ✅ My Tasks
[Linked view ke Features & Tasks - filter by assignee]

---

## 🐛 Active Bugs
[Linked view ke Bugs - filter by status active]

---

## 🎯 Current Sprint
[Linked view ke Sprints - filter by status active]
```

Cara buat linked view:
1. Ketik `/linked` → "Create linked database"
2. Pilih database yang mau di-link
3. Pilih view yang mau ditampilkan
4. Customize filter sesuai kebutuhan

### 8. Setup untuk Ucup Kasir Project

Sekarang buat project pertama:

1. Di Projects database, klik "New" → pilih "New Project Template"
2. Isi:
   - Name: "Ucup Kasir - POS Application"
   - Status: Active
   - Priority: High
   - Tech Stack: Vue 3, TypeScript, Supabase, Tailwind CSS, Capacitor
   - GitHub Repo: [paste repo URL]
   - Description: Aplikasi POS untuk toko kelontong di Banyuwangi

3. Buat sprint pertama di Sprints database:
   - Name: "Sprint 1 - Stabilization"
   - Project: Ucup Kasir
   - Type: Sprint
   - Status: Active
   - Goal: "Fix critical bugs dan stabilkan core features"

4. Migrate existing bugs/tasks:
   - Buka GitHub issues (jika ada)
   - Atau buat dari uncommitted changes yang ada
   - Buat entry di Bugs/Features database

## Usage Workflow

### Workflow: Fitur Baru

1. **Planning**
   - Buat entry baru di Features & Tasks
   - Pilih template "Feature Request"
   - Isi semua section
   - Set Status: Backlog
   - Link ke Project dan Sprint (jika sudah ada)

2. **Development**
   - Update Status: In Progress
   - Update progress di section "Progress Log"
   - Link GitHub PR saat sudah buat PR

3. **Review**
   - Update Status: In Review
   - Tambah notes di Progress Log

4. **Done**
   - Update Status: Done
   - Set Completed Date
   - Update Sprint's Completed Points

### Workflow: Bug Fix

1. **Report**
   - Buat entry di Bugs & Issues
   - Pilih template "Bug Report"
   - Isi lengkap semua detail
   - Set Severity dan Priority

2. **Investigate**
   - Update Status: Confirmed
   - Isi section Root Cause Analysis

3. **Fix**
   - Update Status: In Progress
   - Assign To: yourself
   - Isi section Fix Implementation
   - Link GitHub PR

4. **Verify**
   - Update Status: Fixed
   - Set Fixed Date
   - Isi testing checklist

5. **Close**
   - Verify di production
   - Update Status: Closed

### Daily Routine

**Pagi:**
1. Buka "My Tasks" view
2. Check sprint progress
3. Update task status
4. Check "Active Bugs" view

**Sore:**
1. Update progress di task yang sedang dikerjakan
2. Update sprint daily notes
3. Create bugs jika menemukan issue

**Akhir Sprint:**
1. Complete sprint review section
2. Fill retrospective
3. Create new sprint untuk periode berikutnya

## Tips Penggunaan

1. **Gunakan Templates** - Selalu gunakan template agar konsisten
2. **Link Everything** - Link tasks dengan bugs, features dengan sprints
3. **Update Status** - Selalu update status saat ada progress
4. **Write Notes** - Catat keputusan penting dan blocker
5. **Tag Properly** - Gunakan tags untuk filtering yang mudah
6. **Use Relations** - Manfaatkan relational database untuk tracking dependencies

## Shortcuts Notion yang Berguna

- `/database` - Buat database baru
- `/linked` - Buat linked database
- `/table` - Buat table
- `/board` - Buat kanban board
- `/callout` - Buat callout box
- `@person` - Mention orang
- `@date` - Insert tanggal
- `[[page]]` - Link ke page lain
- `Cmd/Ctrl + P` - Quick find
- `Cmd/Ctrl + N` - New page
- `Cmd/Ctrl + Shift + P` - Quick database entry

## Maintenance

### Weekly
- [ ] Review completed tasks
- [ ] Update sprint progress
- [ ] Archive closed bugs
- [ ] Clean up old meeting notes

### Monthly
- [ ] Review roadmap
- [ ] Update documentation
- [ ] Archive completed sprints
- [ ] Evaluate workflow efficiency

## Next Steps

Setelah setup selesai:

1. **Migrate existing work** - Pindahkan task/bug yang sudah ada
2. **Customize** - Sesuaikan properties dan views dengan kebutuhanmu
3. **Train team** - Ajari team member cara pakainya (jika ada)
4. **Iterate** - Improve workflow based on usage

## Resources

- [Notion Documentation](https://www.notion.so/help)
- [Notion Templates Gallery](https://www.notion.so/templates)
- [Notion Community](https://www.notion.so/community)

---

**Setup by:** [Your name]  
**Date:** 2026-10-30  
**Version:** 1.0
