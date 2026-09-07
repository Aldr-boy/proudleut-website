import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer Paket 3 (deterministischer SSR-/
// Hydration-Initialzustand von BandExplorer). Kein jsdom/RTL in diesem
// Repo -- identisches, bereits etabliertes Muster wie
// bandExplorerLockedOccasionStructure.test.ts: echte Quelldatei per
// readFileSync lesen und strukturell pruefen.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'BandExplorer.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('initialer shuffled-State ist deterministisch die eingehende bands-Prop, nicht leer und nicht zufaellig', () => {
  assert.match(source, /useState<Band\[\]>\(bands\)/)
  assert.ok(!source.includes('useState<Band[]>([])'), 'darf nicht mehr mit einem leeren Array initialisiert werden')
})

test('keine Zufallsfunktion waehrend der State-Initialisierung (kein useState(() => shuffle(...)) o.ae.)', () => {
  assert.ok(!/useState\([^)]*shuffle\(/.test(source), 'shuffle() darf nicht innerhalb von useState(...) aufgerufen werden')
  assert.ok(!/useState\([^)]*Math\.random/.test(source), 'Math.random darf nicht innerhalb von useState(...) aufgerufen werden')
})

test('bestehender Mount-Effekt randomisiert weiterhin erst nach Hydration (unveraendert erhalten)', () => {
  assert.match(source, /useEffect\(\(\) => \{\r?\n\s*setShuffled\(shuffle\(bands\)\);\r?\n\s*\}, \[\]\)/)
})

test('shuffle() nutzt weiterhin Math.random (bestehende Randomisierung fuer Nutzer nach Hydration bleibt erhalten)', () => {
  assert.match(source, /function shuffle<T>\(arr: T\[\]\): T\[\] \{[\s\S]*?Math\.random\(\)/)
})

test('visibleCount startet unveraendert bei 24', () => {
  assert.match(source, /useState\(24\)/)
})

test('keine neue Datenabfrage eingefuehrt (kein fetch/Supabase-Import in BandExplorer)', () => {
  assert.ok(!source.includes('getAllBandsFromSupabase'))
  assert.ok(!/from ['"]@\/lib\/supabase/.test(source))
})

test('lockedOccasion-, Filter- und Finder-Routing-Logik bleiben unveraendert vorhanden', () => {
  assert.match(source, /lockedOccasion\?:\s*string;/)
  assert.match(source, /buildFinderFilterUrl/)
  assert.match(source, /buildOccasionNavUrl/)
  assert.match(source, /const filtered = shuffled\.filter\(/)
})
