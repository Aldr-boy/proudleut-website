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

// ── HeroImagesEditor.tsx: "In dieser Ansicht verwendet"-Kennzeichnung ──
// Admin-Adaption (Auftrag Abschnitt 3): das fruehere, mobile-only
// isInMobilePool ist abgeloest -- die Markierung, welche ausgewaehlten
// Bilder tatsaechlich verwendet werden, bezieht sich jetzt auf die
// AKTUELL im Umschalter gewaehlte Ansicht (mobile/tablet/desktop) und
// wird direkt aus slotUsage.total (countUsedHeroWallSlots) abgeleitet --
// keine zweite, admin-eigene hartkodierte Zahl.

test('"in Ansicht verwendet"-Kennzeichnung leitet sich direkt aus slotUsage.total ab, keine eigene hartkodierte Positions-Grenze', () => {
  assert.doesNotMatch(editorSource, /isInMobilePool/, 'das abgeloeste mobile-only Konzept darf nicht mehr referenziert werden')
  assert.match(editorSource, /isUsedInView=\{index < slotUsage\.total\}/)
})

test('isInMobilePool/HERO_WALL_MOBILE_POOL_SIZE sind aus heroWallSelectionState.ts entfernt (ersetzt durch breakpoint-generische Pruefung)', async () => {
  const selectionStateSource = readFileSync(path.join(dir, '..', '..', '..', 'lib', 'heroWall', 'heroWallSelectionState.ts'), 'utf8')
  assert.doesNotMatch(selectionStateSource, /isInMobilePool|HERO_WALL_MOBILE_POOL_SIZE/)
})

// ── HeroImagesEditor.tsx: Warnungen ────────────────────────────────────

test('Warnung bei weniger als 10 ausgewaehlten Bildern nutzt isBelowRecommendedMinimum, keine eigene hartkodierte "10"-Pruefung', () => {
  assert.match(editorSource, /import \{[^}]*isBelowRecommendedMinimum[^}]*\} from '@\/lib\/heroWall\/heroWallSelectionState'/)
  assert.match(editorSource, /isBelowRecommendedMinimum\(selection\.length\)/)
  assert.doesNotMatch(editorSource, /selection\.length < 10/)
})

// Startseiten-Hero-Redesign: die fruehere Modulo-Wrap-Slot-Simulation
// (simulateHeroWallSlots.ts, "identische Spalten"-Warnung) ist abgeloest.
// Die neue Split-Komposition ordnet Bildplatz n = Poolbild n ohne
// Wiederholung zu (heroWallComposition.ts) -- keine Kollisionsgefahr
// mehr, stattdessen eine transparente Nutzungsanzeige.
test('nutzt countUsedHeroWallSlots fuer eine transparente, Breakpoint-abhaengige Bildplatz-Nutzungsanzeige, keine Spaltengleichheits-Warnung mehr', () => {
  assert.match(editorSource, /import \{ countUsedHeroWallSlots \} from '@\/lib\/heroWall\/heroWallComposition'/)
  assert.match(editorSource, /countUsedHeroWallSlots\(selection\.length, previewSize\)/)
  assert.doesNotMatch(editorSource, /findIdenticalHeroWallColumns|simulateHeroWallSlots/, 'abgeloeste Modulo-Wrap-Pruefung darf nicht mehr referenziert werden')
})

test('Bildplatz-Nutzungstext folgt dem Auftragsbeispiel "X ausgewaehlt - Y im <Ansicht>-Hero verwendet - Z weitere ausgewaehlt"', () => {
  assert.match(editorSource, /\{selection\.length\} ausgewählt/)
  assert.match(editorSource, /im \{PREVIEW_DEVICES\[previewSize\]\.label\}-Hero/)
  assert.match(editorSource, /weitere ausgewählt/)
})

// ── beforeunload-Guard ─────────────────────────────────────────────────

test('beforeunload-Guard ist an hasStagedChanges gekoppelt (fruehzeitiger Return ohne staged Aenderungen)', () => {
  // \r?\n statt literalem \n -- robust gegen CRLF/LF-Zeilenenden.
  const effectMatch = editorSource.match(/useEffect\(\(\) => \{\r?\n\s*if \(!hasStagedChanges\) return/)
  assert.ok(effectMatch, 'beforeunload-Effect mit fruehzeitigem Return nicht gefunden')
  const effectStart = effectMatch!.index!
  const effectBody = editorSource.slice(effectStart, effectStart + 400)
  assert.match(effectBody, /addEventListener\('beforeunload', handler\)/)
  assert.match(effectBody, /e\.preventDefault\(\)/)
})

// ── Live-Vorschau: keine zweite Hero-Implementierung im Editor ────────
// Admin-Adaption (Auftrag Abschnitt 1+2): die vorherige CSS-scale()-
// Vorschau (w-[200%]/scale-50 um ein direkt im Editor gerendertes
// <HeroWall>) hat nie echte Breakpoints ausgeloest -- sie skalierte nur
// Pixel, ohne das von Tailwind ausgewertete Viewport zu aendern. Die
// neue Loesung rendert HeroWall NICHT mehr direkt im Editor, sondern in
// einer eigenen Route (app/admin/hero-images/preview) innerhalb eines
// <iframe> mit echter Geraetebreite/-hoehe -- der Editor selbst importiert
// HeroWall daher nicht mehr als Komponente (nur noch den Typ
// HeroWallImage fuer previewImages).

test('Editor rendert HeroWall nicht mehr selbst -- nur der Typ HeroWallImage wird importiert, die Komponente selbst nicht', () => {
  assert.match(editorSource, /import type \{ HeroWallImage \} from '@\/components\/hero\/HeroWall'/)
  // Anker bewusst /<HeroWall[\s>]/ statt /<HeroWall/ -- letzteres matcht
  // auch generische Typparameter wie useState<HeroWallSelectionItem[]>
  // (legitim, kein JSX-Einsatz der Komponente selbst).
  assert.doesNotMatch(editorSource, /<HeroWall[\s>]/, 'HeroWall darf nicht mehr direkt im Editor gerendert werden -- das war die Ursache der nie echten Breakpoints ausloesenden Vorschau')
})

test('Vorschau laeuft in einem <iframe> auf die eigenstaendige Preview-Route, mit echten Geraete-Pixelmassen (390x844 / 768x1024 / 1440x900)', () => {
  assert.match(editorSource, /<iframe/)
  assert.match(editorSource, /src="\/admin\/hero-images\/preview"/)
  assert.match(editorSource, /mobile: \{ width: 390, height: 844/)
  assert.match(editorSource, /tablet: \{ width: 768, height: 1024/)
  assert.match(editorSource, /desktop: \{ width: 1440, height: 900/)
})

test('Iframe-Groesse wird ueber echte width/height-Styles gesetzt (nicht nur optisch skaliert) -- das Iframe bekommt sein eigenes echtes Layout-Viewport', () => {
  // Anker bewusst auf das ref-Attribut, nicht auf den blossen Substring
  // "<iframe" -- der taucht zuerst in einem erklaerenden Kommentar auf
  // (legitime Prosa ueber die Technik), nicht im tatsaechlichen JSX-Tag.
  const start = editorSource.indexOf('ref={previewIframeRef}')
  assert.ok(start >= 0, 'iframe (ref={previewIframeRef}) nicht gefunden')
  const body = editorSource.slice(start, start + 500)
  assert.match(body, /width: PREVIEW_DEVICES\[previewSize\]\.width/)
  assert.match(body, /height: PREVIEW_DEVICES\[previewSize\]\.height/)
})

test('Iframe blockt Interaktionen (pointerEvents none) -- ein Klick in der Vorschau (z.B. der CTA-Link) darf den Admin nicht verlassen', () => {
  const start = editorSource.indexOf('ref={previewIframeRef}')
  assert.ok(start >= 0, 'iframe (ref={previewIframeRef}) nicht gefunden')
  const body = editorSource.slice(start, start + 700)
  assert.match(body, /pointerEvents: 'none'/)
})

test('Vorschau-Sync ueberträgt den unsaved Auswahl-Stand per postMessage (kein zweiter Datenspeicher, kein sessionStorage, kein Save als Vorbedingung)', () => {
  assert.match(editorSource, /import \{ HERO_WALL_PREVIEW_MESSAGE_TYPE \} from '@\/lib\/heroWall\/heroWallPreviewMessage'/)
  assert.match(editorSource, /contentWindow\?\.postMessage\(/)
  assert.match(editorSource, /\{ type: HERO_WALL_PREVIEW_MESSAGE_TYPE, images: previewImages \}/)
  assert.doesNotMatch(editorSource, /sessionStorage|localStorage/, 'kein zweiter, persistenter Datenspeicher fuer die Vorschau erlaubt')
})

test('eigenstaendige Preview-Route rendert dieselben Komponenten wie die Homepage (HeroWall + HeroContent), keine zweite Implementierung', () => {
  const previewSource = readFileSync(path.join(dir, 'preview', 'page.tsx'), 'utf8')
  assert.match(previewSource, /import \{ HeroWall, type HeroWallImage \} from '@\/components\/hero\/HeroWall'/)
  assert.match(previewSource, /import \{ HeroContent \} from '@\/components\/homepage\/HeroContent'/)
  assert.match(previewSource, /<HeroWall images=\{images\}>/)
  assert.match(previewSource, /<HeroContent \/>/)
  assert.match(previewSource, /event\.origin !== window\.location\.origin/, 'Nachrichten muessen auf same-origin geprueft werden')
})

test('previewImages ist ein reiner Mapping-Schritt aus dem bestehenden Auswahl-State, keine zweite Slot-Simulation im Editor', () => {
  const start = editorSource.indexOf('const previewImages')
  assert.ok(start >= 0, 'previewImages nicht gefunden')
  const body = editorSource.slice(start, start + 500)
  assert.match(body, /selection\.flatMap/)
  assert.match(body, /imageById\.get\(s\.id\)/)
  // Keine eigene Grid-/Spalten-/Offset-Berechnung im Editor: die
  // charakteristischen Bausteine der Bildwand-Geometrie duerfen nur in
  // HeroWall.tsx bzw. simulateHeroWallSlots.ts existieren.
  for (const forbidden of ['buildHeroWallSlots', 'splitIntoColumns', 'grid-cols-5', 'COLUMN_META']) {
    assert.doesNotMatch(editorSource, new RegExp(forbidden), `Editor darf "${forbidden}" nicht selbst implementieren`)
  }
})

test('0 ausgewaehlte Bilder: Hinweistext statt Vorschau-Iframe, keine bedingungslose Rendering', () => {
  assert.match(editorSource, /selection\.length === 0 \? \(/)
  const start = editorSource.indexOf('selection.length === 0 ? (')
  const body = editorSource.slice(start, start + 400)
  assert.doesNotMatch(body, /<iframe/, 'Vorschau-Iframe darf im 0-Bilder-Zustand nicht im truthy-Zweig der 0-Pruefung stehen')
})

test('kompakte Darstellung skaliert nur die AEUSSERE Box per Container-Query (echtes Iframe-Viewport bleibt Geraetegroesse) -- keine JS-Breitenermittlung', () => {
  const start = editorSource.indexOf('Rechte Spalte -- Curation-Workspace')
  assert.ok(start >= 0, 'Rechte-Spalte-Block nicht gefunden')
  const body = editorSource.slice(start, start + 5200)
  assert.doesNotMatch(body, /window\.innerWidth|matchMedia|useMediaQuery|ResizeObserver/, 'keine JS-Breitenermittlung fuer eine simulierte Vorschaugroesse erlaubt')
  // Container-Queries sind hier bewusst erlaubt: sie skalieren nur die
  // AEUSSERE Praesentationsbox kompakt, das Iframe selbst behaelt uebers
  // width/height-Style seine echte Geraetegroesse (siehe Iframe-Tests
  // oben) -- das ist keine Breitensimulation, sondern reine Darstellung.
  // container-type: size (statt nur inline-size) macht BEIDE Achsen
  // (cqw und cqh) verfuegbar -- noetig fuer den min(Breite, Hoehe)-Fit.
  assert.match(body, /containerType: 'size'/)
})

test('Skalierungsfaktor ist nie groesser als 1 (kein Hochskalieren schmaler Geraete wie Mobile) -- min(1, Breitenverhaeltnis, Hoehenverhaeltnis)', () => {
  const start = editorSource.indexOf('Live-Vorschau -- eigene Route')
  const body = editorSource.slice(start, start + 5200)
  assert.match(body, /scale\(min\(1, calc\(100cqw \/ \$\{PREVIEW_DEVICES\[previewSize\]\.width\}px\), calc\(100cqh \/ \$\{PREVIEW_DEVICES\[previewSize\]\.height\}px\)\)\)/)
})

// ── UX-Korrektur V2 (Paket 2, SCHRITT 2B Folgeauftrag): rechte Spalte
// ist ein gemeinsamer sticky Curation-Workspace (vollstaendige, visuell
// skalierte HeroWall + separat scrollbare Reihenfolge), linke Spalte
// scrollt unabhaengig durch die gesamte Bildbibliothek. ─────────────────

test('Curation-Workspace liegt in der RECHTEN Spalte (nach "Alle Bilder"), nicht mehr oberhalb beider Spalten', () => {
  const allBilderIdx = editorSource.indexOf('>Alle Bilder<')
  const workspaceIdx = editorSource.indexOf('Rechte Spalte -- Curation-Workspace')
  const previewIdx = editorSource.indexOf('Live-Vorschau -- eigene Route')
  assert.ok(allBilderIdx >= 0 && workspaceIdx >= 0 && previewIdx >= 0, 'einer der Markup-Marker fehlt')
  assert.ok(allBilderIdx < workspaceIdx, '"Alle Bilder" muss vor dem Curation-Workspace stehen (linke vor rechter Spalte)')
  assert.ok(workspaceIdx < previewIdx, 'Live-Vorschau muss innerhalb des Curation-Workspace-Blocks stehen')
})

test('kein Rueckfall auf die alte CSS-scale()-Vorschau (w-[200%]/scale-50 um ein direkt gerendertes HeroWall) -- das loeste nie echte Breakpoints aus', () => {
  assert.doesNotMatch(editorSource, /w-\[200%\]/, 'die alte, nie echt breakpoint-ausloesende Verdopplungs-Technik darf nicht zurueckkehren')
  assert.doesNotMatch(editorSource, /origin-top-left scale-50/, 'die alte 50%-Skalierung um ein direkt gerendertes HeroWall darf nicht zurueckkehren')
  assert.doesNotMatch(editorSource, /h-\[50svh\]/, 'die alte, an HeroWalls eigener min-h-[100svh] verankerte Aussenbox-Hoehe darf nicht zurueckkehren')
})

test('Vorschau-Buehne hat eine gemeinsame, geraeteunabhaengige feste Hoehe (PREVIEW_STAGE_HEIGHT), nicht mehr aspect-ratio-gekoppelt', () => {
  // Nachbesserung "Vorschaugroesse": aspect-ratio auf der Aussenbox war die
  // Ursache der Hochskalierung bei Mobile (Box immer 100% Spaltenbreite,
  // Hoehe daraus abgeleitet -- nie durch eine Hoehen-Obergrenze gedeckelt).
  assert.doesNotMatch(editorSource, /aspectRatio:/, 'aspect-ratio-Kopplung der Aussenbox an das Geraeteseitenverhaeltnis darf nicht zurueckkehren')
  assert.match(editorSource, /const PREVIEW_STAGE_HEIGHT = /)
  const start = editorSource.indexOf('Live-Vorschau -- eigene Route')
  const body = editorSource.slice(start, start + 5200)
  assert.match(body, /height: PREVIEW_STAGE_HEIGHT/)
})

test('skalierter Geraete-Ausschnitt wird unabhaengig vom Skalierungsfaktor exakt in der Buehne zentriert (absolute + 50%/50% + halbe Aussenmasse als negativer Rand)', () => {
  const start = editorSource.indexOf('Live-Vorschau -- eigene Route')
  const body = editorSource.slice(start, start + 5200)
  assert.match(body, /top: '50%'/)
  assert.match(body, /left: '50%'/)
  assert.match(body, /marginTop: -PREVIEW_DEVICES\[previewSize\]\.height \/ 2/)
  assert.match(body, /marginLeft: -PREVIEW_DEVICES\[previewSize\]\.width \/ 2/)
})

test('genau EIN gemeinsamer sticky Workspace (Vorschau + Reihenfolge zusammen), nicht zwei unabhaengige sticky Elemente', () => {
  // Gezielt nach dem tatsaechlichen Klassen-Einsatz suchen (lg:sticky),
  // nicht nach dem blossen Wort "sticky" -- das kommt legitim mehrfach in
  // erklaerenden Kommentaren vor.
  const stickyClassMatches = editorSource.match(/\blg:sticky\b/g) ?? []
  assert.equal(stickyClassMatches.length, 1, `erwartet genau 1 Vorkommen der Klasse "lg:sticky", gefunden: ${stickyClassMatches.length}`)
  assert.match(editorSource, /lg:sticky lg:top-0 lg:max-h-\[100svh\] lg:overflow-hidden/, 'sticky/Hoehenbegrenzung nur ab lg (Desktop), nicht erzwungen auf kleinen Screens')

  const workspaceStart = editorSource.indexOf('lg:sticky lg:top-0')
  const previewIdx = editorSource.indexOf('Live-Vorschau -- eigene Route')
  const poolHeadingIdx = editorSource.indexOf('>Ausgewählter Hero-Pool<')
  assert.ok(workspaceStart >= 0 && previewIdx > workspaceStart, 'Live-Vorschau muss innerhalb der sticky Workspace-Box liegen')
  assert.ok(poolHeadingIdx > previewIdx, '"Ausgewählter Hero-Pool" muss nach der Live-Vorschau, innerhalb derselben sticky Einheit liegen')
})

test('Reihenfolgeliste ist innerhalb des Workspace separat scrollbar (nicht der ganze Workspace)', () => {
  const poolListStart = editorSource.indexOf('min-h-0 flex-1 overflow-y-auto')
  assert.ok(poolListStart >= 0, 'separat scrollbare Reihenfolgeliste nicht gefunden')
  const before = editorSource.slice(0, poolListStart)
  assert.ok(before.includes('>Ausgewählter Hero-Pool<'), 'scrollbare Liste muss nach der "Ausgewählter Hero-Pool"-Ueberschrift stehen')
})

// ── actions.ts: reiner RPC-Schreibpfad ─────────────────────────────────

test('actions.ts schreibt hero_wall/hero_wall_position/hero_focus ausschliesslich ueber die RPC, nie per direktem Tabellen-Update', () => {
  assert.doesNotMatch(actionsSource, /\.from\('media_assets'\)\.update\(/)
  assert.match(actionsSource, /\.rpc\('update_hero_wall_selection'/)
})
