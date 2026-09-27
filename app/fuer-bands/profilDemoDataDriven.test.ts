import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Profil-Demo auf /fuer-bands
// (Entwurf "1b — Bild als Hintergrund"): die Demo laedt das echte
// San2-Profil ueber denselben Weg wie /band/[slug], statt eigene
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

test('BandVideoSection wird in der Demo NICHT mehr verwendet (Entwurf 1b zeigt kein eingebettetes Video, nur die Live-Video-Pill)', () => {
  assert.doesNotMatch(source, /BandVideoSection/)
})

test('keine Presse-\\/Booking-PDF in der Demo -- BandDocumentsSection weder importiert noch gerendert', () => {
  assert.doesNotMatch(source, /BandDocumentsSection/)
})

test('Kurzbeschreibung/Zitatzeile der Band wird in dieser Variante nicht angezeigt -- kein shortDescription(Explicit) in der Demo-Karte', () => {
  assert.doesNotMatch(source, /demoBand\.shortDescription/)
  assert.doesNotMatch(source, /shortDescriptionExplicit/)
})

test('Link am Ende der Demo fuehrt auf das echte Profil', () => {
  assert.match(source, /href=\{`\/band\/\$\{demoBand\.slug\}`\}/)
  assert.match(source, /Ganzes Profil von \{demoBand\.name\} ansehen/)
})

test('Fussnote "Beispielprofil" bleibt erhalten', () => {
  assert.match(source, /Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut\./)
})

// ── Block "1b — Bild als Hintergrund" ────────────────────────────────

test('Kartenwechsel erfolgt bei xl (nicht lg): Infospalte + rechtsbuendiges Bild passen im pl-container-shell (1140px) erst ab xl nebeneinander', () => {
  assert.match(source, /hidden xl:block relative h-\[620px\]/)
  assert.match(source, /"xl:hidden"/)
  assert.doesNotMatch(source, /hidden lg:block/, 'der Umbruch darf nicht bei lg liegen -- dort ist die Infospalte noch zu breit')
})

test('Karte: feste Hoehe 620px, rounded-3xl, overflow-hidden, dunkler Buehnenhintergrund', () => {
  assert.match(source, /rounded-3xl overflow-hidden bg-pl-stage/)
  assert.match(source, /h-\[620px\]/)
})

test('Bild ab xl rechtsbuendig in voller Kartenhoehe, Seitenverhaeltnis 4:3 (Breite = Hoehe × 4\\/3), object-cover nur innerhalb dieser Flaeche', () => {
  const desktopIdx = source.indexOf('hidden xl:block relative h-[620px]')
  assert.ok(desktopIdx >= 0)
  const desktopBlock = source.slice(desktopIdx, source.indexOf('DemoSoundInfo', desktopIdx))
  assert.match(desktopBlock, /absolute right-0 top-0 h-full aspect-\[4\/3\]/)
  assert.match(desktopBlock, /object-cover/)
})

test('horizontaler Verlauf ab xl: deckend bis 33%, ausklingend bis 58% transparent (Werte aus dem Entwurf)', () => {
  assert.match(source, /linear-gradient\(90deg, #12101a 0%, #12101a 33%, rgba\(18,16,26,0\.88\) 40%, rgba\(18,16,26,0\.45\) 48%, rgba\(18,16,26,0\) 58%\)/)
})

test('Infospalte ab xl: Breite 470px, vertikal zentriert', () => {
  assert.match(source, /w-\[470px\] max-w-full flex flex-col justify-center gap-6/)
})

test('Bandname als reiner Text (kein h1\\/h2), "Bandart · Herkunft" in Akzent-Lila', () => {
  const desktopIdx = source.indexOf('hidden xl:block relative h-[620px]')
  const desktopBlock = source.slice(desktopIdx, source.indexOf('DemoSoundInfo', desktopIdx))
  assert.doesNotMatch(desktopBlock, /<h1|<h2/)
  assert.match(desktopBlock, /text-pl-accent-light/)
  assert.match(source, /const demoLocationLabel = demoBand/)
  assert.match(source, /\[demoBand\.category, formatLocation\(demoBand\.location\)\]\.filter\(Boolean\)\.join\(' · '\)/)
})

test('"Klingt nach"/"Stil & Einfluesse"/"Spielt bei" ueber gemeinsame DemoSoundInfo-Komponente, "Spielt bei" nutzt BandEventTypesPills variant="dark"', () => {
  assert.match(source, /function DemoSoundInfo\(/)
  assert.match(source, /<DemoSoundInfo band=\{demoBand\} size="desktop" \/>/)
  assert.match(source, /<DemoSoundInfo band=\{demoBand\} size="mobile" \/>/)
  assert.match(source, /import \{ BandEventTypesPills \} from '@\/components\/band\/BandEventTypesPills'/)
  assert.match(source, /<BandEventTypesPills eventTypes=\{band\.eventTypes\} categorySlugs=\{band\.categorySlugs\} variant="dark" \/>/)
})

test('"Live-Video"-Pill verlinkt auf die echte Bandseite mit Sprungmarke zum Video-Abschnitt, rendert nur wenn die Band ein Video hat', () => {
  assert.match(source, /const demoHasVideo = demoEmbedUrl !== null;/)
  assert.match(source, /const demoVideoHref = demoBand \? `\/band\/\$\{demoBand\.slug\}#live` : '';/)
  assert.match(source, /\{demoHasVideo && <LiveVideoPill href=\{demoVideoHref\} position="right-6 bottom-6" size="md" \/>\}/)
  assert.match(source, /\{demoHasVideo && <LiveVideoPill href=\{demoVideoHref\} position="right-3 top-3" size="sm" \/>\}/)
})

test('Mobile/gestapeltes Layout (unter xl): Bild oben unbeschnitten (aspect-[4/3], volle Breite), Pill oben rechts, Bandname im Bild ueberlagert, Infos darunter auf dunklem Grund', () => {
  const mobileIdx = source.indexOf('"xl:hidden"')
  assert.ok(mobileIdx >= 0)
  const mobileBlock = source.slice(mobileIdx, mobileIdx + 2000)
  assert.match(mobileBlock, /relative w-full aspect-\[4\/3\]/)
  assert.match(mobileBlock, /linear-gradient\(180deg, rgba\(18,16,26,0\) 45%, rgba\(18,16,26,0\.75\) 78%, #12101a 100%\)/)
  assert.match(mobileBlock, /absolute left-\[22px\] right-\[22px\] bottom-1/)
})

test('"Aus Musiker-Sicht" ist NICHT Teil der Profilkarte, sondern steht darunter', () => {
  const cardIdx = source.indexOf('rounded-3xl overflow-hidden bg-pl-stage')
  const cardEndIdx = source.indexOf('Ganzes Profil von {demoBand.name} ansehen')
  assert.ok(cardIdx >= 0 && cardEndIdx > cardIdx)
  const cardSource = source.slice(cardIdx, cardEndIdx)
  assert.doesNotMatch(cardSource, /Aus Musiker-Sicht/)
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

test('"Aus Musiker-Sicht"-Box: heller Kasten mit umlaufendem, feinem Rahmen (Entwurf 1b, kein reiner Linksrand mehr), volle Kartenbreite', () => {
  const wrapperIdx = source.indexOf('bg-pl-canvas border border-pl-soft rounded-[20px]')
  assert.ok(wrapperIdx >= 0, 'Box-Wrapper mit umlaufendem Rahmen fehlt')
  const wrapperTagStart = source.lastIndexOf('<div', wrapperIdx)
  const wrapperTag = source.slice(wrapperTagStart, source.indexOf('>', wrapperTagStart) + 1)
  assert.doesNotMatch(wrapperTag, /380px|max-w-/)

  const footnoteIdx = source.indexOf('Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.')
  assert.ok(footnoteIdx < wrapperIdx, 'Box steht im Quelltext nach der Link/Fussnote-Zeile')
})

test('Box ist ab lg intern zweispaltig (1.4fr/1fr, 56px Abstand -- Werte aus dem Entwurf), vertikal zentriert, unter lg alles untereinander', () => {
  const wrapperIdx = source.indexOf('bg-pl-canvas border border-pl-soft rounded-[20px]')
  assert.ok(wrapperIdx >= 0)
  const boxSource = source.slice(wrapperIdx, source.indexOf('Musikerprofil ansehen', wrapperIdx) + 60)
  assert.match(boxSource, /lg:grid lg:grid-cols-\[1\.4fr_1fr\] lg:gap-14/)
  assert.match(boxSource, /lg:items-center/)
})

test('Dominik Palmer als reiner Text (nicht verlinkt), nur "Musikerprofil ansehen" bleibt Link', () => {
  const idx = source.lastIndexOf('Aus Musiker-Sicht')
  assert.ok(idx >= 0)
  const block = source.slice(idx, source.indexOf('Musikerprofil ansehen', idx) + 40)
  assert.match(block, />Dominik Palmer<\/p>/, 'Name muss reiner Text sein, kein <Link>')
  assert.doesNotMatch(block.slice(0, block.indexOf('Dominik Palmer')), /<Link/, 'kein Link vor/um den Namen')
})

test('Zitat schliesst mit typografisch korrektem Anfuehrungszeichen (U+201C), nicht mit "', () => {
  const quoteIdx = source.indexOf('Mit Alex zu arbeiten')
  assert.ok(quoteIdx >= 0)
  const quoteBlock = source.slice(quoteIdx - 120, quoteIdx + 200)
  assert.match(quoteBlock, /italic leading-relaxed text-pl-text max-w-\[70ch\]/)
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
