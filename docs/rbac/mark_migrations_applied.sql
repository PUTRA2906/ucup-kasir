-- ============================================================================
-- Catat migrasi 0001–0007 di `supabase_migrations.schema_migrations`
-- Jalankan SETELAH docs/rbac/migrate_live.sql sukses.
--
-- Kenapa manual: bundle ditempel lewat SQL Editor, bukan `supabase db push`,
-- sehingga CLI tidak mencatat versinya. Tanpa ini, `supabase db push` di masa
-- depan akan menganggap migrasi-migrasi ini belum diterapkan dan mencoba
-- menerapkannya lagi (gagal karena objek sudah ada).
--
-- Catatan: 0005, 0006 & 0007 diterapkan ke live lewat MCP `apply_migration`,
-- yang mencatat versinya sendiri sebagai timestamp (`20261126122502` /
-- `20261126122506` / timestamp 0007). Baris `0005`/`0006`/`0007` di bawah TETAP
-- perlu ditulis: tanpa itu, `supabase db push` mencocokkan nama file
-- (`0005_invites.sql` → versi `0005`) dengan ledger, tidak menemukannya, lalu
-- mencoba menerapkan ulang.
--
-- Idempoten: `on conflict (version) do nothing`.
-- ============================================================================

insert into supabase_migrations.schema_migrations (version, name)
values ('0001', 'baseline'),
       ('0002', 'rbac'),
       ('0003', 'functions'),
       ('0004', 'hpp_masking'),
       ('0005', 'invites'),
       ('0006', 'store_scoped_permission'),
       ('0007', 'deterministic_current_store')
on conflict (version) do nothing;

-- Verifikasi
select version, name from supabase_migrations.schema_migrations
where version in ('0001', '0002', '0003', '0004', '0005', '0006', '0007')
order by version;
