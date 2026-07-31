import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den Production-Smoke-Nachtrag
// "Beschreibung optional + alphabetische Sortierung" in
// app/admin/repertoire-styles/page.tsx. Diese Server Component kann
// nicht per node --test ausgefuehrt werden (createAdminClient() /
// next/headers-Abhaengigkeiten) -- identisches, bereits etabliertes
// Muster wie lib/admin/repertoireStylesActionsAuthGuardOrder.test.ts:
// echte Quelldatei per readFileSync lesen und strukturell pruefen.
const pagePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'repertoire-styles', 'page.tsx'
)
const source = readFileSync(pagePath, 'utf8')

test('keine required-Markierung mehr auf einem description-Textarea (Anlegen- oder Bearbeiten-Formular)', () => {
  const textareaBlocks = source.match(/<textarea[\s\S]*?\/>/g) ?? []
  const descriptionTextareas = textareaBlocks.filter((block) => block.includes('name="description"'))
  assert.equal(descriptionTextareas.length, 2, 'erwartet genau zwei description-Textareas (Anlegen + Bearbeiten)')
  for (const block of descriptionTextareas) {
    assert.ok(!block.includes('required'), `description-Textarea darf nicht mehr required sein:\n${block}`)
  }
})

test('Beschreibung-Label ist in beiden Formularen explizit als optional markiert', () => {
  const occurrences = source.match(/Beschreibung \(optional\)/g) ?? []
  assert.equal(occurrences.length, 2, 'erwartet "Beschreibung (optional)" genau zweimal (Anlegen- und Bearbeiten-Label)')
  assert.ok(!source.includes('>\n                    Beschreibung\n                  </label>'), 'altes, nicht als optional markiertes Label darf nicht mehr vorkommen')
})

test('Warn-Badge "keine Beschreibung" und Pflichttext "Bitte ergaenzen" sind entfernt', () => {
  assert.ok(!source.includes('keine Beschreibung'), 'Warn-Badge-Text darf nicht mehr vorkommen')
  assert.ok(!source.includes('Bitte ergänzen'), 'orange Pflichttext darf nicht mehr vorkommen')
  assert.ok(!source.includes('hasMissingDescription'), 'hasMissingDescription darf im Katalog nicht mehr referenziert werden -- Warnung wurde ersatzlos entfernt')
  assert.ok(!source.includes("from '@/lib/repertoireStyles/description'"), 'Import der entfernten Warn-Hilfsfunktion darf nicht mehr vorhanden sein')
})

test('kein Ersatz-Pflichthinweis fuer Beschreibung eingefuehrt', () => {
  assert.ok(!source.includes('repertoire_styles_description_required'), 'RC002-Fehlermeldung darf im Katalog nicht mehr gemappt werden')
})

function extractSortComparatorBody(): string {
  const marker = 'const sortedStyles = [...(stylesRaw ?? [])].sort((a, b) => {'
  const startIndex = source.indexOf(marker)
  assert.ok(startIndex >= 0, 'sortedStyles-Comparator nicht gefunden')
  const bodyStart = startIndex + marker.length
  const endIndex = source.indexOf('\n  })', bodyStart)
  assert.ok(endIndex >= 0, 'Ende des sortedStyles-Comparators nicht gefunden')
  return source.slice(bodyStart, endIndex)
}

test('sort_order fliesst nicht mehr in die Kartenreihenfolge ein', () => {
  const body = extractSortComparatorBody()
  assert.ok(!body.includes('sort_order'), `Comparator darf sort_order nicht mehr fuer die Reihenfolge verwenden:\n${body}`)
})

test('Comparator sortiert alphabetisch mit deutscher Locale und Slug-Tie-Breaker', () => {
  const body = extractSortComparatorBody()
  assert.match(body, /localeCompare\(b\.name, 'de'\)/)
  assert.match(body, /localeCompare\(b\.slug, 'de'\)/)
})

type StyleFixture = { id: string; name: string; slug: string; status: string; sort_order: number }

function runExtractedComparator(a: StyleFixture, b: StyleFixture): number {
  const body = extractSortComparatorBody()
  const comparator = new Function('a', 'b', body) as (a: StyleFixture, b: StyleFixture) => number
  return comparator(a, b)
}

test('active-Werte werden vor archivierten einsortiert, unabhaengig von sort_order', () => {
  const active: StyleFixture = { id: '1', name: 'Zeta', slug: 'zeta', status: 'active', sort_order: 99 }
  const archived: StyleFixture = { id: '2', name: 'Alpha', slug: 'alpha', status: 'archived', sort_order: 1 }
  assert.ok(runExtractedComparator(active, archived) < 0)
  assert.ok(runExtractedComparator(archived, active) > 0)
})

test('innerhalb desselben Status wird alphabetisch nach Name sortiert, sort_order wird ignoriert', () => {
  const a: StyleFixture = { id: '1', name: 'Alpenrock', slug: 'alpenrock', status: 'active', sort_order: 500 }
  const b: StyleFixture = { id: '2', name: 'Blasmusik', slug: 'blasmusik', status: 'active', sort_order: 1 }
  assert.ok(runExtractedComparator(a, b) < 0, 'Alpenrock muss trotz hoeherer sort_order vor Blasmusik stehen')
  assert.ok(runExtractedComparator(b, a) > 0)
})

test('archivierte Werte werden untereinander ebenfalls alphabetisch sortiert', () => {
  const a: StyleFixture = { id: '1', name: 'Alpenrock', slug: 'alpenrock', status: 'archived', sort_order: 500 }
  const b: StyleFixture = { id: '2', name: 'Blasmusik', slug: 'blasmusik', status: 'archived', sort_order: 1 }
  assert.ok(runExtractedComparator(a, b) < 0)
})

test('bei identischem Namen entscheidet der Slug als deterministischer Tie-Breaker', () => {
  const a: StyleFixture = { id: '1', name: 'Volksmusik', slug: 'volksmusik-a', status: 'active', sort_order: 1 }
  const b: StyleFixture = { id: '2', name: 'Volksmusik', slug: 'volksmusik-b', status: 'active', sort_order: 2 }
  assert.ok(runExtractedComparator(a, b) < 0)
  assert.ok(runExtractedComparator(b, a) > 0)
  assert.equal(runExtractedComparator(a, a), 0)
})
