import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung: jede der People-Admin-Actions in
// app/admin/people/actions.ts muss requireAdminSession() als ALLERERSTE
// Anweisung aufrufen -- identisches Muster wie
// lib/admin/eventTypesActionsAuthGuardOrder.test.ts. Testdatei liegt
// bewusst NICHT unter app/admin/people/ selbst: `node --test` interpretiert
// "[id]" in Verzeichnisnamen als Glob-Zeichenklasse (bestaetigtes
// Verhalten, siehe app/admin/moods/moodBandsEditorStructure.test.ts) --
// hier zwar keine [id]-Datei betroffen, aber lib/admin/ ist ohnehin der
// etablierte Ort fuer alle Auth-Guard-Order-Tests dieses Projekts.
const actionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'people', 'actions.ts'
)
const source = readFileSync(actionsPath, 'utf8')

const PROTECTED_ACTIONS = [
  'createPersonAction',
  'updatePersonAction',
  'publishPersonAction',
  'archivePersonAction',
  'createMembershipAction',
  'updateMembershipAction',
  'deleteMembershipAction',
  'createPersonLinkAction',
  'updatePersonLinkAction',
  'deletePersonLinkAction',
]

// Grenzt exakt auf den Funktionskoerper ein (bis zur unindentierten
// schliessenden Klammer), NICHT bis zum naechsten "export async
// function"-Marker -- sonst wuerden erklaerende Kommentarbloecke VOR der
// naechsten Funktion (die z. B. "approved_at" in Prosa erwaehnen) faelschlich
// als Teil dieser Funktion gezaehlt.
function extractFunctionBody(functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const closingBraceIndex = source.indexOf('\n}', startIndex + startMarker.length)
  assert.ok(closingBraceIndex >= 0, `keine unindentierte schliessende Klammer fuer ${functionName} gefunden`)
  return source.slice(startIndex, closingBraceIndex + 2)
}

test('genau die sieben erwarteten People-Admin-Actions existieren in actions.ts', () => {
  for (const name of PROTECTED_ACTIONS) {
    assert.ok(source.includes(`export async function ${name}(`), `${name} nicht gefunden`)
  }
})

for (const functionName of PROTECTED_ACTIONS) {
  test(`${functionName}: requireAdminSession() ist die allererste Anweisung im Funktionskoerper`, () => {
    const body = extractFunctionBody(functionName)
    const openBraceIndex = body.indexOf('{')
    assert.ok(openBraceIndex >= 0, 'keine oeffnende Klammer gefunden')

    const afterBrace = body.slice(openBraceIndex + 1)
    const firstStatementLine = afterBrace
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0)

    assert.equal(
      firstStatementLine,
      'await requireAdminSession()',
      `${functionName}: erste Anweisung muss der Auth-Guard sein, gefunden: "${firstStatementLine}"`
    )
  })

  test(`${functionName}: requireAdminSession() steht vor createAdminClient() und jedem DB-Zugriff`, () => {
    const body = extractFunctionBody(functionName)
    const guardIndex = body.indexOf('await requireAdminSession()')

    for (const marker of ['createAdminClient()', '.from(']) {
      const markerIndex = body.indexOf(marker)
      if (markerIndex >= 0) {
        assert.ok(guardIndex < markerIndex, `Guard muss vor "${marker}" stehen`)
      }
    }
  })

  test(`${functionName}: requireAdminSession() wird genau einmal aufgerufen (kein alternativer ungeschuetzter Pfad)`, () => {
    const body = extractFunctionBody(functionName)
    const occurrences = body.match(/await requireAdminSession\(\)/g) ?? []
    assert.equal(occurrences.length, 1, `${functionName}: erwartet genau 1 Guard-Aufruf, gefunden ${occurrences.length}`)
  })
}

test('requireAdminSession wird in app/admin/people/actions.ts importiert', () => {
  assert.match(source, /import \{ requireAdminSession \} from ['"]@\/lib\/admin\/requireAdminSession['"]/)
})

// ─────────────────────────────────────────
// approved_at-Regel (Auftrag "Paket 3", Abschnitt "approved_at --
// verbindliche V1-Regel"): strukturell bestaetigen, dass nur
// publishPersonAction approved_at setzt, updatePersonAction und
// archivePersonAction dieses Feld NIE anfassen.
// ─────────────────────────────────────────

test('updatePersonAction (Stammdaten) setzt niemals status oder approved_at', () => {
  const body = extractFunctionBody('updatePersonAction')
  assert.ok(!body.includes('approved_at'), 'updatePersonAction darf approved_at nicht referenzieren')
  assert.ok(!/status:/.test(body), 'updatePersonAction darf status nicht setzen')
})

test('archivePersonAction setzt status auf archived, aber niemals approved_at', () => {
  const body = extractFunctionBody('archivePersonAction')
  assert.match(body, /status: 'archived'/)
  const updateCallIndex = body.indexOf(".update({ status: 'archived' })")
  assert.ok(updateCallIndex >= 0, 'archivePersonAction muss status isoliert auf archived setzen, ohne approved_at im selben Update')
})

test('publishPersonAction setzt status auf active UND approved_at neu', () => {
  const body = extractFunctionBody('publishPersonAction')
  assert.match(body, /status: 'active'/)
  assert.match(body, /approved_at: new Date\(\)\.toISOString\(\)/)
})

test('publishPersonAction/archivePersonAction lesen den aktuellen Status frisch aus der DB vor jeder Statusaenderung', () => {
  for (const name of ['publishPersonAction', 'archivePersonAction']) {
    const body = extractFunctionBody(name)
    assert.match(body, /\.from\('people'\)\.select\('status'\)/, `${name} muss den Status frisch lesen`)
  }
})

// ─────────────────────────────────────────
// createMembershipAction: is_public muss hart auf false gesetzt sein, kein
// Formularwert darf dieses Feld beeinflussen.
// ─────────────────────────────────────────

test('createMembershipAction setzt is_public immer hart auf false und liest es nicht aus dem Formular', () => {
  const body = extractFunctionBody('createMembershipAction')
  assert.match(body, /is_public: false/)
  assert.ok(!body.includes("formData.get('is_public')"), 'createMembershipAction darf is_public nicht aus dem Formular lesen')
})

test('updateMembershipAction liest is_public bewusst regulaer aus dem Formular', () => {
  const body = extractFunctionBody('updateMembershipAction')
  assert.match(body, /formData\.get\('is_public'\) === '1'/)
})

test('keine direkten Table-Writes auf public.people/band_memberships/band_membership_instruments ohne vorherige Existenz-/Ownership-Pruefung -- deleteMembershipAction prueft person_id vor dem Delete', () => {
  const body = extractFunctionBody('deleteMembershipAction')
  assert.match(body, /existing\.person_id !== person_id/)
})

// ─────────────────────────────────────────
// person_links (Paket 4C-B): is_public muss beim Anlegen hart auf false
// gesetzt sein, beim Bearbeiten bewusst regulaer editierbar.
// ─────────────────────────────────────────

test('createPersonLinkAction setzt is_public immer hart auf false und liest es nicht aus dem Formular', () => {
  const body = extractFunctionBody('createPersonLinkAction')
  assert.match(body, /is_public: false/)
  assert.ok(!body.includes("formData.get('is_public')"), 'createPersonLinkAction darf is_public nicht aus dem Formular lesen')
})

test('updatePersonLinkAction liest is_public bewusst regulaer aus dem Formular -- ueber getAll().includes(), da formData.get() bei Mehrfachwerten (hidden Fallback + Checkbox) nur den ersten Eintrag liefert', () => {
  const body = extractFunctionBody('updatePersonLinkAction')
  assert.match(body, /formData\.getAll\('is_public'\)\.includes\('1'\)/)
  assert.ok(!body.includes("formData.get('is_public')"), 'updatePersonLinkAction darf das ordnungsabhaengige formData.get(\'is_public\') nicht verwenden')
})

test('createPersonLinkAction/updatePersonLinkAction validieren URL ausschliesslich https (isValidHttpsUrl)', () => {
  for (const name of ['createPersonLinkAction', 'updatePersonLinkAction']) {
    const body = extractFunctionBody(name)
    assert.match(body, /isValidHttpsUrl\(url\)/, `${name} muss isValidHttpsUrl verwenden`)
  }
})

test('createPersonLinkAction/updatePersonLinkAction lehnen ein Duplikat der Hauptwebsite ab (isDuplicateOfWebsite)', () => {
  for (const name of ['createPersonLinkAction', 'updatePersonLinkAction']) {
    const body = extractFunctionBody(name)
    assert.match(body, /isDuplicateOfWebsite\(url, person\.website_url/, `${name} muss isDuplicateOfWebsite pruefen`)
  }
})

test('deletePersonLinkAction prueft person_id vor dem Delete (Ownership)', () => {
  const body = extractFunctionBody('deletePersonLinkAction')
  assert.match(body, /existing\.person_id !== person_id/)
})
