# Cara Memasukkan Template Markdown ke Notion

Panduan step-by-step untuk copy-paste template markdown ke Notion database template.

## Metode 1: Copy-Paste Langsung (Paling Mudah)

Notion secara otomatis akan convert markdown ke format Notion saat paste!

### Langkah-langkah:

1. **Buka file template markdown di editor**
   - Buka file di folder `docs/notion-templates/`
   - Contoh: `02-feature-request-template.md`

2. **Select All & Copy**
   - Tekan `Ctrl+A` (Windows/Linux) atau `Cmd+A` (Mac)
   - Tekan `Ctrl+C` (Windows/Linux) atau `Cmd+C` (Mac)

3. **Buka Notion dan buat template baru**
   - Di database (Features & Tasks, misalnya)
   - Klik tombol `...` di pojok kanan atas database
   - Pilih `New template`
   - Beri nama template (misal: "Feature Request")

4. **Paste di body template**
   - Klik di area body template (di bawah properties)
   - Tekan `Ctrl+V` (Windows/Linux) atau `Cmd+V` (Mac)
   - **TADA!** Markdown otomatis ter-convert ke format Notion 🎉

5. **Set default properties** (jika perlu)
   - Klik `Properties` di template editor
   - Set default value (misal: Type = "Feature", Status = "Backlog")

6. **Save template**
   - Klik `Done` atau tutup modal

### Hasil Auto-Conversion:

Notion akan otomatis convert:
- `# Heading` → Heading 1
- `## Sub-heading` → Heading 2
- `**Bold text**` → Bold text
- `- [ ] Checkbox` → Checkbox/to-do
- ` ```code``` ` → Code block
- `[Link](url)` → Link
- `- Bullet` → Bullet list
- `1. Number` → Numbered list

## Metode 2: Via Import (Untuk Banyak Template Sekaligus)

Jika mau import banyak template sekaligus:

1. **Buat page Notion baru**
   - Nama: "Template Imports"

2. **Import markdown files**
   - Klik `...` di pojok kanan atas page
   - Pilih `Import`
   - Pilih `Markdown`
   - Select semua file `.md` di folder `docs/notion-templates/`
   - Klik `Import`

3. **Copy dari imported page ke template database**
   - Buka imported page
   - Select all content
   - Copy
   - Paste ke template database

## Metode 3: Manual Typing (Pakai Shortcuts Notion)

Jika mau ketik manual sambil pakai Notion shortcuts:

### Notion Markdown Shortcuts:

Ketik ini langsung di Notion:

```
# + Space          → Heading 1
## + Space         → Heading 2
### + Space        → Heading 3
- + Space          → Bullet list
1. + Space         → Numbered list
[] + Space         → Checkbox/to-do
> + Space          → Callout
``` + Space        → Code block
--- + Enter        → Divider
** + text + **     → Bold
* + text + *       → Italic
` + text + `       → Inline code
```

### Contoh Live Typing:

Ketik di Notion:
```
## Problem Statement
**As a** [role]
**I want** [feature]
**So that** [benefit]
```

Notion akan render sebagai:
- Heading 2: "Problem Statement"
- Bold text: "As a", "I want", "So that"
- Regular text: [role], [feature], [benefit]

## Template-Template yang Sudah Dibuat

Saya sudah buatkan 6 template di folder `docs/notion-templates/`:

1. **01-new-project-template.md**
   - Untuk: Projects database
   - Gunakan saat: Create new project

2. **02-feature-request-template.md**
   - Untuk: Features & Tasks database
   - Gunakan saat: Buat fitur baru
   - Set default: Type = "Feature", Status = "Backlog"

3. **03-task-template.md**
   - Untuk: Features & Tasks database
   - Gunakan saat: Buat task development
   - Set default: Type = "Task", Status = "Todo"

4. **04-bug-report-template.md**
   - Untuk: Bugs & Issues database
   - Gunakan saat: Report bug
   - Set default: Status = "New", Reported Date = Today

5. **05-sprint-planning-template.md**
   - Untuk: Sprints database
   - Gunakan saat: Plan sprint baru
   - Set default: Status = "Planning"

6. **06-meeting-notes-template.md**
   - Untuk: Meeting notes page
   - Gunakan saat: Perlu catat meeting

## Step-by-step: Setup Template di Notion Database

### Contoh: Setup Feature Request Template

1. **Buka Features & Tasks database di Notion**

2. **Klik `...` (pojok kanan atas database) → `New template`**

3. **Beri nama: "Feature Request"**

4. **Set default properties:**
   - Klik `Properties` di template editor
   - Type: pilih "Feature"
   - Status: pilih "Backlog"
   - Klik `Done`

5. **Copy template content:**
   - Buka file: `docs/notion-templates/02-feature-request-template.md`
   - Select all (`Ctrl+A`) dan copy (`Ctrl+C`)

6. **Paste ke Notion template:**
   - Klik di body template (area kosong di bawah properties)
   - Paste (`Ctrl+V`)
   - Notion akan auto-convert markdown!

7. **Review hasil conversion:**
   - Pastikan heading, checkboxes, code block ter-render dengan benar
   - Adjust jika perlu

8. **Save template:**
   - Tutup modal template editor
   - Template siap digunakan!

9. **Test template:**
   - Klik `New` di database
   - Pilih template "Feature Request"
   - Voila! Template siap diisi

## Troubleshooting

### Problem: Checkbox tidak muncul saat paste

**Solution:**
- Notion kadang tidak recognize `- [ ]` saat paste
- Solusi 1: Ketik manual `[]` + Space di Notion
- Solusi 2: Paste, lalu highlight line dan tekan `/todo` → pilih "To-do list"

### Problem: Code block tidak ter-format

**Solution:**
- Highlight text yang mau jadi code block
- Tekan `/code` → pilih "Code"
- Atau ketik manual: ``` + Enter, paste code, ``` + Enter

### Problem: Link tidak clickable

**Solution:**
- Highlight text
- Tekan `Ctrl+K` (Windows/Linux) atau `Cmd+K` (Mac)
- Paste URL
- Enter

### Problem: Bold text tidak ter-render

**Solution:**
- Notion mungkin paste sebagai plain text
- Highlight text yang mau bold
- Tekan `Ctrl+B` (Windows/Linux) atau `Cmd+B` (Mac)

## Tips Pro:

1. **Paste tanpa formatting** (jika Notion auto-convert salah)
   - Paste dengan `Ctrl+Shift+V` (plain text paste)
   - Lalu format manual pakai Notion shortcuts

2. **Duplicate template untuk variasi**
   - Di database, klik `...` pada template
   - Pilih `Duplicate`
   - Edit sesuai kebutuhan

3. **Test template sebelum pakai production**
   - Buat dummy entry pakai template
   - Pastikan semua section ada dan ter-format benar

4. **Update template secara berkala**
   - Template bisa di-edit kapan saja
   - Perubahan tidak affect entry yang sudah dibuat

5. **Share template dengan team**
   - Template database bisa dipakai oleh semua member workspace

## Quick Reference: Notion Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Bold | Ctrl+B | Cmd+B |
| Italic | Ctrl+I | Cmd+I |
| Underline | Ctrl+U | Cmd+U |
| Strikethrough | Ctrl+Shift+S | Cmd+Shift+S |
| Link | Ctrl+K | Cmd+K |
| Code | Ctrl+E | Cmd+E |
| Select all | Ctrl+A | Cmd+A |
| Copy | Ctrl+C | Cmd+C |
| Paste | Ctrl+V | Cmd+V |
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Shift+Z | Cmd+Shift+Z |

## Video Tutorial (Jika Butuh Visual)

Jika butuh video tutorial, search di YouTube:
- "How to create Notion database template"
- "Notion markdown import"
- "Notion template tutorial"

## Next Steps

Setelah semua template di-setup di Notion:

1. ✅ Test setiap template
2. ✅ Adjust sesuai workflow kamu
3. ✅ Mulai pakai untuk tracking project
4. ✅ Share dengan team (jika ada)

---

**Happy templating!** 🎉

Jika ada yang stuck, tanya saya atau cek Notion Help Center: https://www.notion.so/help
