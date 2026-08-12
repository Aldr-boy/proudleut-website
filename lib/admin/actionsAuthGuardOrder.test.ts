import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung: JEDE exportierte Action in dieser
// Datei, die createAdminClient() (service_role) erreicht, muss
// requireAdminSession() als ALLERERSTE Anweisung aufrufen -- vor jedem
// FormData-Zugriff, vor jedem Service-Role-Client, vor jedem
// DB-/Storage-/RPC-Zugriff. Es existiert in diesem Repo keine
// Server-Action-Mocking-Infrastruktur und next/headers.cookies()
// funktioniert nur innerhalb eines echten Next.js-Request-Scopes -- ein
// echter End-to-End-Actiontest ist daher nicht sinnvoll isoliert
// moeglich. Dieser Test prueft daher die tatsaechliche Quelldatei
// textuell: ein spaeteres versehentliches Verschieben des Guards (z. B.
// hinter formData.get() oder createAdminClient()) wuerde diesen Test
// zuverlaessig brechen. Die reine Session-Vergleichslogik selbst ist
// separat in isValidAdminSession.test.ts unit-getestet.
//
// Liste per Vollstaendigkeitspruefung ermittelt (Codex-P1-Nachtrag,
// erweitert um die 6 Banddokument-Actions aus Paket 2C):
// alle 24 exportierten Funktionen dieser Datei erreichen
// createAdminClient() direkt im eigenen Funktionskoerper (kein
// indirekter lokaler Helper mit eigenem DB-Zugriff gefunden -- die
// wenigen lokalen, nicht exportierten Funktionen in dieser Datei sind
// reine Validierungs-/Fehlercode-/Redirect-Helfer ohne DB-Zugriff).
const actionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'bands', '[id]', 'actions.ts'
)
const source = readFileSync(actionsPath, 'utf8')

const PROTECTED_ACTIONS = [
  'updateBandAction',
  'createContactAction',
  'updateContactAction',
  'deleteContactAction',
  'updateBandEventTypesAction',
  'updateBandBandTypesAction',
  'updateBandVideoAction',
  'updateLocationAction',
  'searchLocationsAction',
  'reassignLocationAction',
  'updateSimilarBandsAction',
  'updateBandMoodsAction',
  'updateBandRepertoireStylesAction',
  'updateBandHeroImageAction',
  'updateBandThumbnailAction',
  'addBandGalleryImageAction',
  'deleteBandGalleryImageAction',
  'moveBandGalleryImageAction',
  'createBandDocumentAction',
  'updateBandDocumentAction',
  'replaceBandDocumentPdfAction',
  'replaceBandDocumentCoverAction',
  'deleteBandDocumentAction',
  'moveBandDocumentAction',
]

function extractFunctionBody(functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const nextExportIndex = source.indexOf('\nexport async function ', startIndex + startMarker.length)
  const endIndex = nextExportIndex === -1 ? source.length : nextExportIndex
  return source.slice(startIndex, endIndex)
}

test('genau die 18 erwarteten privilegierten Actions existieren in actions.ts', () => {
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

    const formDataGetIndex = body.indexOf('formData.get(')
    if (formDataGetIndex >= 0) {
      assert.ok(guardIndex < formDataGetIndex, 'Guard muss vor formData.get() stehen')
    }
    const strCallIndex = body.indexOf('str(formData')
    if (strCallIndex >= 0) {
      assert.ok(guardIndex < strCallIndex, 'Guard muss vor str(formData, ...) stehen')
    }
  })

  test(`${functionName}: requireAdminSession() steht vor jedem Service-Role-Client, DB-/Storage-/RPC-Zugriff und jeder Revalidierung`, () => {
    const body = extractFunctionBody(functionName)
    const guardIndex = body.indexOf('await requireAdminSession()')

    for (const marker of ['createAdminClient()', '.storage', '.rpc(', "from('media_assets')", "from('bands')", 'revalidatePath(']) {
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

test('requireAdminSession wird in actions.ts importiert', () => {
  assert.match(source, /import \{ requireAdminSession \} from ['"]@\/lib\/admin\/requireAdminSession['"]/)
})
