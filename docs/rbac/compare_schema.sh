#!/usr/bin/env bash
# Compare the schema produced by applying migrations locally against the
# introspection snapshot taken from the live database.
#
#   bash docs/rbac/compare_schema.sh
set -euo pipefail

PORT=55432
PSQL="psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q -d rbac_test -At"
OUT=/tmp/rbac-local-schema.json

$PSQL -c "select json_build_object(
 'columns',(select json_agg(x) from (select c.relname as tbl, a.attname as col, format_type(a.atttypid,a.atttypmod) as typ, a.attnotnull as notnull, pg_get_expr(ad.adbin, ad.adrelid) as def, a.attnum from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef ad on ad.adrelid=c.oid and ad.adnum=a.attnum where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by c.relname, a.attnum) x),
 'constraints',(select json_agg(x) from (select c.relname as tbl, con.conname as name, con.contype as contype, pg_get_constraintdef(con.oid) as def from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and con.contype in ('p','u','c','f') order by c.relname, con.contype, con.conname) x),
 'indexes',(select json_agg(x) from (select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by tablename, indexname) x),
 'policies',(select json_agg(x) from (select tablename, policyname, permissive, cmd, qual, with_check from pg_policies where schemaname='public' order by tablename, policyname) x),
 'triggers',(select json_agg(x) from (select c.relname as tbl, t.tgname as name, pg_get_triggerdef(t.oid) as def from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname, t.tgname) x),
 'functions',(select json_agg(x) from (select p.proname as name, pg_get_functiondef(p.oid) as def from pg_proc p where p.pronamespace='public'::regnamespace order by p.proname) x),
 'views',(select json_agg(x) from (select c.relname as name, pg_get_viewdef(c.oid) as def, coalesce(array_to_string(c.reloptions, ','),'') as options from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v') x),
 'grants',(select json_agg(x) from (select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type) as privs from information_schema.role_table_grants where table_schema='public' group by grantee, table_name order by grantee, table_name) x),
 'storage_policies',(select json_agg(x) from (select policyname, cmd, qual, with_check from pg_policies where schemaname='storage' and tablename='objects' order by policyname) x),
 'storage_buckets',(select json_agg(x) from (select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by id) x),
 'auth_triggers',(select json_agg(x) from (select t.tgname, pg_get_triggerdef(t.oid) as def from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and not t.tgisinternal order by t.tgname) x)
)::text" > "$OUT"

python3 - <<'PY'
import json, re, sys

live = json.load(open('docs/rbac/introspection/columns.json'))
live_cols = {(r['tbl'], r['col']): (r['typ'], r['notnull'], (r['def'] or '').replace(' ', '')) for r in live}

local = json.loads(open('/tmp/rbac-local-schema.json').read())
local_cols = {(r['tbl'], r['col']): (r['typ'], r['notnull'], (r['def'] or '').replace(' ', '')) for r in local['columns']}

# --- columns
only_live = sorted(set(live_cols) - set(local_cols))
only_local = sorted(set(local_cols) - set(live_cols))
diff = [(k, live_cols[k], local_cols[k]) for k in sorted(set(live_cols) & set(local_cols)) if live_cols[k] != local_cols[k]]

print('COLUMNS  live=%d local=%d' % (len(live_cols), len(local_cols)))
print('  missing locally :', only_live or 'none')
print('  extra locally   :', only_local or 'none')
if diff:
    print('  type/null/default mismatches:')
    for k, a, b in diff:
        print('   ', k, '\n      live :', a, '\n      local:', b)
else:
    print('  all column definitions identical')

# --- policies / functions / triggers / indexes / constraints (normalised text compare)
def norm(s):
    if s is None:
        return None
    s = s.replace('CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION')
    s = s.replace("SET search_path TO 'public'", 'SET search_path = public')
    # PostgreSQL 17 vs 18 render ARRAY[...]::text CHECK constraints differently:
    #   17: (ARRAY['a'::varchar, ...])::text[]
    #   18: ARRAY[('a'::varchar)::text, ...]
    # Both are the same constraint, so canonicalise the element cast form.
    s = re.sub(r"\('([^']*)'::([a-z ]+)\)::text", r"'\1'::\2", s)
    s = re.sub(r"\(\(ARRAY\[(.*?)\]\)::text\[\]\)", r"(ARRAY[\1])", s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip().rstrip(';')

def keyed(rows, *keys):
    out = {}
    for r in rows:
        out[tuple(r[k] for k in keys)] = r
    return out

live_objs = json.load(open('docs/rbac/introspection/schema_objects.json'))

for label, lrows, k1, k2 in [
    ('POLICIES', live_objs['policies'], 'tablename', 'policyname'),
    ('TRIGGERS', live_objs['triggers'], 'tbl', 'name'),
    ('INDEXES', live_objs['indexes'], 'tablename', 'indexname'),
    ('CONSTRAINTS', live_objs['constraints'], 'tbl', 'name'),
]:
    l = keyed(lrows, k1, k2)
    o = keyed(local[label.lower()], k1, k2)
    missing = sorted(set(l) - set(o))
    extra = sorted(set(o) - set(l))
    bad = []
    for k in set(l) & set(o):
        la, oa = l[k], o[k]
        ltxt = norm(la.get('def') or la.get('indexdef') or la.get('qual'))
        otxt = norm(oa.get('def') or oa.get('indexdef') or oa.get('qual'))
        if label == 'POLICIES':
            ltxt = norm('%s|%s|%s' % (la.get('permissive'), la.get('qual'), la.get('with_check')))
            otxt = norm('%s|%s|%s' % (oa.get('permissive'), oa.get('qual'), oa.get('with_check')))
        if ltxt != otxt:
            bad.append((k, la, oa))
    print('%s live=%d local=%d' % (label, len(l), len(o)))
    print('  missing locally :', missing or 'none')
    print('  extra locally   :', extra or 'none')
    if bad:
        print('  definition mismatches: %d' % len(bad))
        for k, a, b in bad[:8]:
            print('   ', k)
            print('      live :', (a.get('def') or a.get('indexdef') or (a.get('qual'), a.get('with_check'))))
            print('      local:', (b.get('def') or b.get('indexdef') or (b.get('qual'), b.get('with_check'))))
    else:
        print('  all definitions identical')

# --- functions
lf = {r['name']: r['def'] for r in json.load(open('/tmp/rbac-live-functions.json'))}
of = {r['name']: r['def'] for r in local['functions']}
missing = sorted(set(lf) - set(of))
extra = sorted(set(of) - set(lf))
bad = [(k, lf[k], of[k]) for k in sorted(set(lf) & set(of)) if norm(lf[k]) != norm(of[k])]
print('FUNCTIONS live=%d local=%d' % (len(lf), len(of)))
print('  missing locally :', missing or 'none')
print('  extra locally   :', extra or 'none')
print('  definition mismatches: %d' % len(bad))
for k, a, b in bad[:5]:
    import difflib
    d = list(difflib.unified_diff(a.splitlines(), b.splitlines(), 'live', 'local', lineterm='', n=1))
    print('   ', k)
    print('\n'.join('      ' + l for l in d[:24]))

# --- views
lv = {r['name']: r for r in live_objs['views']}
ov = {r['name']: r for r in local['views']}
print('VIEWS live=%d local=%d' % (len(lv), len(ov)))
for k in sorted(set(lv) & set(ov)):
    same = norm(lv[k]['def']) == norm(ov[k]['def'])
    print('  %s: definition %s, options live=%r local=%r'
          % (k, 'identical' if same else 'DIFFERS', lv[k]['options'], ov[k]['options']))
print('  missing locally :', sorted(set(lv) - set(ov)) or 'none')
print('  extra locally   :', sorted(set(ov) - set(lv)) or 'none')

# --- grants (table privileges per grantee)
lg = {(r['grantee'], r['table_name']): r['privs'] for r in live_objs['grants']}
og = {(r['grantee'], r['table_name']): r['privs'] for r in local['grants']}
bad = sorted(k for k in set(lg) & set(og) if lg[k] != og[k])
print('GRANTS live=%d local=%d' % (len(lg), len(og)))
print('  missing locally :', sorted(set(lg) - set(og)) or 'none')
print('  extra locally   :', sorted(set(og) - set(lg)) or 'none')
print('  privilege mismatches:', bad or 'none')

# --- storage objects
for label, key in [('STORAGE POLICIES', 'storage_policies'), ('STORAGE BUCKETS', 'storage_buckets'), ('AUTH TRIGGERS', 'auth_triggers')]:
    lrows = {json.dumps(r, sort_keys=True) for r in (live_objs[key] or [])}
    orows = {json.dumps(r, sort_keys=True) for r in (local[key] or [])}
    print('%s live=%d local=%d' % (label, len(lrows), len(orows)))
    print('  missing locally :', sorted(lrows - orows) or 'none')
    print('  extra locally   :', sorted(orows - lrows) or 'none')
PY