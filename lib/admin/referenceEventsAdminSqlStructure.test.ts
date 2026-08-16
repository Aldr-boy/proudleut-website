import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer supabase/fn_reference_events_admin.sql
// (Referenzverwaltung im Band-Admin, V1 + V1.1). SQL selbst kann in
// diesem Repo nicht ausgefuehrt werden (kein lokales Postgres, keine
// Production-Mutation in Tests) -- identisches, bereits etabliertes
// Muster wie lib/admin/eventTypesArchiveNoBlockers.test.ts: echte
// Quelldatei per readFileSync lesen und strukturell pruefen.
//
// V1.1 ("description als optionale Unterzeile") fuegt fn_reference_event_create
// und fn_reference_event_update backward-kompatibel als ZUSAETZLICHE
// Ueberladungen mit p_description text hinzu -- die alten V1-Signaturen
// (ohne p_description) bleiben unveraendert bestehen (die aktuell live
// deployte Admin-Oberflaeche ruft sie weiterhin auf), bis der V1.1-
// App-Code vollstaendig deployed ist. Die Datei enthaelt deshalb create
// und update je zweimal (alte + neue Ueberladung) -- extractAllFunctionBodies
// liefert beide Vorkommen in Datei-Reihenfolge (Index 0 = alt, Index 1 = neu).
//
// Preserve-Regel (angepasst fuer V1.1): event_type_id, url, is_featured,
// sort_order bleiben in BEIDEN Update-Ueberladungen unangetastet.
// description ist NUR in der neuen 7-Arg-Ueberladung editierbar -- die
// alte 6-Arg-Ueberladung laesst description weiterhin unveraendert
// (identisches, eingefrorenes V1-Verhalten, keine eigene Preserve-Test-
// Aussage mehr noetig ausser der Regressionspruefung, dass sie
// unveraendert/eingefroren bleibt).
const sqlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'supabase', 'fn_reference_events_admin.sql'
)
const source = readFileSync(sqlPath, 'utf8')

function extractAllFunctionBodies(functionName: string): string[] {
  const startMarker = `create or replace function public.${functionName}(`
  const bodies: string[] = []
  let searchFrom = 0
  for (;;) {
    const startIndex = source.indexOf(startMarker, searchFrom)
    if (startIndex === -1) break
    const endMarker = '\n$$;'
    const endMarkerIndex = source.indexOf(endMarker, startIndex + startMarker.length)
    assert.ok(endMarkerIndex >= 0, `Ende von ${functionName} ("$$;") nicht gefunden (Vorkommen ab Index ${startIndex})`)
    const endIndex = endMarkerIndex + endMarker.length
    bodies.push(source.slice(startIndex, endIndex))
    searchFrom = endIndex
  }
  return bodies
}

const SINGLE_FUNCTIONS = ['fn_reference_event_delete', 'fn_reference_event_move']
const OVERLOADED_FUNCTIONS = ['fn_reference_event_create', 'fn_reference_event_update']

test('fn_reference_event_delete und fn_reference_event_move existieren genau einmal (unveraendert, keine Ueberladung noetig)', () => {
  for (const name of SINGLE_FUNCTIONS) {
    const bodies = extractAllFunctionBodies(name)
    assert.equal(bodies.length, 1, `${name}: erwartet genau 1 Vorkommen, gefunden ${bodies.length}`)
  }
})

test('fn_reference_event_create und fn_reference_event_update existieren jeweils genau zweimal (alte V1- + neue V1.1-Ueberladung)', () => {
  for (const name of OVERLOADED_FUNCTIONS) {
    const bodies = extractAllFunctionBodies(name)
    assert.equal(bodies.length, 2, `${name}: erwartet genau 2 Ueberladungen, gefunden ${bodies.length}`)
  }
})

test('keine DROP FUNCTION-Statements -- alte V1-Signaturen werden nicht entfernt (backward-kompatibel)', () => {
  assert.ok(!/drop function/i.test(source), 'die Datei darf keine DROP FUNCTION-Statements enthalten')
})

test('alte 5-/6-Arg-Signaturen von create/update sind weiterhin per GRANT EXECUTE fuer service_role registriert', () => {
  assert.match(source, /grant execute on function public\.fn_reference_event_create\(uuid, text, text, text, integer\) to service_role;/)
  assert.match(source, /grant execute on function public\.fn_reference_event_update\(uuid, uuid, text, text, text, integer\) to service_role;/)
})

test('neue 6-/7-Arg-Ueberladungen (mit p_description) sind per GRANT EXECUTE fuer service_role registriert', () => {
  assert.match(source, /grant execute on function public\.fn_reference_event_create\(uuid, text, text, text, integer, text\) to service_role;/)
  assert.match(source, /grant execute on function public\.fn_reference_event_update\(uuid, uuid, text, text, text, integer, text\) to service_role;/)
})

test('alle vier create/update-Ueberladungen haben REVOKE ALL fuer public/anon/authenticated', () => {
  const signatures = [
    'fn_reference_event_create\\(uuid, text, text, text, integer\\)',
    'fn_reference_event_create\\(uuid, text, text, text, integer, text\\)',
    'fn_reference_event_update\\(uuid, uuid, text, text, text, integer\\)',
    'fn_reference_event_update\\(uuid, uuid, text, text, text, integer, text\\)',
  ]
  for (const sig of signatures) {
    for (const role of ['public', 'anon', 'authenticated']) {
      assert.match(source, new RegExp(`revoke all on function public\\.${sig} from ${role};`), `REVOKE FROM ${role} fuer ${sig} fehlt`)
    }
  }
})

for (const functionName of [...SINGLE_FUNCTIONS, ...OVERLOADED_FUNCTIONS]) {
  test(`${functionName}: alle Ueberladungen sind SECURITY DEFINER mit search_path = pg_catalog, pg_temp`, () => {
    for (const body of extractAllFunctionBodies(functionName)) {
      assert.match(body, /security definer/)
      assert.match(body, /set search_path = pg_catalog, pg_temp/)
    }
  })

  test(`${functionName}: alle Ueberladungen pruefen zuerst die Band-Existenz und liefern RE001 bei Nichtvorhandensein`, () => {
    for (const body of extractAllFunctionBodies(functionName)) {
      assert.match(body, /perform 1 from public\.bands b where b\.id = p_band_id for update;/)
      assert.match(body, /reference_event_band_not_found/)
      assert.match(body, /errcode = 'RE001'/)
    }
  })
}

for (const functionName of ['fn_reference_event_update', 'fn_reference_event_delete', 'fn_reference_event_move']) {
  test(`${functionName}: alle Ueberladungen pruefen Zielzeile per id UND vergleichen band_id (RE005 bei Abweichung)`, () => {
    for (const body of extractAllFunctionBodies(functionName)) {
      assert.match(body, /where re\.id = p_id\s+for update;/)
      assert.match(body, /v_existing_band_id is distinct from p_band_id/)
      assert.match(body, /reference_event_wrong_band/)
      assert.match(body, /errcode = 'RE005'/)
    }
  })
}

test('fn_reference_event_update ALT (6-Arg, V1): SET-Klausel unveraendert -- event_name/location_name/city/year/updated_at, description weiterhin NICHT enthalten (eingefroren)', () => {
  const [oldBody] = extractAllFunctionBodies('fn_reference_event_update')
  assert.ok(!oldBody.includes('p_description'), 'alte Ueberladung darf p_description nicht als Parameter haben')
  const setMatch = oldBody.match(/update public\.reference_events\s+set ([\s\S]*?)\s+where id = p_id/)
  assert.ok(setMatch, 'SET-Klausel der alten Update-Ueberladung nicht gefunden')
  const setClause = setMatch![1]
  for (const includedColumn of ['event_name', 'location_name', 'city', 'year', 'updated_at']) {
    assert.match(setClause, new RegExp(`${includedColumn}\\s*=`))
  }
  for (const excludedColumn of ['event_type_id', 'description', 'url', 'is_featured', 'sort_order']) {
    assert.ok(!new RegExp(`\\b${excludedColumn}\\s*=`).test(setClause), `alte SET-Klausel darf ${excludedColumn} nicht setzen`)
  }
})

test('fn_reference_event_update NEU (7-Arg, V1.1): SET-Klausel aendert event_name/location_name/city/year/description/updated_at -- event_type_id, url, is_featured, sort_order bleiben unangetastet', () => {
  const [, newBody] = extractAllFunctionBodies('fn_reference_event_update')
  assert.match(newBody, /p_description text/)
  const setMatch = newBody.match(/update public\.reference_events\s+set ([\s\S]*?)\s+where id = p_id/)
  assert.ok(setMatch, 'SET-Klausel der neuen Update-Ueberladung nicht gefunden')
  const setClause = setMatch![1]

  for (const includedColumn of ['event_name', 'location_name', 'city', 'year', 'description', 'updated_at']) {
    assert.match(setClause, new RegExp(`${includedColumn}\\s*=`), `neue SET-Klausel muss ${includedColumn} setzen`)
  }
  for (const excludedColumn of ['event_type_id', 'url', 'is_featured', 'sort_order']) {
    assert.ok(!new RegExp(`\\b${excludedColumn}\\s*=`).test(setClause), `neue SET-Klausel darf ${excludedColumn} nicht setzen`)
  }

  // Zusaetzliche Verteidigung in der Tiefe: das UPDATE-Statement filtert
  // trotz bereits erfolgter Vorab-Pruefung erneut auf id UND band_id.
  assert.match(newBody, /where id = p_id\s+and band_id = p_band_id/)
})

test('fn_reference_event_create ALT (5-Arg, V1): INSERT-Spaltenliste unveraendert -- description weiterhin NICHT enthalten (eingefroren)', () => {
  const [oldBody] = extractAllFunctionBodies('fn_reference_event_create')
  assert.ok(!oldBody.includes('p_description'), 'alte Ueberladung darf p_description nicht als Parameter haben')
  const insertMatch = oldBody.match(/insert into public\.reference_events \(([\s\S]*?)\)/)
  assert.ok(insertMatch, 'Insert-Spaltenliste der alten Create-Ueberladung nicht gefunden')
  const columns = insertMatch![1]
  for (const includedColumn of ['band_id', 'event_name', 'location_name', 'city', 'year', 'sort_order']) {
    assert.ok(columns.includes(includedColumn), `${includedColumn} muss in der alten Insert-Spaltenliste stehen`)
  }
  for (const excludedColumn of ['event_type_id', 'description', 'url', 'is_featured']) {
    assert.ok(!columns.includes(excludedColumn), `${excludedColumn} darf in der alten Insert-Spaltenliste nicht stehen`)
  }
})

test('fn_reference_event_create NEU (6-Arg, V1.1): INSERT-Spaltenliste enthaelt zusaetzlich description -- event_type_id, url, is_featured bleiben auf ihren Tabellen-Defaults', () => {
  const [, newBody] = extractAllFunctionBodies('fn_reference_event_create')
  assert.match(newBody, /p_description text/)
  const insertMatch = newBody.match(/insert into public\.reference_events \(([\s\S]*?)\)/)
  assert.ok(insertMatch, 'Insert-Spaltenliste der neuen Create-Ueberladung nicht gefunden')
  const columns = insertMatch![1]
  for (const includedColumn of ['band_id', 'event_name', 'location_name', 'city', 'year', 'description', 'sort_order']) {
    assert.ok(columns.includes(includedColumn), `${includedColumn} muss in der neuen Insert-Spaltenliste stehen`)
  }
  for (const excludedColumn of ['event_type_id', 'url', 'is_featured']) {
    assert.ok(!columns.includes(excludedColumn), `${excludedColumn} darf in der neuen Insert-Spaltenliste nicht stehen`)
  }
})

for (const functionName of OVERLOADED_FUNCTIONS) {
  test(`${functionName}: alle Ueberladungen pruefen event_name (Pflicht, trim) und year (1900-2100, falls gesetzt)`, () => {
    for (const body of extractAllFunctionBodies(functionName)) {
      assert.match(body, /v_event_name := coalesce\(trim\(p_event_name\), ''\);/)
      assert.match(body, /if v_event_name = '' then/)
      assert.match(body, /reference_event_name_required/)
      assert.match(body, /errcode = 'RE002'/)
      assert.match(body, /if p_year is not null and \(p_year < 1900 or p_year > 2100\) then/)
      assert.match(body, /reference_event_year_out_of_range/)
      assert.match(body, /errcode = 'RE003'/)
    }
  })
}

test('fn_reference_event_create: sort_order = COALESCE(MAX(sort_order),0)+1 pro band_id in beiden Ueberladungen, berechnet unter dem bereits gehaltenen Bandzeilen-Lock', () => {
  for (const body of extractAllFunctionBodies('fn_reference_event_create')) {
    assert.match(body, /select coalesce\(max\(sort_order\), 0\) \+ 1\s+into v_next_sort_order\s+from public\.reference_events\s+where band_id = p_band_id;/)
    const lockIndex = body.indexOf('perform 1 from public.bands')
    const computeIndex = body.indexOf('select coalesce(max(sort_order)')
    assert.ok(lockIndex >= 0 && computeIndex >= 0)
    assert.ok(lockIndex < computeIndex, 'Bandzeilen-Lock muss vor der sort_order-Berechnung stehen')
  }
})

test('fn_reference_event_move: normalisiert alle Geschwisterzeilen deterministisch (sort_order, created_at, id) bevor der Nachbar bestimmt wird', () => {
  const [body] = extractAllFunctionBodies('fn_reference_event_move')
  assert.match(body, /order by re\.sort_order asc nulls last, re\.created_at asc nulls last, re\.id asc/)
  assert.match(body, /row_number\(\) over/)
})

test('fn_reference_event_move: ungueltige Richtung wird abgelehnt (RE006), nur up/down erlaubt', () => {
  const [body] = extractAllFunctionBodies('fn_reference_event_move')
  assert.match(body, /if p_direction is null or p_direction not in \('up', 'down'\) then/)
  assert.match(body, /reference_event_invalid_direction/)
  assert.match(body, /errcode = 'RE006'/)
})

test('fn_reference_event_move: kein Nachbar (Rand erreicht) ist ein sauberer No-op ohne fremde Zeile zu veraendern', () => {
  const [body] = extractAllFunctionBodies('fn_reference_event_move')
  assert.match(body, /if v_neighbor_id is null then\s+return query select p_id, v_target_position;\s+return;\s+end if;/)
})

test('fn_reference_event_move: Swap ist ein einziges atomares UPDATE mit CASE (keine Zwischenzustaende)', () => {
  const [body] = extractAllFunctionBodies('fn_reference_event_move')
  const updateMatches = [...body.matchAll(/update public\.reference_events re\s+set sort_order = case/g)]
  assert.equal(updateMatches.length, 1, 'erwartet genau 1 Swap-UPDATE')
})

test('fn_reference_event_delete: verbleibende Referenzen werden nach dem Loeschen luecken-/duplikatfrei neu nummeriert', () => {
  const [body] = extractAllFunctionBodies('fn_reference_event_delete')
  assert.match(body, /delete from public\.reference_events\s+where id = p_id\s+and band_id = p_band_id;/)
  assert.match(body, /row_number\(\) over/)
  assert.match(body, /order by re\.sort_order asc nulls last, re\.created_at asc nulls last, re\.id asc/)
})
