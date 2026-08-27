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

// ── person_links (Paket 4C-B) ────────────────────────────────────────

test('rendert zusaetzliche Links (person.links) unabhaengig von der Hauptwebsite', () => {
  assert.match(source, /additionalLinks/)
  assert.match(source, /person\.links/)
  // websiteUrl wird weiterhin eigenstaendig aus person.websiteUrl berechnet,
  // nicht aus additionalLinks abgeleitet -- Website bleibt unabhaengig von
  // person_links bestehen, auch wenn keine zusaetzlichen Links vorhanden sind.
  assert.match(source, /const websiteUrl = safeUrl\(person\.websiteUrl\)/)
})

test('zusaetzliche Links werden ueber safeUrl() gefiltert, keine neue URL-Sicherheitsschicht', () => {
  assert.match(source, /href: safeUrl\(link\.url\)/)
})

// ── Musikerseite-Redesign V1: bestaetigte Hierarchie ─────────────────
// Hero -> Zusammengearbeitet mit -> Ueber [Vorname] -> Bei Proudleut ->
// Mehr von [Vorname]. Reine Reihenfolge-Pruefung ueber die Position der
// Abschnitts-Marker im Quelltext -- kein echter Render moeglich (siehe
// Kommentar oben).

test('bestaetigte Abschnittsreihenfolge: Hero -> Zusammengearbeitet mit -> Ueber -> Bei Proudleut -> Mehr von', () => {
  const heroIdx = source.indexOf('Musiker bei Proudleut')
  const creditsIdx = source.indexOf('Zusammengearbeitet mit')
  const bioIdx = source.indexOf('Über {firstName}')
  const proudleutIdx = source.indexOf('Bei Proudleut')
  const mehrVonIdx = source.indexOf('Mehr von {firstName}')
  assert.ok(heroIdx >= 0 && creditsIdx >= 0 && bioIdx >= 0 && proudleutIdx >= 0 && mehrVonIdx >= 0, 'alle fuenf Abschnitts-Marker muessen vorhanden sein')
  assert.ok(heroIdx < creditsIdx, 'Hero muss vor Zusammengearbeitet mit stehen')
  assert.ok(creditsIdx < bioIdx, 'Zusammengearbeitet mit muss vor Ueber stehen')
  assert.ok(bioIdx < proudleutIdx, 'Ueber muss vor Bei Proudleut stehen')
  assert.ok(proudleutIdx < mehrVonIdx, 'Bei Proudleut muss vor Mehr von stehen')
})

test('keine Einordnungszeile: kein eigenes Datenfeld/Textblock dafuer im Quelltext', () => {
  assert.ok(!source.toLowerCase().includes('einordnung'), 'Einordnungszeile wurde bewusst gestrichen und darf nicht neu gebaut werden')
})

test('keine neue Schriftfamilie/kein next/font-Import fuer den Namen (bestaetigte Abweichung vom Hi-Fi-Serifenfont)', () => {
  assert.ok(!source.includes("from 'next/font"), 'Personenseite darf keine eigene next/font-Schriftfamilie importieren')
  assert.ok(!/serif/i.test(source), 'Personenseite darf keine Serifenschrift referenzieren -- bestehende Sans-Typografie verwenden')
})

test('"Zusammengearbeitet mit" wird nur gerendert, wenn Referenzen vorhanden sind (kein erzwungener Abschnitt)', () => {
  assert.match(source, /\{person\.credits\.length > 0 &&/)
})

// ── Bandbild (media_assets) fuer die "Bei Proudleut"-Projektkarte ────

test('Bandbild wird nur bedingt gerendert (kein erzwungenes Bild, kein Platzhalter)', () => {
  assert.match(source, /\{m\.bandImage &&/)
})

test('"Bei Proudleut" bleibt als Section immer vorhanden (auch ohne sichtbare Membership) -- Empty State statt verstecktem Abschnitt', () => {
  const sectionIdx = source.indexOf('Bei Proudleut')
  const emptyStateIdx = source.indexOf('Aktuell keine öffentlich sichtbaren Bandzugehörigkeiten')
  assert.ok(sectionIdx >= 0 && emptyStateIdx >= 0)
  assert.ok(sectionIdx < emptyStateIdx, 'Empty State muss Teil derselben, immer gerenderten Bei-Proudleut-Section sein')
})
