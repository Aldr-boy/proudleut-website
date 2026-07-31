import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den UX-Nachtrag "Repertoire-
// Vorschlagsliste alphabetisch sortieren" in
// app/admin/bands/[id]/RepertoireStyleEditorSection.tsx. Die Komponente
// ist eine 'use client'-React-Komponente mit Hooks -- es gibt in diesem
// Repo keine React-Testing-Infrastruktur (kein jsdom, keine
// @testing-library-Abhaengigkeit, keine .test.tsx-Datei) und next/link
// laesst sich nicht isoliert unter node --test importieren. Identisches,
// bereits etabliertes Muster wie
// lib/admin/repertoireStylesPageDisplay.test.ts: die echte Quelldatei per
// readFileSync lesen, die betroffene Sortierlogik strukturell pruefen und
// den extrahierten useMemo-Funktionskoerper per new Function tatsaechlich
// ausfuehren -- kein von Hand nachgebauter Duplikat-Code.
const sectionPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'bands', '[id]', 'RepertoireStyleEditorSection.tsx'
)
const source = readFileSync(sectionPath, 'utf8')

test('die Datalist rendert alphabeticalCatalog, nicht das unsortierte catalog-Array', () => {
  assert.match(source, /<datalist id=\{DATALIST_ID\}>\s*\{alphabeticalCatalog\.map\(/)
  assert.ok(!source.includes('{catalog.map((s) => (\n              <option'), 'Datalist darf nicht mehr direkt ueber catalog.map rendern')
})

test('lookupById und byName bleiben unveraendert auf dem urspruenglichen catalog-Array', () => {
  assert.match(source, /for \(const s of catalog\) map\.set\(s\.id, s\)/)
  assert.match(source, /for \(const s of catalog\) map\.set\(s\.name, s\)/)
})

test('Rang-/Zuordnungssortierung (sortBandRepertoireStyleAssignments) ist unveraendert', () => {
  assert.match(source, /const sorted = useMemo\(\(\) => sortBandRepertoireStyleAssignments\(assignments\)\.slice\(0, RANK_COUNT\), \[assignments\]\)/)
})

type CatalogFixture = { id: string; name: string; slug: string; description: string | null; status: string; sort_order: number }

function extractAlphabeticalCatalogMemoBody(): string {
  const startMarker = 'const alphabeticalCatalog = useMemo(() => {'
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, 'alphabeticalCatalog-useMemo nicht gefunden')
  const bodyStart = startIndex + startMarker.length
  const endMarker = '\n  }, [catalog])'
  const endIndex = source.indexOf(endMarker, bodyStart)
  assert.ok(endIndex >= 0, 'Ende des alphabeticalCatalog-useMemo nicht gefunden')
  return source.slice(bodyStart, endIndex)
}

function runAlphabeticalCatalogMemo(catalog: CatalogFixture[]): CatalogFixture[] {
  const body = extractAlphabeticalCatalogMemoBody()
  const fn = new Function('catalog', body) as (catalog: CatalogFixture[]) => CatalogFixture[]
  return fn(catalog)
}

function makeEntry(overrides: Partial<CatalogFixture> & { id: string; name: string }): CatalogFixture {
  return {
    slug: overrides.id,
    description: null,
    status: 'active',
    sort_order: 0,
    ...overrides,
  }
}

test('Vorschlagsliste wird alphabetisch nach Namen sortiert, unabhaengig von sort_order', () => {
  const catalog = [
    makeEntry({ id: '1', name: 'Zeta', sort_order: 1 }),
    makeEntry({ id: '2', name: 'Alpha', sort_order: 99 }),
    makeEntry({ id: '3', name: 'Mitte', sort_order: 50 }),
  ]
  const result = runAlphabeticalCatalogMemo(catalog)
  assert.deepEqual(result.map((s) => s.name), ['Alpha', 'Mitte', 'Zeta'])
})

test('deutsche Locale: Umlaute werden wie im Deutschen ueblich einsortiert, nicht nach Unicode-Codepoint', () => {
  const catalog = [
    makeEntry({ id: '1', name: 'Zeta', sort_order: 1 }),
    makeEntry({ id: '2', name: 'Äpfelmus', sort_order: 2 }),
    makeEntry({ id: '3', name: 'Banane', sort_order: 3 }),
  ]
  const result = runAlphabeticalCatalogMemo(catalog)
  // Reiner Codepoint-Vergleich (ohne Locale) wuerde 'Äpfelmus' (U+00C4)
  // hinter 'Zeta' (U+005A) einsortieren -- 'de'-Locale ordnet Ä nahe A ein.
  assert.deepEqual(result.map((s) => s.name), ['Äpfelmus', 'Banane', 'Zeta'])
})

test('Tie-Breaker bei identischem Namen: zuerst slug, danach id, deterministisch', () => {
  const catalog = [
    makeEntry({ id: 'id-z', name: 'Volksmusik', slug: 'volksmusik-b' }),
    makeEntry({ id: 'id-a', name: 'Volksmusik', slug: 'volksmusik-a' }),
  ]
  const result = runAlphabeticalCatalogMemo(catalog)
  assert.deepEqual(result.map((s) => s.slug), ['volksmusik-a', 'volksmusik-b'])

  const sameSlug = [
    makeEntry({ id: 'id-2', name: 'Volksmusik', slug: 'volksmusik' }),
    makeEntry({ id: 'id-1', name: 'Volksmusik', slug: 'volksmusik' }),
  ]
  const sameSlugResult = runAlphabeticalCatalogMemo(sameSlug)
  assert.deepEqual(sameSlugResult.map((s) => s.id), ['id-1', 'id-2'])
})

test('das uebergebene catalog-Array wird nicht mutiert', () => {
  const catalog = [
    makeEntry({ id: '1', name: 'Zeta', sort_order: 1 }),
    makeEntry({ id: '2', name: 'Alpha', sort_order: 99 }),
  ]
  const originalOrder = catalog.map((s) => s.id)
  const result = runAlphabeticalCatalogMemo(catalog)
  assert.deepEqual(catalog.map((s) => s.id), originalOrder, 'urspruengliches catalog-Array darf seine Reihenfolge nicht veraendern')
  assert.notEqual(result, catalog, 'Rueckgabe muss eine neue Array-Kopie sein, nicht dieselbe Referenz')
})
