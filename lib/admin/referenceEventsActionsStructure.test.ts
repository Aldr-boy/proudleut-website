import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die 4 Referenz-Server-Actions
// (Referenzverwaltung im Band-Admin, V1) und ReferenceEventsEditorSection.tsx.
// Keine Next.js-Server-Action-Mocking-Infrastruktur in diesem Repo (siehe
// actionsAuthGuardOrder.test.ts) -- reale Quelldateien werden per
// readFileSync textuell geprueft. Der Auth-Guard selbst ist bereits
// vollstaendig in actionsAuthGuardOrder.test.ts abgedeckt; dieser Test
// prueft die darueber hinausgehenden fachlichen Anforderungen: RPC-only
// Schreiben (keine direkte DML auf reference_events), frisch aus der DB
// gelesener slug fuer die Public-Revalidierung, Jahres-Vorabvalidierung.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const actionsSource = readFileSync(path.join(root, 'app', 'admin', 'bands', '[id]', 'actions.ts'), 'utf8')
const editorSource = readFileSync(path.join(root, 'app', 'admin', 'bands', '[id]', 'ReferenceEventsEditorSection.tsx'), 'utf8')

function extractFunctionBody(source: string, functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const nextExportIndex = source.indexOf('\nexport async function ', startIndex + startMarker.length)
  const endIndex = nextExportIndex === -1 ? source.length : nextExportIndex
  return source.slice(startIndex, endIndex)
}

const ACTIONS = [
  'createReferenceEventAction',
  'updateReferenceEventAction',
  'deleteReferenceEventAction',
  'moveReferenceEventAction',
]

const RPC_BY_ACTION: Record<string, string> = {
  createReferenceEventAction: 'fn_reference_event_create',
  updateReferenceEventAction: 'fn_reference_event_update',
  deleteReferenceEventAction: 'fn_reference_event_delete',
  moveReferenceEventAction: 'fn_reference_event_move',
}

test('kein direktes INSERT/UPDATE/DELETE auf reference_events in actions.ts -- Schreiben laeuft ausschliesslich ueber .rpc()', () => {
  assert.ok(
    !actionsSource.includes("from('reference_events')"),
    'actions.ts darf reference_events nicht direkt per .from() ansprechen -- service_role hat nur SELECT-Table-Grant, Schreiben nur ueber RPC'
  )
})

for (const actionName of ACTIONS) {
  test(`${actionName}: schreibt ausschliesslich ueber client.rpc('${RPC_BY_ACTION[actionName]}', ...)`, () => {
    const body = extractFunctionBody(actionsSource, actionName)
    assert.match(body, new RegExp(`client\\.rpc\\('${RPC_BY_ACTION[actionName]}', \\{`))
  })

  test(`${actionName}: liest slug frisch aus der DB fuer die Public-Revalidierung (nicht aus Formular-Input)`, () => {
    const body = extractFunctionBody(actionsSource, actionName)
    assert.match(body, /\.select\('id, slug'\)/)
    assert.match(body, /revalidatePath\(`\/band\/\$\{bandRow\.slug\}`\)/)
    assert.ok(!/name="?slug"?/.test(body), 'slug darf nicht aus formData gelesen werden')
  })

  test(`${actionName}: RPC-Fehler wird nie stillschweigend als Erfolg behandelt`, () => {
    const body = extractFunctionBody(actionsSource, actionName)
    assert.match(body, /if \(error\) referenceEventErrorRedirect\(bandRow\.id, referenceEventErrorCode\(error\)\)/)
  })
}

test('createReferenceEventAction und updateReferenceEventAction: senden p_description an die RPC (V1.1) -- trifft dadurch die neue Ueberladung mit p_description, nicht die alte V1-Signatur', () => {
  for (const actionName of ['createReferenceEventAction', 'updateReferenceEventAction']) {
    const body = extractFunctionBody(actionsSource, actionName)
    assert.match(body, /const description = nullIfEmpty\(str\(formData, 'description'\)\)/)
    assert.match(body, /p_description: description,/)
  }
})

test('createReferenceEventAction und updateReferenceEventAction: Jahr wird vor dem RPC-Aufruf auf Ganzzahl-Format geprueft', () => {
  for (const actionName of ['createReferenceEventAction', 'updateReferenceEventAction']) {
    const body = extractFunctionBody(actionsSource, actionName)
    assert.match(body, /parseReferenceEventYear\(formData\)/)
    const parseIndex = body.indexOf('parseReferenceEventYear(formData)')
    const rpcIndex = body.indexOf('client.rpc(')
    assert.ok(parseIndex >= 0 && rpcIndex >= 0 && parseIndex < rpcIndex, 'Jahres-Validierung muss vor dem RPC-Aufruf stehen')
  }
})

test('moveReferenceEventAction: Richtung wird vor dem RPC-Aufruf auf up/down geprueft', () => {
  const body = extractFunctionBody(actionsSource, 'moveReferenceEventAction')
  assert.match(body, /if \(direction !== 'up' && direction !== 'down'\) referenceEventErrorRedirect\(bandRow\.id, 'reference_event_invalid_direction'\)/)
})

test('REFERENCE_EVENT_ERRCODE_TO_SLUG deckt alle 6 RE-Fehlercodes aus fn_reference_events_admin.sql ab', () => {
  for (const code of ['RE001', 'RE002', 'RE003', 'RE004', 'RE005', 'RE006']) {
    assert.ok(actionsSource.includes(`${code}:`), `${code} fehlt in REFERENCE_EVENT_ERRCODE_TO_SLUG`)
  }
})

test('ReferenceEventsEditorSection: Loeschen verlangt eine Bestaetigung (bestehendes Dokument-Loeschmuster wiederverwendet)', () => {
  assert.match(editorSource, /confirm\('Referenz wirklich löschen\?'\)/)
})

test('ReferenceEventsEditorSection: 0 Referenzen zeigen einen sachlichen Empty State statt eines leeren Lochs', () => {
  assert.match(editorSource, /Noch keine Referenzen vorhanden/)
})

test('ReferenceEventsEditorSection: loadError verhindert die Anzeige jedes Bearbeitungsformulars (fail-closed wie Dokumente/Galerie/Moods)', () => {
  const loadErrorBlockMatch = editorSource.match(/if \(loadError\) \{([\s\S]*?)\n  \}/)
  assert.ok(loadErrorBlockMatch, 'loadError-Block nicht gefunden')
  assert.doesNotMatch(loadErrorBlockMatch![1], /<form/)
})

test('ReferenceEventsEditorSection: kein Formularfeld fuer sort_order -- Umsortierung laeuft ausschliesslich ueber die Verschieben-Buttons', () => {
  assert.doesNotMatch(editorSource, /name="sort_order"/)
})

test('ReferenceEventsEditorSection: kein Formularfeld fuer event_type_id, url oder is_featured (weiterhin out of scope)', () => {
  for (const field of ['event_type_id', 'name="url"', 'is_featured']) {
    assert.ok(!editorSource.includes(field), `${field} darf nicht im Formular vorkommen (out of scope)`)
  }
})

test('ReferenceEventsEditorSection: description ist ab V1.1 als "Zusatz (optional)"-Formularfeld vorhanden, in Anlege- und Bearbeitungsformular', () => {
  const descriptionFieldCount = (editorSource.match(/name="description"/g) ?? []).length
  assert.equal(descriptionFieldCount, 2, 'erwartet je ein description-Feld im Create- und im Update-Formular')
  assert.match(editorSource, /Zusatz/)
})

test('ReferenceEventsEditorSection: weist auf sofort live sichtbare Aenderungen hin (kein separater Entwurfsstatus)', () => {
  assert.match(editorSource, /sofort live sichtbar/)
})
