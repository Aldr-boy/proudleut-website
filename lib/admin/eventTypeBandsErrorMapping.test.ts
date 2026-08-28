import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Konsistenzpruefung ueber zwei Dateien hinweg (identisches
// Muster wie lib/admin/eventTypesErrorMapping.test.ts): jeder in
// supabase/fn_update_event_type_band_assignments.sql definierte
// EB0xx-Fehlercode muss in
// app/admin/event-types/[slug]/bands/actions.ts auf einen stabilen Slug
// UND eine Nutzertextmeldung abgebildet sein. Zusaetzlich werden hier die
// Sicherheits-Eigenschaften der neuen RPC rein strukturell (aus der
// Migrationsdatei) geprueft -- es wird KEINE Datenbank verbunden oder
// veraendert, alle Aussagen sind repo-abgeleitet, nicht live verifiziert.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const sqlSource = readFileSync(path.join(root, 'supabase', 'fn_update_event_type_band_assignments.sql'), 'utf8')
const actionsSource = readFileSync(
  path.join(root, 'app', 'admin', 'event-types', '[slug]', 'bands', 'actions.ts'),
  'utf8',
)

function extractSqlErrorSlugs(): string[] {
  const matches = [...sqlSource.matchAll(/raise exception '(event_type_bands_[a-z_]+)'/g)]
  const slugs = matches.map((m) => m[1])
  assert.equal(slugs.length, 7, `erwartet genau 7 raise-exception-Vorkommen (EB001-EB007), gefunden ${slugs.length}`)
  return [...new Set(slugs)]
}

test('genau 7 distinkte event_type_bands_*-Fehler-Slugs (EB001-EB007) in der SQL-Datei', () => {
  const slugs = extractSqlErrorSlugs()
  assert.equal(slugs.length, 7)
})

test('jeder in der SQL-Datei geworfene event_type_bands_*-Fehler-Slug ist in actions.ts als Wert im ERRCODE-Mapping vorhanden', () => {
  const sqlSlugs = extractSqlErrorSlugs()
  for (const slug of sqlSlugs) {
    assert.ok(actionsSource.includes(`'${slug}'`), `Fehler-Slug "${slug}" fehlt im ERRCODE-Mapping von actions.ts`)
  }
})

test('jeder in der SQL-Datei geworfene event_type_bands_*-Fehler-Slug hat eine Nutzertextmeldung in GENERIC_MESSAGES', () => {
  const sqlSlugs = extractSqlErrorSlugs()
  for (const slug of sqlSlugs) {
    assert.match(actionsSource, new RegExp(`${slug}:\\s*'`), `Fehler-Slug "${slug}" hat keine Meldung in GENERIC_MESSAGES (actions.ts)`)
  }
})

test('jeder EB0xx-ERRCODE aus der SQL-Datei ist im actions.ts-Mapping auf genau den passenden Slug abgebildet', () => {
  const raiseBlocks = [...sqlSource.matchAll(/raise exception '(event_type_bands_[a-z_]+)'\s*\n\s*using errcode = '(EB\d{3})'/g)]
  assert.equal(raiseBlocks.length, 7, `erwartet genau 7 Slug/ERRCODE-Paare, gefunden ${raiseBlocks.length}`)
  for (const [, slug, code] of raiseBlocks) {
    const mappingLineRe = new RegExp(`${code}:\\s*'${slug}'`)
    assert.match(actionsSource, mappingLineRe, `ERRCODE ${code} muss in actions.ts auf '${slug}' abgebildet sein`)
  }
})

// ── Sicherheits-/Atomaritaets-Eigenschaften, rein aus der Migrationsdatei
//    abgeleitet (repo-abgeleitet, NICHT live gegen eine DB verifiziert) ──

test('search_path ist fix auf pg_catalog, pg_temp gesetzt (kein "public" im search_path)', () => {
  assert.match(sqlSource, /set search_path = pg_catalog, pg_temp/)
})

test('Ausfuehrung ist auf service_role beschraenkt (REVOKE ALL von public/anon/authenticated, GRANT EXECUTE nur an service_role)', () => {
  assert.match(sqlSource, /revoke all on function public\.update_event_type_band_assignments\(uuid, uuid\[\], uuid\[\]\) from public;/)
  assert.match(sqlSource, /revoke all on function public\.update_event_type_band_assignments\(uuid, uuid\[\], uuid\[\]\) from anon;/)
  assert.match(sqlSource, /revoke all on function public\.update_event_type_band_assignments\(uuid, uuid\[\], uuid\[\]\) from authenticated;/)
  assert.match(sqlSource, /grant execute on function public\.update_event_type_band_assignments\(uuid, uuid\[\], uuid\[\]\) to service_role;/)
})

test('keine Aenderung an bestehenden Table-Grants auf public.band_event_types (kein GRANT/REVOKE auf die Tabelle selbst in dieser Datei)', () => {
  assert.ok(!sqlSource.includes('on public.band_event_types from'), 'diese Migration darf keine Table-Grants auf band_event_types anfassen')
  assert.ok(!sqlSource.includes('on public.band_event_types to'), 'diese Migration darf keine Table-Grants auf band_event_types anfassen')
})

test('DELETE ist exakt auf (event_type_id, band_id) skaliert -- keine andere Event-Type-Zuordnung einer Band wird veraendert', () => {
  const deleteBlockMatch = sqlSource.match(/delete from public\.band_event_types[\s\S]*?and band_id = any \(v_remove\);/)
  assert.ok(deleteBlockMatch, 'DELETE-Statement nicht gefunden')
  assert.match(deleteBlockMatch[0], /where event_type_id = p_event_type_id/)
})

test('INSERT schreibt event_type_id fest auf p_event_type_id und verhindert Duplikate ueber ON CONFLICT DO NOTHING', () => {
  const insertBlockMatch = sqlSource.match(/insert into public\.band_event_types[\s\S]*?on conflict \(band_id, event_type_id\) do nothing;/)
  assert.ok(insertBlockMatch, 'INSERT-Statement nicht gefunden')
  assert.match(insertBlockMatch[0], /select x, p_event_type_id, 0/)
})

test('genau eine Funktionsdefinition -- ein Aufruf ist eine einzige Transaktion (Atomaritaet ueber PL/pgSQL-Funktionsgrenzen)', () => {
  const occurrences = (sqlSource.match(/create or replace function public\.update_event_type_band_assignments/g) ?? []).length
  assert.equal(occurrences, 1)
})
