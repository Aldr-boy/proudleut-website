import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Profil-Demo auf /fuer-bands
// (Auftrag "Profil-Demo an neues Bandprofil angleichen"): die Demo laedt
// das echte San2-Profil ueber denselben Weg wie /band/[slug], statt eigene
// Profildaten zu pflegen. Kein jsdom im Repo -- gleiches Textmuster wie die
// uebrigen strukturellen Bandprofil-Tests.
const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'page.tsx'),
  'utf8',
)

test('laedt San2 ueber denselben Datenpfad wie die echte Bandseite (getBandFromSupabase + normalizeBandFromSupabase)', () => {
  assert.match(source, /import \{ getBandFromSupabase \} from '@\/lib\/supabase\/queries'/)
  assert.match(source, /import \{ normalizeBandFromSupabase \} from '@\/lib\/supabase\/normalizeBand'/)
  assert.match(source, /getBandFromSupabase\(DEMO_BAND_SLUG\)/)
  assert.match(source, /const DEMO_BAND_SLUG = 'san2-and-his-soul-patrol';/)
})

test('keine hart codierten Profilwerte mehr (SAN2_KLINGT_NACH/SAN2_STIL_EINFLUESSE/SAN2_META/"Blues"-Badge)', () => {
  assert.doesNotMatch(source, /SAN2_KLINGT_NACH/)
  assert.doesNotMatch(source, /SAN2_STIL_EINFLUESSE/)
  assert.doesNotMatch(source, /SAN2_META/)
  assert.doesNotMatch(source, />\s*Blues\s*</)
})

test('Demo-Section entfaellt sauber, wenn die Band nicht gefunden/aktiv ist -- kein ungeschuetzter Zugriff auf demoBand', () => {
  assert.match(source, /\{demoBand && \(/)
  // getBandFromSupabase filtert bereits auf status='active' -- demoBand
  // ist dann null, kein zusaetzlicher eigener Status-Check noetig.
  assert.match(source, /const demoBand = demoBandData \? normalizeBandFromSupabase\(demoBandData\) : null;/)
})

test('kein JSON-LD fuer San2 auf /fuer-bands', () => {
  assert.doesNotMatch(source, /generateBandJsonLd/)
  assert.doesNotMatch(source, /application\/ld\+json/)
})

test('keine Anfrage-/Merklisten-Buttons oder -Logik in der Demo', () => {
  assert.doesNotMatch(source, /<AnfrageButton|<MerkButton|<HeroCTA/)
  assert.doesNotMatch(source, /Band über proudleut anfragen/)
  assert.doesNotMatch(source, /Band merken/)
})

test('kein zusaetzliches <h1> durch die Demo -- weiterhin nur die eine Seiten-H1, keine BandChapterHeading-Nummerierung in der Demo-Karte', () => {
  const h1Matches = source.match(/<h1\b/g) ?? []
  assert.equal(h1Matches.length, 1, 'die Profil-Demo darf keine zusaetzliche <h1> einfuehren')
  assert.doesNotMatch(source, /BandChapterHeading/)
})

test('nutzt BandVideoSection im compact-Modus, BandEventTypesPills im dark-Modus und BandDocumentsSection im compact-Modus (echte Bandseiten-Komponenten statt Kopien)', () => {
  assert.match(source, /import \{ BandVideoSection \} from '@\/components\/band\/BandVideoSection'/)
  assert.match(source, /<BandVideoSection\s+band=\{demoBand\}\s+embedUrl=\{demoEmbedUrl\}\s+variant="compact"/)
  assert.match(source, /import \{ BandEventTypesPills \} from '@\/components\/band\/BandEventTypesPills'/)
  assert.match(source, /variant="dark"/)
  assert.match(source, /import \{ BandDocumentsSection \} from '@\/components\/band\/BandDocumentsSection'/)
  assert.match(source, /<BandDocumentsSection band=\{demoBand\} variant="compact" \/>/)
})

test('Zitatsatz kommt aus shortDescriptionExplicit, nie aus dem main_text-gekuerzten shortDescription', () => {
  assert.match(source, /demoBand\.shortDescriptionExplicit/)
  assert.doesNotMatch(source, /demoBand\.shortDescription\b(?!Explicit)/)
})

test('Link am Ende der Demo fuehrt auf das echte Profil', () => {
  assert.match(source, /href=\{`\/band\/\$\{demoBand\.slug\}`\}/)
  assert.match(source, /Ganzes Profil von \{demoBand\.name\} ansehen/)
})

test('Fussnote "Beispielprofil" bleibt erhalten', () => {
  assert.match(source, /Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut\./)
})

// ── Block "Demo-Karte in die Breite ziehen" ──────────────────────────

test('Demo-Karte nutzt die volle Container-Breite -- keine rechte Aside-Spalte mehr', () => {
  assert.doesNotMatch(source, /lg:grid-cols-\[1fr_380px\]/)
})

test('Bildbanner ist ab md deutlich flacher (aspect-\\[4\\/1\\] statt aspect-\\[8\\/3\\]), Mobile unveraendert bei aspect-\\[4\\/3\\]', () => {
  assert.match(source, /aspect-\[4\/3\] md:aspect-\[4\/1\]/)
  assert.doesNotMatch(source, /aspect-\[8\/3\]/)
})

// ── Block "Profil-Demo niedriger machen" ─────────────────────────────

test('"Spielt bei" haengt als extraColumnContent in der rechten Spalte von BandVideoSection, nicht mehr als eigene Ebene neben der PDF-Karte', () => {
  assert.match(source, /extraColumnContent=\{/)
  const idx = source.indexOf('extraColumnContent={')
  const block = source.slice(idx, source.indexOf('/>', idx))
  assert.match(block, /Spielt bei/)
  assert.match(block, /<BandEventTypesPills/)
  assert.match(block, /variant="dark"/)
  // Keine Seite-an-Seite-Logik zwischen "Spielt bei" und der PDF-Karte mehr.
  assert.doesNotMatch(source, /demoEventsAndDocsBothPresent/)
  assert.doesNotMatch(source, /lg:grid-cols-2 lg:items-start/)
})

test('Presse-\\/Booking-PDF ist eine eigene, dritte Ebene (variant="compact"), volle Kartenbreite, kein Nebeneinander mit "Spielt bei"', () => {
  const idx = source.indexOf('<BandDocumentsSection band={demoBand} variant="compact" />')
  assert.ok(idx >= 0)
})

test('"Aus Musiker-Sicht" ist NICHT Teil der dunklen Profilkarte (bg-pl-stage-Block), sondern steht darunter', () => {
  const demoCardStart = source.indexOf("{demoBand && (")
  const cardDivEnd = source.indexOf('Ganzes Profil von {demoBand.name} ansehen')
  assert.ok(demoCardStart >= 0 && cardDivEnd > demoCardStart)
  const demoCardSource = source.slice(demoCardStart, cardDivEnd)
  assert.doesNotMatch(demoCardSource, /Aus Musiker-Sicht/)
})

test('"Aus Musiker-Sicht" steht unter der Demo-Karte, NACH dem "Ganzes Profil ansehen"-Link und VOR der Fussnote -- NICHT mehr in Section 04', () => {
  const linkIdx = source.indexOf('Ganzes Profil von {demoBand.name} ansehen')
  const musikerIdx = source.indexOf('Aus Musiker-Sicht')
  const footnoteIdx = source.indexOf('Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.')
  assert.ok(linkIdx >= 0 && musikerIdx >= 0 && footnoteIdx >= 0)
  assert.ok(linkIdx < musikerIdx, '"Aus Musiker-Sicht" muss nach dem Profil-Link stehen')
  assert.ok(musikerIdx < footnoteIdx, '"Aus Musiker-Sicht" muss vor der Fussnote stehen')

  const section04Idx = source.indexOf('Ich baue und pflege proudleut persönlich')
  assert.ok(section04Idx >= 0 && section04Idx > musikerIdx, 'Section 04 folgt im Quelltext erst NACH "Aus Musiker-Sicht" -- der Block darf dort nicht mehr vorkommen')
  const section04Source = source.slice(section04Idx, source.indexOf('Kurz gesagt', section04Idx))
  assert.doesNotMatch(section04Source, /Aus Musiker-Sicht/, '"Aus Musiker-Sicht" darf nicht mehr in Section 04 stehen')
})

test('Dominik Palmer als reiner Text (nicht verlinkt), nur "Musikerprofil ansehen" bleibt Link, Zitat max-w-[60ch]-Block', () => {
  // indexOf statt lastIndexOf: der erste Treffer liegt im JSX-Kommentar
  // direkt vor dem eigentlichen Block, der zweite ist die echte <p>-Zeile.
  const commentIdx = source.indexOf('Aus Musiker-Sicht')
  const idx = source.indexOf('Aus Musiker-Sicht', commentIdx + 1)
  assert.ok(idx >= 0 && idx > commentIdx)

  const block = source.slice(idx, source.indexOf('Musikerprofil ansehen', idx) + 40)
  assert.match(block, />Dominik Palmer<\/p>/, 'Name muss reiner Text sein, kein <Link>')
  assert.doesNotMatch(block.slice(0, block.indexOf('Dominik Palmer')), /<Link/, 'kein Link vor/um den Namen')

  const wrapperIdx = source.lastIndexOf('<div', idx)
  assert.match(source.slice(wrapperIdx, idx), /max-w-\[60ch\]/)
})

test('Zitat ist etwas groesser als zuvor (text-xl md:text-2xl) und schliesst mit typografisch korrektem Anfuehrungszeichen (U+201C), nicht mit "', () => {
  const quoteIdx = source.indexOf('Mit Alex zu arbeiten')
  assert.ok(quoteIdx >= 0)
  const quoteBlock = source.slice(quoteIdx - 100, quoteIdx + 200)
  assert.match(quoteBlock, /text-xl md:text-2xl italic/)
  assert.match(quoteBlock, /bleibt menschlich\.“/)
  assert.doesNotMatch(quoteBlock, /bleibt menschlich\."/)
})

test('Anfuehrungszeichen bei "Veroeffentlichen" in Section 04 ist typografisch korrekt (U+201E…U+201C statt gerader ")', () => {
  const idx = source.indexOf('Veröffentlichen')
  assert.ok(idx >= 0)
  assert.match(source.slice(idx - 5, idx + 20), /„Veröffentlichen“/)
})
