import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/musiker/page.tsx (Auftrag
// "Musikerübersicht /musiker nachschärfen"). Ein echter Rendertest ist
// ohne Next.js-Request-Kontext/Supabase-Verbindung nicht sinnvoll isoliert
// moeglich -- identisches Prinzip wie app/musiker/musikerPageDisplay.test.ts
// fuer die einzelne Profilseite. Die reine Rollen-/Referenzzeilenlogik wird
// zusaetzlich echt ausgefuehrt getestet, siehe lib/people/
// personHeroRole.test.ts und lib/bands/bandPersonCreditsLine.test.ts. Die
// H1 selbst wird nicht mehr inline in dieser Datei gerendert, sondern via
// components/bands/BandFinderPageHead.tsx (unveraendert wiederverwendet,
// siehe eigener Test unten) -- dass am Ende genau ein <h1> im DOM entsteht,
// ist zusaetzlich live verifiziert (siehe Abschlussbericht).
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

test('Bandnamen verlinken auf /band/[slug] aus den bestehenden Membership-Daten, kein truncate/line-clamp (der begleitende Kommentar darf das zu Dokumentationszwecken nennen)', () => {
  assert.match(source, /href=\{`\/band\/\$\{m\.bandSlug\}`\}/)
  assert.ok(!/className=\{?[^}]*\b(truncate|line-clamp-\d)\b/.test(source), 'Bandnamen (und Kartentexte) duerfen nicht gekuerzt/abgeschnitten werden')
})

test('Foto und Name verlinken auf /musiker/[slug]; "Musikerprofil ansehen" ist ein separater Link mit aria-hidden-Pfeil', () => {
  const profileLinkCount = (source.match(/href=\{profileHref\}/g) ?? []).length
  assert.equal(profileLinkCount, 3, 'Foto, Name und "Musikerprofil ansehen" muessen je einen eigenen Link auf profileHref haben')
  assert.match(source, /Musikerprofil ansehen/)
  assert.match(source, /<span aria-hidden="true">→<\/span>/)
})

test('kein Klickbereich ueber die gesamte Karte -- die Kartenhuelle ist kein <Link>', () => {
  assert.match(
    source,
    /<div className="w-full sm:w-\[calc\(\(100%-1\.5rem\)\/2\)\] lg:w-\[calc\(\(100%-3rem\)\/3\)\] flex flex-col rounded-xl overflow-hidden bg-pl-elevated border border-pl-soft shadow-pl-photo">/,
  )
})

test('sichtbarer Fokusring auf allen Links', () => {
  assert.match(source, /FOCUS_RING/)
  assert.match(source, /focus-visible:outline-2/)
})

test('einheitlicher Querformat-Bildausschnitt (aspect-[3/2], wie BandCard) mit object-position "center 30%" fuer alle Personen', () => {
  assert.match(source, /aspect-\[3\/2\]/)
  assert.ok(!source.includes('aspect-[4/5]'), 'der vorherige Hochformat-Ausschnitt darf nicht mehr vorkommen')
  assert.match(source, /objectPosition:\s*['"]center 30%['"]/)
})

test('lib/people/heroImagePresentation.ts wird NICHT importiert oder erweitert (der begleitende Kommentar darf den Dateinamen zu Dokumentationszwecken nennen)', () => {
  assert.ok(!/^import .*heroImagePresentation/m.test(source), 'die Hero-Konfiguration der Profilseite darf hier weder importiert noch erweitert werden')
})

test('Personen ohne Bild erhalten dieselbe neutrale Flaeche (bg-pl-elevated), keine Platzhaltergrafik/kein Icon', () => {
  assert.match(source, /bg-pl-elevated \$\{FOCUS_RING\}/)
  assert.ok(!/lucide|heroicons|FontAwesome|<svg/i.test(source), 'keine Icon-Bibliothek/kein SVG-Platzhalter im Bildbereich')
})

test('Kartenmasse/-typografie an BandCard angeglichen: p-4-Textbereich, Name als text-lg-Ueberschrift, Pills in bg-pl-accent-subtle/text-pl-accent-deep', () => {
  assert.match(source, /<div className="p-4 flex flex-col flex-1">/)
  assert.match(source, /<h3 className="text-pl-text font-semibold text-lg leading-snug mb-1">/)
  assert.match(source, /bg-pl-accent-subtle px-2 py-0\.5 text-xs font-medium text-pl-accent-deep/)
})

test('Bild-sizes-Attribut entspricht dem 3/2/1-Spalten-Raster (identisch zu BandCard.tsx)', () => {
  assert.match(source, /sizes="\(min-width: 1024px\) 33vw, \(min-width: 640px\) 50vw, 100vw"/)
})

test('Seitenkopf nutzt die bestehende, unveraenderte BandFinderPageHead-Komponente statt eines eigenen Nachbaus', () => {
  assert.match(source, /import \{ BandFinderPageHead \} from ['"]@\/components\/bands\/BandFinderPageHead['"]/)
  assert.match(source, /<BandFinderPageHead\s*\r?\n\s*h1="Musiker hinter den Bands"/)
  assert.ok(!source.includes('bg-pl-stage'), 'die vormalige dunkle, zentrierte Buehnenflaeche darf nicht mehr vorkommen')
})

test('Einleitungstext wird woertlich als intro-Prop uebergeben', () => {
  assert.match(
    source,
    /intro="Wer steht bei den Bands eigentlich auf der Bühne\? Hier lernst du Musiker kennen, die bei proudleut-Bands spielen, und siehst, was sie musikalisch mitbringen\."/,
  )
})

test('metadata.title ist exakt "Musiker hinter den Bands" (globale Title-Vorlage bleibt unangetastet, kein eigener Suffix)', () => {
  assert.match(source, /title:\s*'Musiker hinter den Bands'/)
})

test('Meta-Description wird woertlich verwendet, Canonical ueber absoluteUrl (unveraendert)', () => {
  assert.match(source, /import \{ absoluteUrl \} from ['"]@\/lib\/seo\/metadata['"]/)
  assert.match(
    source,
    /description:\s*\r?\n\s*'Lerne Musiker kennen, die bei proudleut-Bands spielen, und entdecke, in welchen Bands du sie live erleben kannst\.'/,
  )
  assert.match(source, /alternates:\s*\{\s*canonical:\s*absoluteUrl\('\/musiker'\)\s*\}/)
})

test('Raster: Kartenbreite je Karte folgt derselben 1/2/3-Spalten-calc()-Formel, Gruppe zentriert bei weniger Karten als Spalten', () => {
  // sm:-Breite (2 Spalten, gap-6=1.5rem, 1 Zwischenraum) und lg:-Breite
  // (3 Spalten, 2 Zwischenraeume) -- dieselbe Formel, die ein CSS-Grid mit
  // grid-cols-2/3 und gap-6 ohnehin erzeugen wuerde. Der Aussen-Container
  // zentriert die Gruppe per justify-center; die einzelne Kartenbreite
  // bleibt dabei unveraendert (keine Verbreiterung bei weniger Karten).
  assert.match(source, /sm:w-\[calc\(\(100%-1\.5rem\)\/2\)\]/)
  assert.match(source, /lg:w-\[calc\(\(100%-3rem\)\/3\)\]/)
  assert.match(source, /<div className="flex flex-wrap justify-center gap-6">/)
})

test('kein zusaetzliches Schema (ItemList/CollectionPage) ergaenzt', () => {
  assert.ok(!source.includes('ItemList'))
  assert.ok(!source.includes('CollectionPage'))
  assert.ok(!source.includes('application/ld+json'))
})

test('keine Filter-/Such-UI (keine Portal-/Datenbankoptik)', () => {
  assert.ok(!/useState|<input|<select/i.test(source))
})
