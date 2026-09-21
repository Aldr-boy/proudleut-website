import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/musiker/page.tsx (Auftrag
// "Musikerübersicht unter /musiker anlegen"). Ein echter Rendertest ist
// ohne Next.js-Request-Kontext/Supabase-Verbindung nicht sinnvoll isoliert
// moeglich -- identisches Prinzip wie app/musiker/musikerPageDisplay.test.ts
// fuer die einzelne Profilseite. Die reine Rollen-/Referenzzeilenlogik wird
// zusaetzlich echt ausgefuehrt getestet, siehe lib/people/
// personHeroRole.test.ts und lib/bands/bandPersonCreditsLine.test.ts.
const pagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx')
const source = readFileSync(pagePath, 'utf8')

test('nutzt die bestehende, RLS-gefilterte Personenquelle (keine neue/abweichende Sichtbarkeitslogik)', () => {
  assert.match(source, /import \{ getAllPublicPeopleFromSupabase \} from ['"]@\/lib\/people\/publicQueries['"]/)
  assert.match(source, /import \{ normalizePersonFromSupabase[^}]*\} from ['"]@\/lib\/people\/normalizePerson['"]/)
  assert.ok(!source.includes('createAdminClient'), 'darf keinen service_role-Client verwenden')
})

test('ruft notFound() auf, wenn kein oeffentliches Profil vorhanden ist (error, fehlende oder leere Daten)', () => {
  assert.match(source, /if\s*\(error \|\| !data \|\| data\.length === 0\)\s*notFound\(\)/)
})

test('Sortierung: vollstaendiger gespeicherter Name, deutsche Locale, keine Nachnamen-Zerlegung', () => {
  assert.match(source, /\.sort\(\(a, b\) => a\.name\.localeCompare\(b\.name, ['"]de['"]\)\)/)
  assert.ok(!source.includes('.split('), 'keine Namens-Zerlegung fuer die Sortierung')
})

test('Rolle stammt aus derivePersonHeroRole (identischer Rollenwert wie im Profil-Hero, keine eigene Logik)', () => {
  assert.match(source, /import \{ derivePersonHeroRole \} from ['"]@\/lib\/people\/personHeroRole['"]/)
  assert.match(source, /derivePersonHeroRole\(person\)/)
})

test('Referenzzeile ausschliesslich ueber formatBandPersonCreditsLine, nur gerendert wenn vorhanden', () => {
  assert.match(source, /import \{ formatBandPersonCreditsLine \} from ['"]@\/lib\/bands\/bandPersonCreditsLine['"]/)
  assert.match(source, /formatBandPersonCreditsLine\(person\.credits\)/)
  assert.match(source, /\{creditsLine && /)
})

test('Bandnamen verlinken auf /band/[slug] aus den bestehenden Membership-Daten', () => {
  assert.match(source, /href=\{`\/band\/\$\{m\.bandSlug\}`\}/)
})

test('Foto und Name verlinken auf /musiker/[slug]; "Musikerprofil ansehen" ist ein separater Link mit aria-hidden-Pfeil', () => {
  const profileLinkCount = (source.match(/href=\{profileHref\}/g) ?? []).length
  assert.equal(profileLinkCount, 3, 'Foto, Name und "Musikerprofil ansehen" muessen je einen eigenen Link auf profileHref haben')
  assert.match(source, /Musikerprofil ansehen/)
  assert.match(source, /<span aria-hidden="true">→<\/span>/)
})

test('kein Klickbereich ueber die gesamte Karte -- die Kartenhuelle ist kein <Link>', () => {
  assert.match(source, /<div className="w-full sm:w-\[420px\] flex flex-col rounded-2xl border border-pl-soft bg-white overflow-hidden">/)
})

test('sichtbarer Fokusring auf allen Links', () => {
  assert.match(source, /FOCUS_RING/)
  assert.match(source, /focus-visible:outline-2/)
})

test('einheitlicher Hochformat-Bildausschnitt mit object-position "center 30%" fuer alle Personen', () => {
  assert.match(source, /aspect-\[4\/5\]/)
  assert.match(source, /objectPosition:\s*['"]center 30%['"]/)
})

test('lib/people/heroImagePresentation.ts wird NICHT importiert oder erweitert (der begleitende Kommentar darf den Dateinamen zu Dokumentationszwecken nennen)', () => {
  assert.ok(!/^import .*heroImagePresentation/m.test(source), 'die Hero-Konfiguration der Profilseite darf hier weder importiert noch erweitert werden')
})

test('Personen ohne Bild erhalten dieselbe neutrale Flaeche (bg-pl-elevated), keine Platzhaltergrafik/kein Icon', () => {
  assert.match(source, /bg-pl-elevated \$\{FOCUS_RING\}/)
  assert.ok(!/lucide|heroicons|FontAwesome|<svg/i.test(source), 'keine Icon-Bibliothek/kein SVG-Platzhalter im Bildbereich')
})

test('genau ein H1 mit dem vorgegebenen Wortlaut', () => {
  const h1Matches = source.match(/<h1[^>]*>/g) ?? []
  assert.equal(h1Matches.length, 1)
  assert.match(source, /Die Menschen hinter den Bands/)
})

test('Einleitungstext wird woertlich verwendet', () => {
  assert.match(
    source,
    /Manche Musiker spielen in mehreren Bands und bringen Erfahrung aus ganz\s+unterschiedlichen Projekten mit\. Hier lernst du einige von ihnen kennen und siehst,\s+bei welchen proudleut-Bands sie auf der Bühne stehen\./,
  )
})

test('Meta-Description wird woertlich verwendet, Canonical ueber absoluteUrl', () => {
  assert.match(source, /import \{ absoluteUrl \} from ['"]@\/lib\/seo\/metadata['"]/)
  assert.match(
    source,
    /description:\s*\r?\n\s*'Lerne Musiker kennen, die in proudleut-Bands spielen\. Entdecke ihre Profile und die Bands, in denen du sie live erleben kannst\.'/,
  )
  assert.match(source, /alternates:\s*\{\s*canonical:\s*absoluteUrl\('\/musiker'\)\s*\}/)
})

test('kein zusaetzliches Schema (ItemList/CollectionPage) ergaenzt', () => {
  assert.ok(!source.includes('ItemList'))
  assert.ok(!source.includes('CollectionPage'))
  assert.ok(!source.includes('application/ld+json'))
})

test('keine Filter-/Such-UI (keine Portal-/Datenbankoptik)', () => {
  assert.ok(!/useState|<input|<select/i.test(source))
})
