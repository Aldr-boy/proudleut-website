import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Reihenfolge in den fuenf
// Bild-Upload-Actions (Logo/Hero/Thumbnail/Galerie-Add/Banddokument-Cover):
// Validierung MUSS vor jedem Storage-Upload und jedem DB-Write stehen, und
// ein bestehendes Storage-Objekt darf erst NACH einem erfolgreichen
// DB-Write geloescht werden. Es existiert in diesem Repo keine
// Server-Action-Mocking-Infrastruktur, daher prueft dieser Test die
// tatsaechliche Quelldatei textuell -- ein spaeteres versehentliches
// Umsortieren (z. B. Upload vor Validierung) wuerde diesen Test
// zuverlaessig brechen.
//
// replaceBandDocumentCoverAction (Paket 2C) und updateBandLogoAction
// (Bandlogo-Adaption) wurden als vierte/fuenfte Aufrufstelle ergaenzt --
// beide nutzen denselben, unveraenderten validateBandImageFile()-Helfer
// wie Hero/Thumbnail/Galerie (kein neuer Validierungscode).
// removeBandLogoAction (Entfernen, kein Upload) wird separat unten
// geprueft, ausserhalb dieser Validierungs-Reihenfolge-Pruefung.
//
// Liegt bewusst hier statt neben actions.ts: Node's Test-Runner
// interpretiert "[id]" im Pfad als Glob-Zeichenklasse und findet in einer
// Datei innerhalb von app/admin/bands/[id]/ dadurch stillschweigend keine
// Tests (0 Tests, kein Fehler) -- empirisch bestaetigt. Der Pfad zur
// Quelldatei wird daher relativ von hier aus aufgeloest.
const actionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'bands', '[id]', 'actions.ts'
)
const source = readFileSync(actionsPath, 'utf8')

function extractFunctionBody(functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const nextExportIndex = source.indexOf('\nexport async function ', startIndex + startMarker.length)
  const endIndex = nextExportIndex === -1 ? source.length : nextExportIndex
  return source.slice(startIndex, endIndex)
}

function assertValidationBeforeUploadBeforeDbWrite(functionName: string, dbWriteMarker: string) {
  const body = extractFunctionBody(functionName)

  const validationIndex = body.indexOf('await validateBandImageFile(bytes)')
  assert.ok(validationIndex >= 0, `${functionName}: kein validateBandImageFile-Aufruf gefunden`)

  const guardIndex = body.indexOf('if (!validation.ok)', validationIndex)
  assert.ok(guardIndex > validationIndex, `${functionName}: kein Guard direkt nach der Validierung gefunden`)

  const uploadIndex = body.indexOf('.upload(', guardIndex)
  assert.ok(uploadIndex > guardIndex, `${functionName}: Storage-Upload muss nach dem Validierungs-Guard stehen`)

  const dbWriteIndex = body.indexOf(dbWriteMarker, uploadIndex)
  assert.ok(dbWriteIndex > uploadIndex, `${functionName}: DB-Write (${dbWriteMarker}) muss nach dem Storage-Upload stehen`)
}

test('updateBandLogoAction: Validierung -> Upload -> DB-Write', () => {
  assertValidationBeforeUploadBeforeDbWrite('updateBandLogoAction', "from('media_assets')")
})

test('updateBandHeroImageAction: Validierung -> Upload -> DB-Write', () => {
  assertValidationBeforeUploadBeforeDbWrite('updateBandHeroImageAction', "from('media_assets')")
})

test('updateBandThumbnailAction: Validierung -> Upload -> DB-Write', () => {
  assertValidationBeforeUploadBeforeDbWrite('updateBandThumbnailAction', "from('media_assets')")
})

test('addBandGalleryImageAction: Validierung -> Upload -> DB-Write (RPC)', () => {
  assertValidationBeforeUploadBeforeDbWrite('addBandGalleryImageAction', "rpc('add_band_gallery_image'")
})

test('replaceBandDocumentCoverAction: Validierung -> Upload -> DB-Write', () => {
  assertValidationBeforeUploadBeforeDbWrite('replaceBandDocumentCoverAction', "from('band_documents')")
})

test('updateBandLogoAction: altes Storage-Objekt wird erst NACH dem erfolgreichen DB-Write entfernt', () => {
  const body = extractFunctionBody('updateBandLogoAction')
  const dbWriteBlockIndex = body.indexOf('if (dbError)')
  assert.ok(dbWriteBlockIndex >= 0, 'kein dbError-Guard gefunden')
  const oldDeleteIndex = body.indexOf('oldUrl', dbWriteBlockIndex)
  assert.ok(oldDeleteIndex > dbWriteBlockIndex, 'Loeschen des alten Objekts muss erst nach der dbError-Pruefung erfolgen')
})

test('removeBandLogoAction: Storage-Objekt wird erst NACH dem erfolgreichen DB-Delete entfernt, kein Upload-Pfad', () => {
  const body = extractFunctionBody('removeBandLogoAction')
  assert.doesNotMatch(body, /\.upload\(/, 'removeBandLogoAction darf keinen Storage-Upload ausloesen')
  const deleteGuardIndex = body.indexOf('if (deleteError)')
  assert.ok(deleteGuardIndex >= 0, 'kein deleteError-Guard gefunden')
  const cleanupIndex = body.indexOf('deleteBandImageIfUnreferenced', deleteGuardIndex)
  assert.ok(cleanupIndex > deleteGuardIndex, 'Storage-Cleanup muss erst nach der deleteError-Pruefung erfolgen')
})

test('removeBandLogoAction: bei Ambiguitaet wird nicht geloescht (kein automatisches Aufraeumen)', () => {
  const body = extractFunctionBody('removeBandLogoAction')
  const ambiguousIndex = body.indexOf("logoErrorRedirect(bandRow.id, 'logo_ambiguous')")
  const deleteCallIndex = body.indexOf('.delete()')
  assert.ok(ambiguousIndex >= 0, 'kein ambiguous-Guard gefunden')
  assert.ok(deleteCallIndex > ambiguousIndex, 'der eigentliche Delete-Aufruf muss nach dem ambiguous-Guard stehen')
})

test('updateBandHeroImageAction: altes Storage-Objekt wird erst NACH dem erfolgreichen DB-Write entfernt', () => {
  const body = extractFunctionBody('updateBandHeroImageAction')
  const dbWriteBlockIndex = body.indexOf('if (dbError)')
  assert.ok(dbWriteBlockIndex >= 0, 'kein dbError-Guard gefunden')
  const oldDeleteIndex = body.indexOf('oldUrl', dbWriteBlockIndex)
  assert.ok(oldDeleteIndex > dbWriteBlockIndex, 'Loeschen des alten Objekts muss erst nach der dbError-Pruefung erfolgen')
})

test('updateBandThumbnailAction: altes Storage-Objekt wird erst NACH dem erfolgreichen DB-Write entfernt', () => {
  const body = extractFunctionBody('updateBandThumbnailAction')
  const dbWriteBlockIndex = body.indexOf('if (dbError)')
  assert.ok(dbWriteBlockIndex >= 0, 'kein dbError-Guard gefunden')
  const oldDeleteIndex = body.indexOf('oldUrl', dbWriteBlockIndex)
  assert.ok(oldDeleteIndex > dbWriteBlockIndex, 'Loeschen des alten Objekts muss erst nach der dbError-Pruefung erfolgen')
})

test('validateBandImageFile-Aufrufe werden awaited (async Signatur korrekt verwendet)', () => {
  const occurrences = source.match(/validateBandImageFile\(bytes\)/g) ?? []
  const awaitedOccurrences = source.match(/await validateBandImageFile\(bytes\)/g) ?? []
  assert.equal(occurrences.length, 5, 'Es werden exakt 5 Aufrufstellen erwartet (Logo/Hero/Thumbnail/Galerie-Add/Banddokument-Cover)')
  assert.equal(awaitedOccurrences.length, occurrences.length, 'Jeder validateBandImageFile-Aufruf muss awaited werden')
})
