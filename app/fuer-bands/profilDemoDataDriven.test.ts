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

test('nutzt BandVideoSection im compact-Modus und BandEventTypesPills im dark-Modus (echte Bandseiten-Komponenten statt Kopien)', () => {
  assert.match(source, /import \{ BandVideoSection \} from '@\/components\/band\/BandVideoSection'/)
  assert.match(source, /<BandVideoSection\s+band=\{demoBand\}\s+embedUrl=\{demoEmbedUrl\}\s+variant="compact"/)
  assert.match(source, /import \{ BandEventTypesPills \} from '@\/components\/band\/BandEventTypesPills'/)
  assert.match(source, /variant="dark"/)
})

test('keine Presse-\\/Booking-PDF in der Demo (Auftrag "Presse-Info aus der Profil-Demo entfernen") -- BandDocumentsSection weder importiert noch gerendert', () => {
  assert.doesNotMatch(source, /BandDocumentsSection/)
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

test('Demo-Karte (bg-pl-stage-Block) selbst nutzt die volle Container-Breite -- keine Aside-Spalte innerhalb der Karte', () => {
  const demoCardStart = source.indexOf("{demoBand && (")
  const cardDivEnd = source.indexOf('Ganzes Profil von {demoBand.name} ansehen')
  assert.ok(demoCardStart >= 0 && cardDivEnd > demoCardStart)
  const demoCardSource = source.slice(demoCardStart, cardDivEnd)
  assert.doesNotMatch(demoCardSource, /grid-cols-\[1fr_380px\]/, 'die Karte selbst darf nicht gesplittet werden')
})

test('Bildbanner ist ab md flacher (aspect-\\[5\\/1\\]), Mobile unveraendert bei aspect-\\[4\\/3\\]', () => {
  assert.match(source, /aspect-\[4\/3\] md:aspect-\[5\/1\]/)
  assert.doesNotMatch(source, /aspect-\[8\/3\]/)
  assert.doesNotMatch(source, /aspect-\[4\/1\]/)
})

// ── Block "Profil-Demo niedriger machen" / "Presse-Info entfernen" ───

test('"Spielt bei" haengt als extraColumnContent in der rechten Spalte von BandVideoSection', () => {
  assert.match(source, /extraColumnContent=\{/)
  const idx = source.indexOf('extraColumnContent={')
  const block = source.slice(idx, source.indexOf('/>', idx))
  assert.match(block, /Spielt bei/)
  assert.match(block, /<BandEventTypesPills/)
  assert.match(block, /variant="dark"/)
})

test('Karte endet nach Video/rechter Spalte -- nur zwei Ebenen (Zitat, Video-Block), keine dritte PDF-Ebene mehr', () => {
  assert.match(source, /const demoTiers = \[demoHasQuote, demoHasVideoBlock\];/)
  assert.doesNotMatch(source, /demoHasDocs/)
})

test('"Aus Musiker-Sicht" ist NICHT Teil der dunklen Profilkarte (bg-pl-stage-Block), sondern steht darunter', () => {
  const demoCardStart = source.indexOf("{demoBand && (")
  const cardDivEnd = source.indexOf('Ganzes Profil von {demoBand.name} ansehen')
  assert.ok(demoCardStart >= 0 && cardDivEnd > demoCardStart)
  const demoCardSource = source.slice(demoCardStart, cardDivEnd)
  assert.doesNotMatch(demoCardSource, /Aus Musiker-Sicht/)
})

test('Zeile direkt unter der Karte: ab md Link und Fussnote auf einer Grundlinie (flex + md:items-baseline + md:justify-between), unter md gestapelt', () => {
  const linkIdx = source.indexOf('Ganzes Profil von {demoBand.name} ansehen')
  assert.ok(linkIdx >= 0)
  const rowStart = source.lastIndexOf('<div', linkIdx)
  const rowTag = source.slice(rowStart, source.indexOf('>', rowStart) + 1)
  assert.match(rowTag, /flex flex-col md:flex-row/)
  assert.match(rowTag, /md:items-baseline/)
  assert.match(rowTag, /md:justify-between/)

  const footnoteIdx = source.indexOf('Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.')
  assert.ok(footnoteIdx > linkIdx, 'Fussnote steht im Quelltext nach dem Link (DOM-Reihenfolge: Link, dann Fussnote)')
})

test('"Aus Musiker-Sicht"-Box liegt quer unter Link/Fussnote, volle Kartenbreite, unveraenderte Box-Optik (bg-pl-canvas/border-l/rounded-2xl), Innenabstand reduziert', () => {
  const wrapperIdx = source.indexOf('bg-pl-canvas border-l border-pl-soft rounded-2xl')
  assert.ok(wrapperIdx >= 0, 'Box-Wrapper mit der urspruenglichen Optik fehlt')
  const wrapperTagStart = source.lastIndexOf('<div', wrapperIdx)
  const wrapperTag = source.slice(wrapperTagStart, source.indexOf('>', wrapperTagStart) + 1)
  // Kein max-width-Constraint und keine Spaltenbreiten-Klasse auf dem
  // Wrapper selbst -- die Box soll die volle Kartenbreite (pl-container-shell)
  // nutzen, nicht auf ~380px begrenzt sein.
  assert.doesNotMatch(wrapperTag, /380px|max-w-/)
  assert.match(wrapperTag, /py-5 md:py-6/, 'Innenabstand oben\\/unten muss reduziert sein (flacher als zuvor py-7\\/py-9)')

  const footnoteIdx = source.indexOf('Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.')
  assert.ok(footnoteIdx < wrapperIdx, 'Box steht im Quelltext nach der Link/Fussnote-Zeile')
})

test('Box ist ab lg intern zweispaltig (Label+Zitat links, Name/Rolle/Link rechts, vertikal zentriert), unter lg weiterhin alles untereinander', () => {
  const wrapperIdx = source.indexOf('bg-pl-canvas border-l border-pl-soft rounded-2xl')
  assert.ok(wrapperIdx >= 0)
  const boxSource = source.slice(wrapperIdx, source.indexOf('Musikerprofil ansehen', wrapperIdx) + 60)
  assert.match(boxSource, /lg:grid lg:grid-cols-2/)
  assert.match(boxSource, /lg:items-center/)
})

test('Dominik Palmer als reiner Text (nicht verlinkt), nur "Musikerprofil ansehen" bleibt Link', () => {
  const idx = source.lastIndexOf('Aus Musiker-Sicht')
  assert.ok(idx >= 0)
  const block = source.slice(idx, source.indexOf('Musikerprofil ansehen', idx) + 40)
  assert.match(block, />Dominik Palmer<\/p>/, 'Name muss reiner Text sein, kein <Link>')
  assert.doesNotMatch(block.slice(0, block.indexOf('Dominik Palmer')), /<Link/, 'kein Link vor/um den Namen')
})

test('Zitat bleibt in normaler Fliesstextgroesse (text-sm md:text-base italic), max-w-[70ch], schliesst mit typografisch korrektem Anfuehrungszeichen (U+201C), nicht mit "', () => {
  const quoteIdx = source.indexOf('Mit Alex zu arbeiten')
  assert.ok(quoteIdx >= 0)
  const quoteBlock = source.slice(quoteIdx - 120, quoteIdx + 200)
  assert.match(quoteBlock, /text-sm md:text-base italic leading-relaxed text-pl-text max-w-\[70ch\]/)
  assert.match(quoteBlock, /bleibt menschlich\.“/)
  assert.doesNotMatch(quoteBlock, /bleibt menschlich\."/)
})

test('"Aus Musiker-Sicht" steht NICHT mehr in Section 04', () => {
  const section04Idx = source.indexOf('Ich baue und pflege proudleut persönlich')
  assert.ok(section04Idx >= 0)
  const section04Source = source.slice(section04Idx, source.indexOf('Kurz gesagt', section04Idx))
  assert.doesNotMatch(section04Source, /Aus Musiker-Sicht/)
})

test('Anfuehrungszeichen bei "Veroeffentlichen" in Section 04 ist typografisch korrekt (U+201E…U+201C statt gerader ")', () => {
  const idx = source.indexOf('Veröffentlichen')
  assert.ok(idx >= 0)
  assert.match(source.slice(idx - 5, idx + 20), /„Veröffentlichen“/)
})
