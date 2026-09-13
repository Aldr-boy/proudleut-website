import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Bandlogo-Adaption des
// Band-Admins: Logo-Editor (LogoEditorSection.tsx), seine Actions
// (actions.ts) und die Gruppierung "Bilder & Logo" in page.tsx. Gleiches
// Prinzip wie actionsImageValidationOrder.test.ts/actionsAuthGuardOrder.test.ts --
// keine Server-Action-Mocking-Infrastruktur in diesem Repo, daher werden
// die tatsaechlichen Quelldateien textuell geprueft. Liegt bewusst
// ausserhalb von app/admin/bands/[id]/ (Node-Test-Runner interpretiert
// "[id]" als Glob-Zeichenklasse und faende dort liegende Tests
// stillschweigend nicht -- empirisch bereits in den bestehenden
// Bild-Tests dokumentiert).
const bandsIdDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'bands', '[id]'
)
const actionsSource = readFileSync(path.join(bandsIdDir, 'actions.ts'), 'utf8')
const pageSource = readFileSync(path.join(bandsIdDir, 'page.tsx'), 'utf8')
const logoEditorSource = readFileSync(path.join(bandsIdDir, 'LogoEditorSection.tsx'), 'utf8')

function extractFunctionBody(functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = actionsSource.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const nextExportIndex = actionsSource.indexOf('\nexport async function ', startIndex + startMarker.length)
  const endIndex = nextExportIndex === -1 ? actionsSource.length : nextExportIndex
  return actionsSource.slice(startIndex, endIndex)
}

// ── actions.ts: role='logo', rollenneutrale Helfer wiederverwendet ────

test('updateBandLogoAction schreibt role=logo, nutzt dieselben rollenneutralen Helfer wie Hero/Thumbnail', () => {
  const body = extractFunctionBody('updateBandLogoAction')
  assert.match(body, /role: 'logo'/)
  assert.match(body, /\.eq\('role', 'logo'\)/)
  assert.match(body, /resolvePubliclyUsedMediaRow\(/)
  assert.match(body, /buildBandImageStoragePath\(bandRow\.slug, 'logo', validation\.ext, uniqueSuffix\)/)
  assert.match(body, /deleteBandImageIfUnreferenced\(/)
})

test('updateBandLogoAction: bestehende Zeile wird per id aktualisiert oder genau eine neue angelegt (kein Delete-then-Insert)', () => {
  const body = extractFunctionBody('updateBandLogoAction')
  assert.match(body, /\.update\(\{ url: newUrl \}\)/)
  assert.match(body, /\.insert\(\{/)
  assert.doesNotMatch(body, /\.delete\(\)/, 'updateBandLogoAction darf keine Zeile loeschen (nur update/insert)')
})

test('updateBandLogoAction: Ambiguitaet blockiert den Upload (fail-closed, keine Bereinigung)', () => {
  const body = extractFunctionBody('updateBandLogoAction')
  assert.match(body, /resolution\.kind === 'ambiguous'/)
  assert.match(body, /logoErrorRedirect\(bandRow\.id, 'logo_ambiguous'\)/)
})

test('removeBandLogoAction loescht direkt per id (keine RPC, keine Delete-by-role), sperrt bei Ambiguitaet', () => {
  const body = extractFunctionBody('removeBandLogoAction')
  assert.match(body, /\.eq\('role', 'logo'\)/)
  assert.match(body, /resolvePubliclyUsedMediaRow\(/)
  assert.match(body, /resolution\.kind === 'ambiguous'/)
  assert.match(body, /logoErrorRedirect\(bandRow\.id, 'logo_ambiguous'\)/)
  assert.match(body, /\.delete\(\)\s*\n\s*\.eq\('id', resolution\.row\.id\)/)
  assert.doesNotMatch(body, /\.rpc\(/, 'removeBandLogoAction braucht keine RPC -- Einzelzeilen-Rolle ohne Reihenfolge')
})

test('removeBandLogoAction: kein Logo vorhanden wird defensiv abgefangen, nicht stillschweigend als Erfolg behandelt', () => {
  const body = extractFunctionBody('removeBandLogoAction')
  assert.match(body, /logoErrorRedirect\(bandRow\.id, 'logo_remove_target_missing'\)/)
})

test('actions.ts: updateBandLogoAction und removeBandLogoAction sind exportiert', () => {
  assert.match(actionsSource, /export async function updateBandLogoAction\(/)
  assert.match(actionsSource, /export async function removeBandLogoAction\(/)
})

// ── LogoEditorSection.tsx: Anzeige, Upload, Entfernen mit Bestaetigung ─

test('LogoEditorSection importiert updateBandLogoAction und removeBandLogoAction, keine eigene Schreiblogik', () => {
  assert.match(logoEditorSource, /import \{ updateBandLogoAction, removeBandLogoAction \} from '\.\/actions'/)
})

test('Logo-Vorschau nutzt object-contain (kein Beschnitt), nicht object-cover wie Hero\\/Thumbnail', () => {
  assert.match(logoEditorSource, /object-contain/)
  assert.doesNotMatch(logoEditorSource, /object-cover/, 'Logo darf nicht beschnitten werden -- object-cover wuerde das tun')
})

test('Vorschauhintergrund ist umschaltbar (hell/dunkel), rein clientseitiger useState -- keine Datenwirkung', () => {
  assert.match(logoEditorSource, /useState<'light' \| 'dark'>\('light'\)/)
  assert.match(logoEditorSource, /setPreviewBg\('light'\)/)
  assert.match(logoEditorSource, /setPreviewBg\('dark'\)/)
})

test('Entfernen-Formular fragt vor dem Submit per confirm() nach Bestaetigung (gleiches Muster wie DeleteContactButton)', () => {
  const formStart = logoEditorSource.indexOf('action={removeBandLogoAction}')
  assert.ok(formStart >= 0, 'removeBandLogoAction-Formular nicht gefunden')
  const body = logoEditorSource.slice(formStart, formStart + 300)
  assert.match(body, /onSubmit=\{\(e\) => \{/)
  assert.match(body, /if \(!confirm\(/)
  assert.match(body, /e\.preventDefault\(\)/)
})

test('Entfernen-Formular wird nur bei vorhandenem Logo gerendert, Upload/Entfernen werden bei Ambiguitaet ausgeblendet', () => {
  assert.match(logoEditorSource, /\{!isAmbiguous && logoImage && \(/)
  assert.match(logoEditorSource, /\{!isAmbiguous && \(\s*\n\s*<form action=\{updateBandLogoAction\}/)
})

test('Konflikthinweis bei Ambiguitaet wird angezeigt', () => {
  assert.match(logoEditorSource, /\{isAmbiguous && \(/)
  assert.match(logoEditorSource, /Datenkonflikt/)
})

test('loadError zeigt Fehlerzustand statt Formular (fail-closed, gleiches Muster wie Hero\\/Thumbnail)', () => {
  const start = logoEditorSource.indexOf('if (loadError)')
  assert.ok(start >= 0)
  const body = logoEditorSource.slice(start, start + 400)
  assert.doesNotMatch(body, /<form/, 'im loadError-Zweig darf kein Formular gerendert werden')
})

// ── page.tsx: "Bilder & Logo"-Gruppierung, Reihenfolge ─────────────────

test('page.tsx gruppiert die vier Bildeditoren unter der Ueberschrift "Bilder & Logo"', () => {
  assert.match(pageSource, />Bilder & Logo</)
})

test('Reihenfolge in "Bilder & Logo": Logo -> Hero-Bild -> Thumbnail -> Galerie', () => {
  const groupStart = pageSource.indexOf('Bilder & Logo')
  assert.ok(groupStart >= 0, '"Bilder & Logo"-Bereich nicht gefunden')
  const groupEnd = pageSource.indexOf('Ende Bilder & Logo', groupStart)
  assert.ok(groupEnd > groupStart, 'Ende-Marker des Bereichs nicht gefunden')
  const body = pageSource.slice(groupStart, groupEnd)

  const logoIdx = body.indexOf('<LogoEditorSection')
  const heroIdx = body.indexOf('<HeroImageEditorSection')
  const thumbIdx = body.indexOf('<ThumbnailEditorSection')
  const galleryIdx = body.indexOf('<GalleryEditorSection')

  assert.ok(logoIdx >= 0 && heroIdx >= 0 && thumbIdx >= 0 && galleryIdx >= 0, 'einer der vier Editoren fehlt in der Gruppe')
  assert.ok(logoIdx < heroIdx, 'Logo muss vor Hero-Bild stehen')
  assert.ok(heroIdx < thumbIdx, 'Hero-Bild muss vor Thumbnail stehen')
  assert.ok(thumbIdx < galleryIdx, 'Thumbnail muss vor Galerie stehen')
})

test('page.tsx laedt media_assets role=logo und leitet currentLogoImage + logoIsAmbiguous ueber resolvePubliclyUsedMediaRow ab', () => {
  assert.match(pageSource, /\.eq\('role', 'logo'\)/)
  assert.match(pageSource, /const logoRowResolution = resolvePubliclyUsedMediaRow\(logoMediaAssetsRaw \?\? \[\]\)/)
  assert.match(pageSource, /const logoIsAmbiguous = logoRowResolution\.kind === 'ambiguous'/)
})

test('jeder der vier Bildeditoren behaelt sein eigenes Formular/seine eigene Aktion (keine gemeinsame Speicheraktion)', () => {
  const distinctActions = ['updateBandLogoAction', 'removeBandLogoAction', 'updateBandHeroImageAction', 'updateBandThumbnailAction', 'addBandGalleryImageAction']
  for (const action of distinctActions) {
    assert.match(actionsSource, new RegExp(`export async function ${action}\\(`))
  }
})
