import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die "Klingt nach"-Facette in
// components/bands/BandExplorer.tsx. Die Komponente ist eine 'use
// client'-React-Komponente mit next/navigation-Hooks -- es gibt in diesem
// Repo keine React-Testing-Infrastruktur (kein jsdom, keine
// @testing-library-Abhaengigkeit). Identisches, bereits etabliertes
// Muster wie lib/admin/repertoireStylesPageDisplay.test.ts und
// lib/admin/repertoireStyleEditorDatalistSort.test.ts: die echte
// Quelldatei per readFileSync lesen, betroffene Logik extrahieren und per
// new Function tatsaechlich ausfuehren, plus strukturelle Pruefungen fuer
// die UI-/Wiring-Teile, die sich nicht sinnvoll isoliert ausfuehren lassen.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'bands', 'BandExplorer.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('mood wird aus lib/moods/bandMoodFilter importiert (keine zweite parallele URL-State-Logik)', () => {
  assert.match(source, /import \{ resolveMoodSlugParam, bandMatchesMood \} from '@\/lib\/moods\/bandMoodFilter'/)
})

test('selectedMood wird beim ersten Laden aus dem URL-Parameter "mood" initialisiert', () => {
  assert.match(source, /searchParams\.get\('mood'\)/)
  assert.match(source, /const \[selectedMood, setSelectedMood\] = useState<string \| null>/)
})

test('URL-Sync-Effekt (Back\\/Forward) liest "mood" ebenfalls ueber resolveMoodSlugParam', () => {
  const effectStart = source.indexOf('URL → State bei Back/Forward')
  assert.ok(effectStart >= 0, 'Back/Forward-Sync-Effekt nicht gefunden')
  const effectBody = source.slice(effectStart, source.indexOf('Offenes Panel bei Klick außerhalb'))
  assert.match(effectBody, /nextMoodRaw = p\.get\('mood'\)/)
  assert.match(effectBody, /resolveMoodSlugParam\(nextMoodRaw, availableMoodSlugs\)/)
  assert.match(effectBody, /setSelectedMood\(\(prev\) => \(prev !== nextMood \? nextMood : prev\)\)/)
})

test('Filterpraedikat prueft bandMatchesMood(band.moods, selectedMood)', () => {
  assert.match(source, /if \(!bandMatchesMood\(band\.moods, selectedMood\)\) return false;/)
})

test('sichtbare Facette "Klingt nach" vorhanden (Segment-Button + Panel, listbox/option-Semantik wie bestehende Facetten)', () => {
  assert.match(source, /Segment 5 – Klingt nach\?/)
  assert.match(source, /aria-expanded=\{openPanel === 'mood'\}/)
  assert.match(source, /aria-haspopup="listbox"/)
  assert.match(source, /Panel – Klingt nach/)
  assert.match(source, /role="listbox"\s*\n\s*aria-label="Klingt nach auswählen"/)
  assert.match(source, /role="option"/)
})

test('Facette ist per Tastatur bedienbar (native <button>-Elemente, kein div-onClick ohne Rollensemantik)', () => {
  const panelStart = source.indexOf('Panel – Klingt nach')
  const panelBody = source.slice(panelStart, panelStart + 1500)
  assert.match(panelBody, /<button/)
  assert.doesNotMatch(panelBody, /<div[^>]*onClick/)
})

test('resetFilters setzt selectedMood zurueck', () => {
  const resetStart = source.indexOf('const resetFilters = useCallback')
  const resetBody = source.slice(resetStart, resetStart + 400)
  assert.match(resetBody, /setSelectedMood\(null\);/)
})

test('hasFilter beruecksichtigt selectedMood (Reset-Leiste erscheint auch bei reinem Mood-Filter)', () => {
  assert.match(source, /const hasFilter = Boolean\(\s*[\s\S]*?selectedMood/)
})

// ------------------------------------------------------------
// buildUrl: extrahiert und real ausgefuehrt (new Function), um Punkt 4
// (Mood bleibt bei Kombination mit bestehenden Filtern erhalten) und
// Punkt 5 (Entfernen loescht nur "mood") tatsaechlich zu belegen, nicht
// nur strukturell.
// ------------------------------------------------------------
type BuildUrlParams = {
  anlass: string | null
  region: string | null
  suche: string
  bandtyp: string | null
  mood: string | null
}

function buildUrlViaSource(params: BuildUrlParams): string {
  const startMarker = 'function buildUrl(params: {'
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, 'buildUrl nicht gefunden')
  const bodyOpen = source.indexOf('{', source.indexOf('): string {', startIndex))
  const bodyClose = source.indexOf('\n}', bodyOpen)
  const fnBody = source.slice(bodyOpen + 1, bodyClose)
  const fn = new Function('params', 'URLSearchParams', fnBody) as (
    params: BuildUrlParams,
    URLSearchParamsCtor: typeof URLSearchParams
  ) => string
  return fn(params, URLSearchParams)
}

test('buildUrl: mood bleibt bei Kombination mit bestehenden Filtern erhalten', () => {
  const url = buildUrlViaSource({
    anlass: 'hochzeit',
    region: 'Oberbayern',
    suche: 'Test',
    bandtyp: 'Partyband',
    mood: 'tanzflaechen-garantie',
  })
  const qs = new URLSearchParams(url.split('?')[1])
  assert.equal(qs.get('anlass'), 'hochzeit')
  assert.equal(qs.get('region'), 'oberbayern')
  assert.equal(qs.get('suche'), 'Test')
  assert.equal(qs.get('bandtyp'), 'partyband')
  assert.equal(qs.get('mood'), 'tanzflaechen-garantie')
})

test('buildUrl: Entfernen von mood (null) entfernt nur "mood", nicht die anderen Parameter', () => {
  const url = buildUrlViaSource({
    anlass: 'hochzeit',
    region: 'Oberbayern',
    suche: 'Test',
    bandtyp: 'Partyband',
    mood: null,
  })
  const qs = new URLSearchParams(url.split('?')[1])
  assert.equal(qs.has('mood'), false)
  assert.equal(qs.get('anlass'), 'hochzeit')
  assert.equal(qs.get('region'), 'oberbayern')
  assert.equal(qs.get('suche'), 'Test')
  assert.equal(qs.get('bandtyp'), 'partyband')
})

test('buildUrl: ohne jeden Filter (inkl. mood) ergibt sich der reine /bands-Pfad', () => {
  const url = buildUrlViaSource({ anlass: null, region: null, suche: '', bandtyp: null, mood: null })
  assert.equal(url, '/bands')
})
