import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/admin/event-types/page.tsx.
// Diese Server Component kann nicht per node --test ausgefuehrt werden
// (createAdminClient() / next/headers-Abhaengigkeiten) -- identisches,
// bereits etabliertes Muster wie
// lib/admin/repertoireStylesPageDisplay.test.ts: echte Quelldatei per
// readFileSync lesen und strukturell pruefen. Der Sortier-Comparator wird
// zusaetzlich real ausgefuehrt (new Function), identisches Muster wie im
// Repertoire-Style-Vorbild.
const pagePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'app', 'admin', 'event-types', 'page.tsx'
)
const source = readFileSync(pagePath, 'utf8')

test('event_types wird ohne Statusfilter geladen -- aktive UND archivierte Zeilen erscheinen im Katalog', () => {
  assert.match(source, /\.from\('event_types'\)/)
  const fromBlockMatch = source.match(/\.from\('event_types'\)[\s\S]*?\.returns<EventTypeRow\[\]>\(\)/)
  assert.ok(fromBlockMatch, 'event_types-Query nicht gefunden')
  assert.ok(!fromBlockMatch[0].includes(".eq('status'"), 'Katalog-Query darf keinen Statusfilter haben -- archivierte Zeilen muessen sichtbar bleiben')
})

test('Slug-Feld im Bearbeiten-Formular ist readOnly und disabled -- keine Slug-Aenderung ueber die UI moeglich', () => {
  const slugInputMatch = source.match(/<input[\s\S]*?id=\{`slug_\$\{type\.id\}`\}[\s\S]*?\/>/)
  assert.ok(slugInputMatch, 'Slug-Input im Bearbeiten-Formular nicht gefunden')
  assert.ok(slugInputMatch[0].includes('readOnly'), 'Slug-Input muss readOnly sein')
  assert.ok(slugInputMatch[0].includes('disabled'), 'Slug-Input muss disabled sein')
  assert.ok(!slugInputMatch[0].includes('name="slug"'), 'Slug-Input darf kein name="slug" haben -- darf nicht mit abgeschickt werden')
})

test('Bearbeiten-Formular sendet ausschliesslich name und anfrage_label als benannte Felder (neben der versteckten id)', () => {
  const formMatch = source.match(/<form action=\{updateEventTypeAction\}[\s\S]*?<\/form>/)
  assert.ok(formMatch, 'updateEventTypeAction-Formular nicht gefunden')
  const nameAttrs = [...formMatch[0].matchAll(/name="([a-z_]+)"/g)].map((m) => m[1])
  assert.deepEqual(new Set(nameAttrs), new Set(['event_type_id', 'name', 'anfrage_label']))
})

function extractSortComparatorBody(): string {
  const marker = 'const sortedTypes = [...allTypes].sort((a, b) => {'
  const startIndex = source.indexOf(marker)
  assert.ok(startIndex >= 0, 'sortedTypes-Comparator nicht gefunden')
  const bodyStart = startIndex + marker.length
  const endIndex = source.indexOf('\n  })', bodyStart)
  assert.ok(endIndex >= 0, 'Ende des sortedTypes-Comparators nicht gefunden')
  return source.slice(bodyStart, endIndex)
}

type TypeFixture = { id: string; name: string; slug: string; status: string }

function runExtractedComparator(a: TypeFixture, b: TypeFixture): number {
  const body = extractSortComparatorBody()
  const comparator = new Function('a', 'b', body) as (a: TypeFixture, b: TypeFixture) => number
  return comparator(a, b)
}

test('active-Werte werden vor archivierten einsortiert', () => {
  const active: TypeFixture = { id: '1', name: 'Zeta', slug: 'zeta', status: 'active' }
  const archived: TypeFixture = { id: '2', name: 'Alpha', slug: 'alpha', status: 'archived' }
  assert.ok(runExtractedComparator(active, archived) < 0)
  assert.ok(runExtractedComparator(archived, active) > 0)
})

test('innerhalb desselben Status wird alphabetisch nach Name (deutsche Locale) sortiert', () => {
  const a: TypeFixture = { id: '1', name: 'Almhütte', slug: 'almhuette', status: 'active' }
  const b: TypeFixture = { id: '2', name: 'Bierfest', slug: 'bierfest', status: 'active' }
  assert.ok(runExtractedComparator(a, b) < 0)
  assert.ok(runExtractedComparator(b, a) > 0)
})

test('bei identischem Namen entscheidet der Slug als deterministischer Tie-Breaker', () => {
  const a: TypeFixture = { id: '1', name: 'Privatfeier', slug: 'privatfeier-a', status: 'active' }
  const b: TypeFixture = { id: '2', name: 'Privatfeier', slug: 'privatfeier-b', status: 'active' }
  assert.ok(runExtractedComparator(a, b) < 0)
  assert.ok(runExtractedComparator(b, a) > 0)
  assert.equal(runExtractedComparator(a, a), 0)
})

// Korrektur "Archive-/Reactivate-Verhalten": Archivieren darf weder durch
// bestehende Bandzuordnungen noch durch aktive Unterkategorien blockiert
// werden (Auftrag: "Archivieren statt Loeschen. Bestehende Zuordnungen
// und Beziehungen bleiben bestehen."). Der Button war zuvor ueber
// disabled={archiveBlockedReasons.length > 0} clientseitig gesperrt --
// diese Sperre wurde ersatzlos entfernt.
test('Archivieren-Button ist NICHT mehr an Bandzuordnungen oder aktive Unterkategorien gekoppelt (kein disabled-Attribut mehr)', () => {
  const buttonBlockMatch = source.match(/<form action=\{archiveEventTypeAction\}>[\s\S]*?<\/form>/)
  assert.ok(buttonBlockMatch, 'Archivieren-Formular nicht gefunden')
  assert.ok(!buttonBlockMatch[0].includes('archiveBlockedReasons'), 'archiveBlockedReasons darf im Archivieren-Formular nicht mehr referenziert werden')
  assert.ok(!buttonBlockMatch[0].includes('disabled'), 'Archivieren-Button darf kein disabled-Attribut mehr haben')
})

test('archiveBlockedReasons existiert im gesamten Quelltext nicht mehr', () => {
  assert.ok(!source.includes('archiveBlockedReasons'), 'archiveBlockedReasons ist ein Ueberbleibsel der entfernten Archive-Blocker und darf nicht mehr vorkommen')
})
