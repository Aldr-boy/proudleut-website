import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer
// supabase/fn_update_hero_wall_selection.sql. SQL selbst kann in diesem
// Repo nicht ausgefuehrt werden (kein lokales Postgres, keine
// Production-/TEST-Mutation in Tests) -- identisches, bereits
// etabliertes Muster wie lib/admin/referenceEventsAdminSqlStructure.test.ts:
// echte Quelldatei per readFileSync lesen und strukturell pruefen.
const sqlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'supabase', 'fn_update_hero_wall_selection.sql'
)
const source = readFileSync(sqlPath, 'utf8')

function extractFunctionBody(): string {
  const startMarker = 'create or replace function public.update_hero_wall_selection('
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, 'Funktion update_hero_wall_selection nicht gefunden')
  const endMarker = '\n$$;'
  const endIndex = source.indexOf(endMarker, startIndex)
  assert.ok(endIndex >= 0, 'Funktionsende ($$;) nicht gefunden')
  return source.slice(startIndex, endIndex)
}

test('p_items = NULL wird explizit abgewiesen (HW005), nicht stillschweigend als leeres Array behandelt', () => {
  const body = extractFunctionBody()
  assert.match(body, /if p_items is null then/)
  assert.match(body, /errcode = 'HW005'/)
  assert.match(body, /'hero_wall_selection_null_items'/)
  // Kein "coalesce(p_items" (bzw. eines fruehen v_items-Ersatzes), der
  // NULL implizit in ein leeres Array umwandeln wuerde.
  assert.doesNotMatch(body, /coalesce\(p_items/)
})

test('p_items muss ein JSON-Array sein (HW006) -- Objekt/Skalar wird abgewiesen', () => {
  const body = extractFunctionBody()
  assert.match(body, /jsonb_typeof\(p_items\) <> 'array'/)
  assert.match(body, /errcode = 'HW006'/)
  assert.match(body, /'hero_wall_selection_not_array'/)
})

test('Die NULL- und Array-Typ-Pruefung stehen vor jedem jsonb_array_elements(p_items)-Aufruf', () => {
  const body = extractFunctionBody()
  const nullCheckIndex = body.indexOf('if p_items is null then')
  const typeCheckIndex = body.indexOf("jsonb_typeof(p_items) <> 'array'")
  const firstArrayElementsIndex = body.indexOf('jsonb_array_elements(p_items)')
  assert.ok(nullCheckIndex >= 0 && typeCheckIndex >= 0 && firstArrayElementsIndex >= 0)
  assert.ok(nullCheckIndex < firstArrayElementsIndex, 'NULL-Pruefung muss vor jsonb_array_elements(p_items) stehen')
  assert.ok(typeCheckIndex < firstArrayElementsIndex, 'Array-Typ-Pruefung muss vor jsonb_array_elements(p_items) stehen')
})

test('WITH ORDINALITY verwendet explizite Spaltenaliases (e.item, e.ord), kein impliziter Spaltenname', () => {
  const body = extractFunctionBody()
  assert.match(body, /with ordinality as e\(item, ord\)/)
  assert.match(body, /e\.item->>'id'/)
  assert.match(body, /e\.item->>'hero_focus'/)
  assert.match(body, /e\.ord/)
})

test('hero_wall_position wird beim Setzen explizit auf integer gecastet (ordinality liefert bigint)', () => {
  const body = extractFunctionBody()
  assert.match(body, /\(e\.ord - 1\)::integer/)
})

test('Entfernen aus dem Pool loescht hero_wall_position, aber NICHT hero_focus (bildbezogene Crop-Metadaten bleiben erhalten)', () => {
  const body = extractFunctionBody()
  const removeStart = body.indexOf('-- Zeilen entfernen, die aktuell hero_wall=true sind')
  assert.ok(removeStart >= 0, 'Entfernen-Block nicht gefunden')
  const removeEnd = body.indexOf(';', removeStart)
  const removeBlock = body.slice(removeStart, removeEnd + 1)
  assert.match(removeBlock, /set hero_wall = false, hero_wall_position = null/)
  assert.doesNotMatch(removeBlock, /hero_focus\s*=\s*null/, 'hero_focus darf beim Entfernen aus dem Pool nicht geloescht werden')
})

test('Neu-Setzen der Auswahl schreibt hero_focus aus dem uebergebenen Item (kann NULL sein, wird dann so uebernommen)', () => {
  const body = extractFunctionBody()
  const setStart = body.indexOf('-- Neue Auswahl setzen')
  assert.ok(setStart >= 0, 'Neue-Auswahl-Block nicht gefunden')
  const setBlock = body.slice(setStart, setStart + 500)
  assert.match(setBlock, /hero_focus = e\.item->>'hero_focus'/)
})

test('Nur service_role darf die Funktion ausfuehren (REVOKE ALL von public/anon/authenticated, GRANT nur an service_role)', () => {
  assert.match(source, /revoke all on function public\.update_hero_wall_selection\(jsonb\) from public;/)
  assert.match(source, /revoke all on function public\.update_hero_wall_selection\(jsonb\) from anon;/)
  assert.match(source, /revoke all on function public\.update_hero_wall_selection\(jsonb\) from authenticated;/)
  assert.match(source, /grant execute on function public\.update_hero_wall_selection\(jsonb\) to service_role;/)
})

test('kein SECURITY DEFINER -- service_role haelt bereits volle Rechte direkt auf media_assets', () => {
  const body = extractFunctionBody()
  assert.doesNotMatch(body, /security definer/i)
})

// ── Concurrency: Advisory Lock gegen die "disjunkte p_items"-Race ─────
//
// Ohne Serialisierung koennten zwei gleichzeitige Aufrufe mit disjunkten
// p_items (z. B. Aufruf A waehlt nur Bild A, Aufruf B nur Bild B,
// Ausgangspool leer) einander nie ueber die bestehenden Row-Locks
// serialisieren, da sie keine gemeinsame Zeile sperren -- beide koennten
// dann gleichzeitig hero_wall_position = 0 erhalten (Verletzung der
// Full-Replacement-Semantik und der lueckenlosen, eindeutigen
// Positionslogik).

test('pg_advisory_xact_lock() wird erworben (transaktionsgebunden, kein manuelles Unlock noetig)', () => {
  const body = extractFunctionBody()
  assert.match(body, /perform pg_advisory_xact_lock\(/)
})

test('Advisory Lock serialisiert NUR diese Funktion -- kein Tabellen-Lock auf media_assets', () => {
  const body = extractFunctionBody()
  assert.doesNotMatch(body, /lock table/i)
})

test('Advisory Lock wird NACH der reinen Input-Validierung, aber VOR jeder zustandsabhaengigen Abfrage/Sperrung von media_assets erworben', () => {
  const body = extractFunctionBody()
  const lockIndex = body.indexOf('perform pg_advisory_xact_lock(')
  assert.ok(lockIndex >= 0, 'Advisory-Lock-Aufruf nicht gefunden')

  // Nach der Validierung: alle HW00x-Pruefungen (inkl. Duplikat-Check)
  // muessen VOR dem Lock stehen.
  for (const errcode of ['HW005', 'HW006', 'HW001', 'HW004', 'HW002']) {
    const errcodeIndex = body.indexOf(`errcode = '${errcode}'`)
    assert.ok(errcodeIndex >= 0, `${errcode}-Pruefung nicht gefunden`)
    assert.ok(errcodeIndex < lockIndex, `${errcode}-Pruefung muss vor dem Advisory Lock stehen`)
  }

  // Vor jeder zustandsabhaengigen media_assets-Abfrage/-Sperrung: die
  // erste Stelle, an der der aktuelle Pool (hero_wall = true) gelesen
  // oder gesperrt wird, muss NACH dem Lock stehen.
  const poolReadIndex = body.indexOf('where m.hero_wall = true or m.id = any (v_ids)')
  assert.ok(poolReadIndex >= 0, 'Pool-Lesestelle (hero_wall = true or id = any) nicht gefunden')
  assert.ok(lockIndex < poolReadIndex, 'Advisory Lock muss vor dem Lesen/Sperren des aktuellen Hero-Pools stehen')

  const forUpdateIndex = body.indexOf('for update')
  assert.ok(forUpdateIndex >= 0, 'FOR UPDATE Row-Lock nicht gefunden')
  assert.ok(lockIndex < forUpdateIndex, 'Advisory Lock muss vor jedem FOR UPDATE Row-Lock auf media_assets stehen')
})

test('bestehende deterministische Row-Locks (ORDER BY id, FOR UPDATE) bleiben nach Einfuehrung des Advisory Locks erhalten', () => {
  const body = extractFunctionBody()
  assert.match(body, /order by m\.id/)
  assert.match(body, /for update/)
})
