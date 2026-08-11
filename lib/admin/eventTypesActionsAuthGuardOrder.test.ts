import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung: jede der vier Event-Types-Katalog-
// Actions in app/admin/event-types/actions.ts muss requireAdminSession()
// als ALLERERSTE Anweisung aufrufen -- vor jedem FormData-Zugriff, vor
// createAdminClient(), vor jedem RPC-Zugriff. Identisches Muster wie
// lib/admin/repertoireStylesActionsAuthGuardOrder.test.ts und
// lib/admin/moodsActionsAuthGuardOrder.test.ts -- bewusst eine eigene,
// kleine Kopie statt einer geteilten Abstraktion, da alle Dateien
// unterschiedliche Quelldateien pruefen. Es existiert in diesem Repo
// keine Server-Action-Mocking-Infrastruktur und next/headers.cookies()
// funktioniert nur innerhalb eines echten Next.js-Request-Scopes -- ein
// echter End-to-End-Actiontest ist daher nicht sinnvoll isoliert
// moeglich. Die reine Session-Vergleichslogik selbst ist separat in
// isValidAdminSession.test.ts unit-getestet.
const actionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'event-types', 'actions.ts'
)
const source = readFileSync(actionsPath, 'utf8')

const PROTECTED_ACTIONS = [
  'createEventTypeAction',
  'updateEventTypeAction',
  'archiveEventTypeAction',
  'reactivateEventTypeAction',
]

function extractFunctionBody(functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const nextExportIndex = source.indexOf('\nexport async function ', startIndex + startMarker.length)
  const endIndex = nextExportIndex === -1 ? source.length : nextExportIndex
  return source.slice(startIndex, endIndex)
}

test('genau die vier erwarteten Event-Types-Katalog-Actions existieren in actions.ts', () => {
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

  test(`${functionName}: requireAdminSession() steht vor jedem FormData-Zugriff`, () => {
    const body = extractFunctionBody(functionName)
    const guardIndex = body.indexOf('await requireAdminSession()')
    assert.ok(guardIndex >= 0, 'kein Guard-Aufruf gefunden')

    const strCallIndex = body.indexOf('str(formData')
    if (strCallIndex >= 0) {
      assert.ok(guardIndex < strCallIndex, 'Guard muss vor str(formData, ...) stehen')
    }
  })

  test(`${functionName}: requireAdminSession() steht vor createAdminClient() und jedem RPC-Aufruf`, () => {
    const body = extractFunctionBody(functionName)
    const guardIndex = body.indexOf('await requireAdminSession()')

    for (const marker of ['createAdminClient()', '.rpc(']) {
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

test('requireAdminSession wird in app/admin/event-types/actions.ts importiert', () => {
  assert.match(source, /import \{ requireAdminSession \} from ['"]@\/lib\/admin\/requireAdminSession['"]/)
})

test('keine direkten Tabellen-Writes auf public.event_types -- ausschliesslich RPC-Aufrufe', () => {
  assert.ok(!source.includes("from('event_types')"), 'Datei darf niemals direkt .from(\'event_types\') aufrufen -- Ziel ist ein reiner RPC-Schreibpfad')
  for (const rpcName of ['create_event_type', 'update_event_type', 'archive_event_type', 'reactivate_event_type']) {
    assert.ok(source.includes(`rpc('${rpcName}'`), `erwarteter RPC-Aufruf 'rpc(\'${rpcName}\'' nicht gefunden`)
  }
})

test('updateEventTypeAction uebergibt keinen p_slug-Parameter an die RPC -- Slug bleibt bei normaler Bearbeitung unveraendert', () => {
  const body = extractFunctionBody('updateEventTypeAction')
  // "p_slug:" (RPC-Parameter-Syntax), nicht der blosse Teilstring
  // "p_slug" -- der erklaerende Kommentar in dieser Funktion erwaehnt
  // "p_slug" bewusst in Prosa, das ist kein tatsaechlicher Parameter.
  assert.ok(!body.includes('p_slug:'), 'updateEventTypeAction darf keinen p_slug-Parameter an update_event_type uebergeben')
})

test('createEventTypeAction leitet den Slug deterministisch aus dem Namen ab (slugifyEventTypeName)', () => {
  const body = extractFunctionBody('createEventTypeAction')
  assert.match(body, /const slug = slugifyEventTypeName\(name\)/)
  assert.match(body, /p_slug: slug/)
})
