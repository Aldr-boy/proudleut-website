import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/musiker/[slug]/page.tsx.
// Testdatei liegt bewusst NICHT unter app/musiker/[slug]/ selbst: `node
// --test` interpretiert "[slug]" im Dateipfad als Glob-Zeichenklasse
// (bestaetigtes Verhalten, siehe app/admin/moods/moodBandsEditorStructure.test.ts),
// der Quellpfad wird stattdessen relativ von hier aus referenziert. Ein
// echter Rendertest ist ohne Next.js-Request-Kontext/Supabase-Verbindung
// nicht sinnvoll isoliert moeglich -- die eigentliche Verhaltenspruefung
// (draft/archived -> 404, aktive Person sichtbar) laeuft ueber den echten
// TEST-Durchstich, siehe Abschlussbericht Paket 4B.
const pagePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[slug]', 'page.tsx',
)
const source = readFileSync(pagePath, 'utf8')

test('ruft notFound() bei error ODER fehlenden Daten auf (draft/archived -> 404, identisches Prinzip wie app/band/[slug]/page.tsx)', () => {
  assert.match(source, /if\s*\(error \|\| !data\)\s*notFound\(\)/)
})

test('nutzt ausschliesslich den RLS-gefilterten anon-Client (getPersonBySlugFromSupabase), keinen service_role-Client', () => {
  assert.match(source, /import \{ getPersonBySlugFromSupabase \} from ['"]@\/lib\/people\/publicQueries['"]/)
  assert.ok(!source.includes('createAdminClient'), 'oeffentliche Personenseite darf keinen service_role-Client verwenden')
})

test('Empty State: leere Memberships fuehren zu neutralem Text, kein erfundener Inhalt', () => {
  assert.match(source, /person\.memberships\.length === 0/)
  assert.match(source, /Aktuell keine öffentlich sichtbaren Bandzugehörigkeiten/)
})

test('Bio und Bild werden nur bedingt gerendert (kein Platzhalter-Portrait, keine erfundene Bio)', () => {
  assert.match(source, /\{person\.bio &&/)
  assert.match(source, /\{person\.imageUrl &&/)
})

test('keine Historien-/Timeline-UI: joined_at/left_at werden nicht gerendert', () => {
  assert.ok(!source.includes('joinedAt'), 'joined_at darf in V1 nicht angezeigt werden')
  assert.ok(!source.includes('leftAt'), 'left_at darf in V1 nicht angezeigt werden')
})

test('generateMetadata setzt einen sinnvollen Titel, kein noindex fuer eine gefundene Person', () => {
  assert.match(source, /title: person\.name/)
  assert.ok(!source.includes('noindex'), 'aktive Personen duerfen nicht per noindex ausgeschlossen werden')
})
