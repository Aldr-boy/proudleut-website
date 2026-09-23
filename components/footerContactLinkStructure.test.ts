import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildOccasionNavUrl, type FinderFilterParams } from '../lib/bands/finderRouting.ts'

// Strukturelle Regressionspruefung fuer den Footer-Redesign (Auftrag
// "proudleut-Footer nach Design-Entwurf"). Ein echter Rendertest ist in
// diesem Projekt ohne React-Test-Harness nicht eingerichtet -- identisches
// Prinzip wie components/band/BandPeopleSection.test.ts. Die Routing-Logik
// selbst (buildOccasionNavUrl) wird zusaetzlich echt ausgefuehrt getestet
// statt nur im Footer-Quelltext nach Slugs zu suchen.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'Footer.tsx')
const source = readFileSync(sourcePath, 'utf8')

const NO_FINDER_FILTERS: FinderFilterParams = { region: null, suche: '', bandtyp: null, mood: null }

test('Logo nutzt die bestehende ProudleutLogo-SVG-Komponente statt der bisherigen PNG-Einbindung', () => {
  assert.match(source, /import \{ ProudleutLogo \} from ['"]\.\/ProudleutLogo['"]/)
  assert.match(source, /<ProudleutLogo className="[^"]*" \/>/)
  assert.ok(!source.includes('proudleut-logo-white.png'), 'die alte PNG-Einbindung darf nicht mehr vorkommen')
  assert.ok(!/from ['"]next\/image['"]/.test(source), 'next/image wird nicht mehr benoetigt')
})

test('Logo-Link zeigt auf / mit aria-label "Zur Startseite" (SVG bleibt ueber die Komponente selbst aria-hidden)', () => {
  assert.match(source, /<Link\s+href="\/"\s+aria-label="Zur Startseite"/)
})

test('kein eigener "Kontakt"-Link mehr -- /kontakt bleibt nur ueber den Header erreichbar', () => {
  assert.ok(!/href="\/kontakt"/.test(source), 'der bisherige Footer-Link auf /kontakt darf nicht mehr vorkommen')
})

test('Kontaktblock: "Schreib mir" und die sichtbare Adresse verlinken beide auf dieselbe mailto-Adresse wie CuratorBlock.tsx', () => {
  const mailtoMatches = source.match(/href=\{`mailto:\$\{CONTACT_EMAIL\}`\}/g) ?? []
  assert.equal(mailtoMatches.length, 2, 'genau zwei mailto-Links (Schreib mir + sichtbare Adresse)')
  assert.match(source, /const CONTACT_EMAIL = 'alexander\.dressler@proudleut\.com'/)
  assert.match(source, />\s*Schreib mir\s*</)
  assert.match(source, /\{CONTACT_EMAIL\}/)
})

test('Spaltenueberschriften "Entdecken", "proudleut", "Kontakt" -- ohne uppercase-Klasse, "proudleut" bleibt woertlich klein', () => {
  assert.match(source, /const COLUMN_HEADING_CLASS = '[^']*'/)
  const headingClass = source.match(/const COLUMN_HEADING_CLASS = '([^']*)'/)?.[1] ?? ''
  assert.ok(!headingClass.includes('uppercase'), 'Spaltenueberschriften duerfen keine uppercase-Klasse mehr haben')
  assert.match(source, /\{COLUMN_HEADING_CLASS\}>Entdecken</)
  assert.match(source, /\{COLUMN_HEADING_CLASS\}>proudleut</)
  assert.match(source, /\{COLUMN_HEADING_CLASS\}>Kontakt</)
  assert.ok(!source.includes('>Proudleut<'), 'die Marke "proudleut" darf nirgends grossgeschrieben vorkommen')
})

test('"Über proudleut"-Linklabel schreibt die Marke klein (vormals "Über Proudleut")', () => {
  assert.match(source, /label: 'Über proudleut'/)
  assert.ok(!source.includes("'Über Proudleut'"), 'die alte grossgeschriebene Variante darf nicht mehr vorkommen')
})

test('proudleut-Spalte: Für Bands und Musiker hinter den Bands verlinken unveraendert auf /fuer-bands bzw. /musiker', () => {
  assert.match(source, /href: '\/fuer-bands'/)
  assert.match(source, /href: '\/musiker'/)
  assert.match(source, /href: '\/ueber-mich'/)
})

test('Entdecken-Links werden ueber buildOccasionNavUrl() erzeugt, keine hartcodierten /veranstaltung- oder /bands?anlass-Strings', () => {
  assert.match(source, /import \{ buildOccasionNavUrl, type FinderFilterParams \} from ['"]@\/lib\/bands\/finderRouting['"]/)
  assert.match(source, /buildOccasionNavUrl\(o\.slug, NO_FINDER_FILTERS\)/)
  assert.ok(!/href="\/veranstaltung\//.test(source), 'keine hartcodierte /veranstaltung-Route im Footer')
  assert.ok(!/href="\/bands\?anlass=/.test(source), 'kein hartcodierter ?anlass=-Query-String als href-Literal im Footer')

  const expectedSlugOrder = [
    'hochzeit',
    'firmenfeier',
    'festzelt',
    'stadt-und-buergerfest',
    'konzert-club-festival',
  ]
  for (const slug of expectedSlugOrder) {
    assert.ok(source.includes(`slug: '${slug}'`), `Slug "${slug}" fehlt in DISCOVER_OCCASION_SLUGS`)
  }
  const slugPositions = expectedSlugOrder.map((slug) => source.indexOf(`slug: '${slug}'`))
  assert.deepEqual(slugPositions, [...slugPositions].sort((a, b) => a - b), 'Reihenfolge der Entdecken-Slugs muss dem Entwurf entsprechen')

  // Die eigentliche Routing-Logik real ausgefuehrt pruefen (nicht nur die
  // Slugs im Quelltext) -- identisches Muster wie lib/bands/finderRouting.ts
  // selbst nutzt.
  assert.equal(buildOccasionNavUrl('hochzeit', NO_FINDER_FILTERS), '/veranstaltung/hochzeit')
  assert.equal(buildOccasionNavUrl('firmenfeier', NO_FINDER_FILTERS), '/veranstaltung/firmenfeier')
  assert.equal(buildOccasionNavUrl('festzelt', NO_FINDER_FILTERS), '/veranstaltung/festzelt')
  assert.equal(buildOccasionNavUrl('stadt-und-buergerfest', NO_FINDER_FILTERS), '/bands?anlass=stadt-und-buergerfest')
  assert.equal(buildOccasionNavUrl('konzert-club-festival', NO_FINDER_FILTERS), '/bands?anlass=konzert-club-festival')
})

test('"Alle Bands" verlinkt direkt und hartcodiert auf /bands (kein Anlass, identisches Ziel wie der Header-CTA)', () => {
  assert.match(source, /\{ label: 'Alle Bands', href: '\/bands' \}/)
})

test('Rechtliches unveraendert: Impressum und Datenschutz verlinken weiterhin auf /impressum bzw. /datenschutz', () => {
  assert.match(source, /<Link\s+href="\/impressum"/)
  assert.match(source, /<Link\s+href="\/datenschutz"/)
})

test('Copyright-Zeile unveraendert', () => {
  assert.match(source, /© 2026 proudleut\.com/)
})

test('Feinschliff Lesbarkeit: Entdecken/proudleut-Links in vollem text-pl-on-stage statt text-pl-on-stage-muted', () => {
  assert.match(source, /const NAV_LINK_CLASS = `[^`]*`/)
  const navLinkClass = source.match(/const NAV_LINK_CLASS = `([^`]*)`/)?.[1] ?? ''
  assert.match(navLinkClass, /\btext-pl-on-stage\b/)
  assert.ok(!navLinkClass.includes('text-pl-on-stage-muted'), 'Spaltenlinks duerfen nicht mehr auf text-pl-on-stage-muted stehen')
})

test('Feinschliff Lesbarkeit: Markenzeile, sichtbare E-Mail-Adresse und Impressum/Datenschutz nutzen text-pl-on-stage/80 statt text-pl-on-stage-muted, Hover auf volles text-pl-on-stage', () => {
  assert.match(source, /const DIMMED_TEXT_CLASS = 'text-pl-on-stage\/(75|80)'/)
  const dimmedOpacity = source.match(/const DIMMED_TEXT_CLASS = 'text-pl-on-stage\/(75|80)'/)?.[1] ?? ''
  assert.ok(['75', '80'].includes(dimmedOpacity), 'Opacity-Modifier muss im freigegebenen Bereich /75-/80 liegen')

  assert.match(source, /className=\{`\$\{DIMMED_TEXT_CLASS\} text-sm`\}>Livebands für euer Event\./)
  const emailLinkBlock = source.match(/href=\{`mailto:\$\{CONTACT_EMAIL\}`\}\s*\r?\n\s*className=\{`w-fit[^`]*`\}/)?.[0] ?? ''
  assert.match(emailLinkBlock, /\$\{DIMMED_TEXT_CLASS\}/)
  assert.match(emailLinkBlock, /hover:text-pl-on-stage/)

  const impressumBlock = source.match(/href="\/impressum"\s*\r?\n\s*className=\{`[^`]*`\}/)?.[0] ?? ''
  assert.match(impressumBlock, /\$\{DIMMED_TEXT_CLASS\}/)
  assert.match(impressumBlock, /hover:text-pl-on-stage/)
  const datenschutzBlock = source.match(/href="\/datenschutz"\s*\r?\n\s*className=\{`[^`]*`\}/)?.[0] ?? ''
  assert.match(datenschutzBlock, /\$\{DIMMED_TEXT_CLASS\}/)
  assert.match(datenschutzBlock, /hover:text-pl-on-stage/)
})

test('Feinschliff Lesbarkeit: text-pl-on-stage-muted wird nur noch fuer die Copyright-Zeile als className verwendet', () => {
  // Nur echte className-Werte zaehlen, nicht Erwaehnungen in Kommentaren.
  const classNameValues = [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2])
  const mutedClassNames = classNameValues.filter((v) => v.includes('text-pl-on-stage-muted'))
  assert.equal(mutedClassNames.length, 1, 'text-pl-on-stage-muted darf nur noch in genau einem className-Wert vorkommen (Copyright)')
  assert.match(source, /className="text-pl-on-stage-muted">© 2026 proudleut\.com/)
})

test('Container nutzt die projektweite pl-container-shell statt einer eigenen max-w-6xl-Sonderloesung', () => {
  assert.match(source, /pl-container-shell/)
  assert.ok(!source.includes('max-w-6xl'), 'die bisherige Container-Sonderloesung darf nicht mehr vorkommen')
})

test('jede Linkgruppe hat ein eigenes <nav> mit aria-label (Entdecken, proudleut, Kontakt)', () => {
  assert.match(source, /<nav aria-label="Entdecken"/)
  assert.match(source, /<nav aria-label="proudleut"/)
  assert.match(source, /<nav aria-label="Kontakt"/)
})

test('sichtbarer Tastaturfokus auf allen Links (gemeinsamer FOCUS_RING mit pl-accent-light, keine neuen Fokus-Token)', () => {
  assert.match(source, /const FOCUS_RING =\s*\r?\n?\s*'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light rounded-sm'/)
})

test('keine neuen Hex-Farben, kein neues Datei-/Komponentenformat -- nur bestehende pl-*-Tokens', () => {
  assert.ok(!/#[0-9a-fA-F]{3,6}/.test(source), 'keine hartcodierten Hex-Farben im Footer')
  assert.match(source, /bg-pl-gradient-footer/)
  assert.match(source, /border-pl-stage/)
  assert.match(source, /text-pl-accent-light/)
  assert.match(source, /text-pl-on-stage/)
})
