import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer supabase/fn_reference_events_admin.sql
// (Referenzverwaltung im Band-Admin, V1). SQL selbst kann in diesem Repo
// nicht ausgefuehrt werden (kein lokales Postgres, keine
// Production-Mutation in Tests) -- identisches, bereits etabliertes
// Muster wie lib/admin/eventTypesArchiveNoBlockers.test.ts: echte
// Quelldatei per readFileSync lesen und strukturell pruefen. Deckt
// insbesondere die Preserve-Regel ab (Update darf event_type_id,
// description, url, is_featured, sort_order NICHT veraendern) sowie das
// Sicherheitsmodell (SECURITY DEFINER, search_path, EXECUTE-Grants) und
// die id+band_id-Zeilenzuordnung.
const sqlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'supabase', 'fn_reference_events_admin.sql'
)
const source = readFileSync(sqlPath, 'utf8')

function extractFunctionBody(functionName: string): string {
  const startMarker = `create or replace function public.${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const endMarker = '\n$$;'
  const endMarkerIndex = source.indexOf(endMarker, startIndex + startMarker.length)
  assert.ok(endMarkerIndex >= 0, `Ende von ${functionName} ("$$;") nicht gefunden`)
  const endIndex = endMarkerIndex + endMarker.length
  return source.slice(startIndex, endIndex)
}

const FUNCTIONS = [
  'fn_reference_event_create',
  'fn_reference_event_update',
  'fn_reference_event_delete',
  'fn_reference_event_move',
]

test('alle vier erwarteten RPCs existieren in fn_reference_events_admin.sql', () => {
  for (const name of FUNCTIONS) {
    assert.ok(source.includes(`create or replace function public.${name}(`), `${name} nicht gefunden`)
  }
})

for (const functionName of FUNCTIONS) {
  test(`${functionName}: SECURITY DEFINER mit search_path = pg_catalog, pg_temp`, () => {
    const body = extractFunctionBody(functionName)
    assert.match(body, /security definer/)
    assert.match(body, /set search_path = pg_catalog, pg_temp/)
  })

  test(`${functionName}: REVOKE ALL fuer public/anon/authenticated und GRANT EXECUTE nur fuer service_role`, () => {
    const revokePublic = new RegExp(`revoke all on function public\\.${functionName}\\([^)]*\\) from public;`)
    const revokeAnon = new RegExp(`revoke all on function public\\.${functionName}\\([^)]*\\) from anon;`)
    const revokeAuthenticated = new RegExp(`revoke all on function public\\.${functionName}\\([^)]*\\) from authenticated;`)
    const grantServiceRole = new RegExp(`grant execute on function public\\.${functionName}\\([^)]*\\) to service_role;`)
    assert.match(source, revokePublic, `${functionName}: REVOKE FROM public fehlt`)
    assert.match(source, revokeAnon, `${functionName}: REVOKE FROM anon fehlt`)
    assert.match(source, revokeAuthenticated, `${functionName}: REVOKE FROM authenticated fehlt`)
    assert.match(source, grantServiceRole, `${functionName}: GRANT EXECUTE TO service_role fehlt`)
  })
}

test('fn_reference_event_create, _update, _delete, _move pruefen alle zuerst die Band-Existenz (Bandzeilen-Lock) und liefern RE001 bei Nichtvorhandensein', () => {
  for (const functionName of FUNCTIONS) {
    const body = extractFunctionBody(functionName)
    assert.match(body, /perform 1 from public\.bands b where b\.id = p_band_id for update;/)
    assert.match(body, /reference_event_band_not_found/)
    assert.match(body, /errcode = 'RE001'/)
  }
})

for (const functionName of ['fn_reference_event_update', 'fn_reference_event_delete', 'fn_reference_event_move']) {
  test(`${functionName}: Zielzeile wird per id geladen UND ihr band_id gegen p_band_id geprueft (RE005 bei Abweichung)`, () => {
    const body = extractFunctionBody(functionName)
    assert.match(body, /where re\.id = p_id\s+for update;/)
    assert.match(body, /v_existing_band_id is distinct from p_band_id/)
    assert.match(body, /reference_event_wrong_band/)
    assert.match(body, /errcode = 'RE005'/)
  })
}

test('fn_reference_event_update: SET-Klausel aendert ausschliesslich event_name/location_name/city/year/updated_at -- event_type_id, description, url, is_featured, sort_order bleiben unangetastet', () => {
  const body = extractFunctionBody('fn_reference_event_update')
  const setMatch = body.match(/update public\.reference_events\s+set ([\s\S]*?)\s+where id = p_id/)
  assert.ok(setMatch, 'SET-Klausel des Update-Statements nicht gefunden')
  const setClause = setMatch![1]

  assert.match(setClause, /event_name\s*=/)
  assert.match(setClause, /location_name\s*=/)
  assert.match(setClause, /city\s*=/)
  assert.match(setClause, /year\s*=/)
  assert.match(setClause, /updated_at\s*=/)

  for (const excludedColumn of ['event_type_id', 'description', 'url', 'is_featured', 'sort_order']) {
    assert.ok(
      !new RegExp(`\\b${excludedColumn}\\s*=`).test(setClause),
      `SET-Klausel darf ${excludedColumn} nicht setzen`
    )
  }

  // Zusaetzliche Verteidigung in der Tiefe: das UPDATE-Statement filtert
  // trotz bereits erfolgter Vorab-Pruefung erneut auf id UND band_id.
  assert.match(body, /where id = p_id\s+and band_id = p_band_id/)
})

test('fn_reference_event_create: INSERT-Spaltenliste enthaelt ausschliesslich band_id/event_name/location_name/city/year/sort_order -- event_type_id, description, url, is_featured bleiben auf ihren Tabellen-Defaults', () => {
  const body = extractFunctionBody('fn_reference_event_create')
  const insertMatch = body.match(/insert into public\.reference_events \(([\s\S]*?)\)/)
  assert.ok(insertMatch, 'Insert-Spaltenliste nicht gefunden')
  const columns = insertMatch![1]

  for (const includedColumn of ['band_id', 'event_name', 'location_name', 'city', 'year', 'sort_order']) {
    assert.ok(columns.includes(includedColumn), `Insert-Spaltenliste muss ${includedColumn} enthalten`)
  }
  for (const excludedColumn of ['event_type_id', 'description', 'url', 'is_featured']) {
    assert.ok(!columns.includes(excludedColumn), `Insert-Spaltenliste darf ${excludedColumn} nicht enthalten`)
  }
})

test('fn_reference_event_create: event_name ist Pflicht (trim + Leerstring-Check), Jahr wird bei Angabe auf 1900-2100 geprueft', () => {
  const body = extractFunctionBody('fn_reference_event_create')
  assert.match(body, /v_event_name := coalesce\(trim\(p_event_name\), ''\);/)
  assert.match(body, /if v_event_name = '' then/)
  assert.match(body, /reference_event_name_required/)
  assert.match(body, /errcode = 'RE002'/)
  assert.match(body, /if p_year is not null and \(p_year < 1900 or p_year > 2100\) then/)
  assert.match(body, /reference_event_year_out_of_range/)
  assert.match(body, /errcode = 'RE003'/)
})

test('fn_reference_event_create: sort_order = COALESCE(MAX(sort_order),0)+1 pro band_id, berechnet unter dem bereits gehaltenen Bandzeilen-Lock (kein separates Read-then-Insert)', () => {
  const body = extractFunctionBody('fn_reference_event_create')
  assert.match(body, /select coalesce\(max\(sort_order\), 0\) \+ 1\s+into v_next_sort_order\s+from public\.reference_events\s+where band_id = p_band_id;/)
  const lockIndex = body.indexOf('perform 1 from public.bands')
  const computeIndex = body.indexOf('select coalesce(max(sort_order)')
  assert.ok(lockIndex >= 0 && computeIndex >= 0)
  assert.ok(lockIndex < computeIndex, 'Bandzeilen-Lock muss vor der sort_order-Berechnung stehen')
})

test('fn_reference_event_move: normalisiert alle Geschwisterzeilen deterministisch (sort_order, created_at, id) bevor der Nachbar bestimmt wird', () => {
  const body = extractFunctionBody('fn_reference_event_move')
  assert.match(body, /order by re\.sort_order asc nulls last, re\.created_at asc nulls last, re\.id asc/)
  assert.match(body, /row_number\(\) over/)
})

test('fn_reference_event_move: ungueltige Richtung wird abgelehnt (RE006), nur up/down erlaubt', () => {
  const body = extractFunctionBody('fn_reference_event_move')
  assert.match(body, /if p_direction is null or p_direction not in \('up', 'down'\) then/)
  assert.match(body, /reference_event_invalid_direction/)
  assert.match(body, /errcode = 'RE006'/)
})

test('fn_reference_event_move: kein Nachbar (Rand erreicht) ist ein sauberer No-op ohne fremde Zeile zu veraendern', () => {
  const body = extractFunctionBody('fn_reference_event_move')
  assert.match(body, /if v_neighbor_id is null then\s+return query select p_id, v_target_position;\s+return;\s+end if;/)
})

test('fn_reference_event_move: Swap ist ein einziges atomares UPDATE mit CASE (keine Zwischenzustaende)', () => {
  const body = extractFunctionBody('fn_reference_event_move')
  const updateMatches = [...body.matchAll(/update public\.reference_events re\s+set sort_order = case/g)]
  assert.equal(updateMatches.length, 1, 'erwartet genau 1 Swap-UPDATE')
})

test('fn_reference_event_delete: verbleibende Referenzen werden nach dem Loeschen luecken-/duplikatfrei neu nummeriert', () => {
  const body = extractFunctionBody('fn_reference_event_delete')
  assert.match(body, /delete from public\.reference_events\s+where id = p_id\s+and band_id = p_band_id;/)
  assert.match(body, /row_number\(\) over/)
  assert.match(body, /order by re\.sort_order asc nulls last, re\.created_at asc nulls last, re\.id asc/)
})
