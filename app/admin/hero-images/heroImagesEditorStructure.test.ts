import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den Admin-Bereich "Hero-Bilder"
// (page.tsx + HeroImagesEditor.tsx), nach dem Vorbild von
// app/admin/event-types/eventTypeBandsEditorStructure.test.ts. Es gibt in
// diesem Repo keine React-Testing-Infrastruktur (kein jsdom, keine
// @testing-library-Abhaengigkeit) -- die echten Quelldateien werden per
// readFileSync gelesen und strukturell geprueft. Anders als beim
// Event-Type-Editor gibt es hier keinen dynamischen [slug]-Ordner, die
// Testdatei liegt daher direkt neben den geprueften Quelldateien.
const dir = path.dirname(fileURLToPath(import.meta.url))
const pageSource = readFileSync(path.join(dir, 'page.tsx'), 'utf8')
const editorSource = readFileSync(path.join(dir, 'HeroImagesEditor.tsx'), 'utf8')
const actionsSource = readFileSync(path.join(dir, 'actions.ts'), 'utf8')

// ── page.tsx: Datenzugriff ────────────────────────────────────────────

test('media_assets-Query verwendet die bestehende Relation zu bands (kein alternativer Weg zum Bandnamen)', () => {
  assert.match(pageSource, /\.from\('media_assets'\)/)
  assert.match(pageSource, /bands\(name, slug\)/)
})

test('Bandname stammt aus bands.name ueber die geladene Relation, nicht aus einem eigenen Feld auf media_assets', () => {
  assert.match(editorSource, /image\.bandName/)
  assert.doesNotMatch(pageSource, /\.from\('bands'\)\s*\n\s*\.select/, 'kein zusaetzlicher separater bands-Query fuer den Namen erwartet -- Embed genuegt')
})

// ── HeroImagesEditor.tsx: Filter ──────────────────────────────────────

test('Bandfilter-Optionen werden aus den tatsaechlich geladenen Bildern abgeleitet, nicht hartkodiert', () => {
  assert.match(editorSource, /const bandOptions = useMemo\(\(\) => \[\.\.\.new Set\(images\.map\(\(img\) => img\.bandName\)\)\]/)
})

test('role-Filter-Optionen werden aus den tatsaechlich vorhandenen role-Werten abgeleitet, keine Annahme ueber die sechs Schema-Rollen', () => {
  assert.match(editorSource, /const roleOptions = useMemo\(\(\) => \[\.\.\.new Set\(images\.map\(\(img\) => img\.role\)\)\]/)
  for (const role of ['hero', 'thumbnail', 'gallery', 'logo', 'press', 'og_image']) {
    assert.doesNotMatch(editorSource, new RegExp(`'${role}'`), `role "${role}" darf nicht hartkodiert im Editor vorkommen`)
  }
})

// ── HeroImagesEditor.tsx: Toggle/Reorder aendern nur lokalen State ────

test('toggleImage aendert ausschliesslich lokalen Client-State (kein direkter RPC-/Action-Aufruf im Klick-Handler)', () => {
  const start = editorSource.indexOf('function toggleImage')
  assert.ok(start >= 0, 'toggleImage nicht gefunden')
  const body = editorSource.slice(start, start + 300)
  assert.doesNotMatch(body, /rpc\(|updateHeroWallSelectionAction/)
  assert.match(body, /setSelection/)
})

test('moveSelection (Reorder) aendert ausschliesslich lokalen Client-State', () => {
  const start = editorSource.indexOf('function moveSelection')
  assert.ok(start >= 0, 'moveSelection nicht gefunden')
  const body = editorSource.slice(start, start + 500)
  assert.doesNotMatch(body, /rpc\(|updateHeroWallSelectionAction/)
  assert.match(body, /setSelection/)
})

// ── HeroImagesEditor.tsx: Save uebertraegt vollstaendigen Zielzustand ─

test('handleSave uebertraegt den vollstaendigen Zielzustand (Id + hero_focus je Position), kein Add/Remove-Diff', () => {
  const start = editorSource.indexOf('function handleSave')
  assert.ok(start >= 0, 'handleSave nicht gefunden')
  const body = editorSource.slice(start, start + 500)
  assert.match(body, /updateHeroWallSelectionAction\(/)
  assert.match(body, /selection\.map\(\(s\) => \(\{ id: s\.id, heroFocus: s\.heroFocus \}\)\)/)
})

// ── HeroImagesEditor.tsx: hero_focus NULL -> center ────────────────────

test('hero_focus wird beim Aufbau der Auswahl ueber resolveHeroFocus normalisiert (NULL wird als center dargestellt)', () => {
  assert.match(editorSource, /import \{ resolveHeroFocus, type HeroFocus \} from '@\/lib\/heroWall\/resolveHeroFocus'/)
  assert.match(editorSource, /heroFocus: resolveHeroFocus\(img\.heroFocus\)/)
})

// ── HeroImagesEditor.tsx: Mobile-Pool-Kennzeichnung ────────────────────

test('Mobile-Pool-Kennzeichnung nutzt isInMobilePool, keine eigene hartkodierte "16"-Pruefung', () => {
  assert.match(editorSource, /import \{[^}]*isInMobilePool[^}]*\} from '@\/lib\/heroWall\/heroWallSelectionState'/)
  assert.match(editorSource, /isInMobilePool\(index\)/)
  // Die Zahl 16 darf nur innerhalb der importierten Konstante leben, nicht
  // ein zweites Mal frei im Editor auftauchen.
  assert.doesNotMatch(editorSource, /< 16|<= 15|position < 16/)
})

test('Mobile-Pool-Hinweistext behauptet nicht, alle 16 Bilder seien gleichzeitig im initialen Viewport sichtbar', () => {
  const forbidden = ['gleichzeitig sichtbar', 'immer sichtbar', 'alle 16 Bilder sichtbar']
  for (const phrase of forbidden) {
    assert.doesNotMatch(editorSource, new RegExp(phrase, 'i'), `unerwartete Behauptung "${phrase}" gefunden`)
  }
})

// ── HeroImagesEditor.tsx: Warnungen ────────────────────────────────────

test('Warnung bei weniger als 10 ausgewaehlten Bildern nutzt isBelowRecommendedMinimum, keine eigene hartkodierte "10"-Pruefung', () => {
  assert.match(editorSource, /import \{[^}]*isBelowRecommendedMinimum[^}]*\} from '@\/lib\/heroWall\/heroWallSelectionState'/)
  assert.match(editorSource, /isBelowRecommendedMinimum\(selection\.length\)/)
  assert.doesNotMatch(editorSource, /selection\.length < 10/)
})

test('Spaltengleichheits-Warnung nutzt findIdenticalHeroWallColumns (echte Sequenzpruefung), keine hartkodierte Problemliste', () => {
  assert.match(editorSource, /import \{ findIdenticalHeroWallColumns \} from '@\/lib\/heroWall\/simulateHeroWallSlots'/)
  assert.match(editorSource, /findIdenticalHeroWallColumns\(selection\.map\(\(s\) => s\.id\)\)/)
  for (const n of ['[8, 12, 16, 24, 32]', '[8,12,16,24,32]']) {
    assert.doesNotMatch(editorSource, new RegExp(n.replace(/[[\]]/g, '\\$&')), 'hartkodierte Problem-N-Liste darf nicht vorkommen')
  }
})

// ── beforeunload-Guard ─────────────────────────────────────────────────

test('beforeunload-Guard ist an hasStagedChanges gekoppelt (fruehzeitiger Return ohne staged Aenderungen)', () => {
  const effectStart = editorSource.indexOf('useEffect(() => {\n    if (!hasStagedChanges) return')
  assert.ok(effectStart >= 0, 'beforeunload-Effect mit fruehzeitigem Return nicht gefunden')
  const effectBody = editorSource.slice(effectStart, effectStart + 400)
  assert.match(effectBody, /addEventListener\('beforeunload', handler\)/)
  assert.match(effectBody, /e\.preventDefault\(\)/)
})

// ── Keine Live-Vorschau (ausdruecklich nicht Teil von Paket 1) ─────────

test('keine Live-Vorschau der echten Hero-Bildwand implementiert', () => {
  // Gezielt nach konkreten Implementierungsartefakten einer echten
  // Vorschau suchen (Import/JSX-Einsatz der Frontend-Hero-Komponente,
  // Embed-/Video-Tag) -- NICHT nach Prosa wie "keine Live-Vorschau" in
  // erklaerenden Kommentaren (diese referenzieren die Abwesenheit des
  // Features legitim) und NICHT nach dem blossen Substring "HeroWall",
  // der legitim Teil der eigenen Typnamen dieses Features ist
  // (HeroWallSelectionItem, heroWallSelectionsAreEqual etc.).
  const forbidden = [
    /from ['"]@\/components\/homepage\/HeroMosaic['"]/,
    /<HeroMosaic/,
    /<iframe/,
    /<video/,
  ]
  for (const pattern of forbidden) {
    assert.doesNotMatch(editorSource, pattern, `unerwarteter Live-Vorschau-Bezug "${pattern}" gefunden`)
    assert.doesNotMatch(pageSource, pattern, `unerwarteter Live-Vorschau-Bezug "${pattern}" gefunden`)
  }
})

// ── actions.ts: reiner RPC-Schreibpfad ─────────────────────────────────

test('actions.ts schreibt hero_wall/hero_wall_position/hero_focus ausschliesslich ueber die RPC, nie per direktem Tabellen-Update', () => {
  assert.doesNotMatch(actionsSource, /\.from\('media_assets'\)\.update\(/)
  assert.match(actionsSource, /\.rpc\('update_hero_wall_selection'/)
})
