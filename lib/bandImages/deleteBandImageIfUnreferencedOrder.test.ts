import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung: deleteBandImageIfUnreferenced() darf
// in den drei Aufrufstellen (Hero/Thumbnail/Galerie-Delete) erst NACH
// einem bereits erfolgreichen DB-Update bzw. einer bereits erfolgreichen
// Galerie-Delete-RPC aufgerufen werden -- ein DB-/RPC-Fehler fuehrt in
// allen drei Faellen ueber redirect() (wirft intern) zu einem fruehen
// Ausstieg, sodass der Helper-Aufruf danach nie erreicht wird. Es
// existiert in diesem Repo keine Server-Action-Mocking-Infrastruktur,
// daher prueft dieser Test die tatsaechliche Quelldatei textuell --
// gleiches, etabliertes Muster wie actionsAuthGuardOrder.test.ts.
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

test('updateBandHeroImageAction: deleteBandImageIfUnreferenced() steht nach dem dbError-Guard', () => {
  const body = extractFunctionBody('updateBandHeroImageAction')
  const dbErrorGuardIndex = body.indexOf('if (dbError)')
  const helperCallIndex = body.indexOf('deleteBandImageIfUnreferenced(')
  assert.ok(dbErrorGuardIndex >= 0, 'kein dbError-Guard gefunden')
  assert.ok(helperCallIndex >= 0, 'kein Helper-Aufruf gefunden')
  assert.ok(helperCallIndex > dbErrorGuardIndex, 'Helper-Aufruf muss nach dem dbError-Guard stehen')
})

test('updateBandThumbnailAction: deleteBandImageIfUnreferenced() steht nach dem dbError-Guard', () => {
  const body = extractFunctionBody('updateBandThumbnailAction')
  const dbErrorGuardIndex = body.indexOf('if (dbError)')
  const helperCallIndex = body.indexOf('deleteBandImageIfUnreferenced(')
  assert.ok(dbErrorGuardIndex >= 0, 'kein dbError-Guard gefunden')
  assert.ok(helperCallIndex >= 0, 'kein Helper-Aufruf gefunden')
  assert.ok(helperCallIndex > dbErrorGuardIndex, 'Helper-Aufruf muss nach dem dbError-Guard stehen')
})

test('deleteBandGalleryImageAction: deleteBandImageIfUnreferenced() steht nach dem rpcError-Guard', () => {
  const body = extractFunctionBody('deleteBandGalleryImageAction')
  const rpcErrorGuardIndex = body.indexOf('if (rpcError)')
  const helperCallIndex = body.indexOf('deleteBandImageIfUnreferenced(')
  assert.ok(rpcErrorGuardIndex >= 0, 'kein rpcError-Guard gefunden')
  assert.ok(helperCallIndex >= 0, 'kein Helper-Aufruf gefunden')
  assert.ok(helperCallIndex > rpcErrorGuardIndex, 'Helper-Aufruf muss nach dem rpcError-Guard stehen')
})

test('deleteBandImageIfUnreferenced wird in actions.ts importiert und in genau drei Actions verwendet', () => {
  assert.match(source, /import \{ deleteBandImageIfUnreferenced \} from ['"]@\/lib\/bandImages\/deleteBandImageIfUnreferenced['"]/)
  const occurrences = source.match(/deleteBandImageIfUnreferenced\(client,/g) ?? []
  assert.equal(occurrences.length, 3, `erwartet genau 3 Aufrufstellen (Hero/Thumbnail/Galerie-Delete), gefunden ${occurrences.length}`)
})

test('updateBandHeroImageAction: der an den Helper uebergebene Wert ist die volle alte URL (oldUrl), kein bereits extrahierter Storage-Pfad', () => {
  const body = extractFunctionBody('updateBandHeroImageAction')
  assert.match(body, /deleteBandImageIfUnreferenced\(client, oldUrl, 'hero-image'\)/)
  assert.match(body, /oldUrl = resolution\.row\.url/)
})

test('updateBandThumbnailAction: der an den Helper uebergebene Wert ist die volle alte URL (oldUrl)', () => {
  const body = extractFunctionBody('updateBandThumbnailAction')
  assert.match(body, /deleteBandImageIfUnreferenced\(client, oldUrl, 'thumbnail-image'\)/)
  assert.match(body, /oldUrl = resolution\.row\.url/)
})

test('deleteBandGalleryImageAction: der an den Helper uebergebene Wert ist die von der RPC gelieferte deleted_url', () => {
  const body = extractFunctionBody('deleteBandGalleryImageAction')
  assert.match(body, /deleteBandImageIfUnreferenced\(client, deletedUrl, 'gallery-image'\)/)
  assert.match(body, /const deletedUrl = rpcRows\?\.\[0\]\?\.deleted_url/)
})

test('Galerie-Add und Galerie-Move rufen deleteBandImageIfUnreferenced nicht auf (unveraendert, ausserhalb des Scopes)', () => {
  const addBody = extractFunctionBody('addBandGalleryImageAction')
  const moveBody = extractFunctionBody('moveBandGalleryImageAction')
  assert.ok(!addBody.includes('deleteBandImageIfUnreferenced'), 'addBandGalleryImageAction darf den Helper nicht verwenden')
  assert.ok(!moveBody.includes('deleteBandImageIfUnreferenced'), 'moveBandGalleryImageAction darf den Helper nicht verwenden')
})
