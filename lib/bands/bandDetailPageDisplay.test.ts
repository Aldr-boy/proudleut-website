import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/band/[slug]/page.tsx,
// components/band/HeroCTA.tsx, components/band/BandFloatingCta.tsx und
// components/band/BandContactSection.tsx. Die Seite ist eine async Server
// Component mit await-Aufrufen -- in diesem Repo nicht per node:test
// ausfuehrbar (keine React-/Next.js-Server-Component-Test-Infrastruktur).
// Echte Quelldateien per readFileSync lesen und strukturell pruefen --
// identisches, bereits etabliertes Muster wie
// lib/admin/eventTypesPageDisplay.test.ts.
//
// Bandseiten-Finalisierung (Auftrag "Bandseiten-Finalisierung"):
// BandReferenceEvents, BandGallery, BandDocumentsSection und
// BandWeddingModule sind nicht mehr als eigene Sections direkt in
// page.tsx eingebunden, sondern in BandTagsSection (Zeilenraster) bzw.
// BandGallerySection (Fotos) eingebettet -- "zusammenhaengende
// Inhaltsbereiche" statt vier zusaetzlich gestapelter Alt-Sections (siehe
// BandTagsSection.tsx, BandGallerySection.tsx). Die fruehere dunkle Insel
// BandVideoSection ist aufgeloest. HeroCTA ist in BandHero
// eingebettet (kein eigener "hero-cta"-Balken mehr), BandFloatingCta nutzt
// weiterhin heroButtonId/ctaButtonId.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const pageSource = readFileSync(path.join(root, 'app', 'band', '[slug]', 'page.tsx'), 'utf8')
const heroCtaSource = readFileSync(path.join(root, 'components', 'band', 'HeroCTA.tsx'), 'utf8')
const bandHeroSource = readFileSync(path.join(root, 'components', 'band', 'BandHero.tsx'), 'utf8')
const tagsSectionSource = readFileSync(path.join(root, 'components', 'band', 'BandTagsSection.tsx'), 'utf8')
const gallerySectionSource = readFileSync(path.join(root, 'components', 'band', 'BandGallerySection.tsx'), 'utf8')

test('BandReferenceEvents, BandGallery, BandDocumentsSection und BandWeddingModule sind nicht mehr eigenstaendig in page.tsx eingebunden, sondern in BandGallerySection bzw. BandTagsSection eingebettet', () => {
  assert.doesNotMatch(pageSource, /<BandReferenceEvents/)
  assert.doesNotMatch(pageSource, /<BandGallery(?!Section)/)
  assert.doesNotMatch(pageSource, /<BandDocumentsSection/)
  assert.doesNotMatch(pageSource, /<BandWeddingModule/)
  assert.match(gallerySectionSource, /<BandGallery band=\{band\} \/>/)
  assert.match(tagsSectionSource, /<BandReferenceEvents band=\{band\} \/>/)
  assert.match(tagsSectionSource, /<BandDocumentsSection band=\{band\} \/>/)
  assert.match(tagsSectionSource, /<BandWeddingModule band=\{band\} \/>/)
})

test('BandSocialIndex ("Sichtbarkeit ueber die Buehne hinaus") bleibt entfernt -- Social-Kennzahlen erscheinen ausschliesslich in "Mehr von [Band]"', () => {
  assert.doesNotMatch(pageSource, /BandSocialIndex/)
})

test('HeroCTA wird nicht mehr eigenstaendig auf der Seite eingebunden, sondern von BandHero uebernommen', () => {
  assert.doesNotMatch(pageSource, /<HeroCTA/)
  assert.match(bandHeroSource, /<HeroCTA/)
})

test('BandFloatingCta wird mit facts, heroButtonId, hasHeroButton und ctaButtonId="cta-anfrage-btn" eingebunden', () => {
  const block = pageSource.match(/<BandFloatingCta[\s\S]*?\/>/)
  assert.ok(block, 'BandFloatingCta-Aufruf nicht gefunden')
  assert.match(block![0], /facts=\{facts\}/)
  assert.match(block![0], /heroButtonId=\{HERO_ANFRAGE_BUTTON_ID\}/)
  assert.match(block![0], /hasHeroButton=\{hasHeroButton\}/)
  assert.match(block![0], /ctaButtonId="cta-anfrage-btn"/)
})

test('die von BandFloatingCta referenzierten IDs existieren real: Hero-Anfrage-Button in HeroCTA, Wrapper cta-anfrage-btn in BandCtaSection, kein Sentinel mehr in page.tsx', () => {
  assert.match(heroCtaSource, /export const HERO_ANFRAGE_BUTTON_ID = 'hero-anfrage-btn'/)
  assert.match(heroCtaSource, /id=\{HERO_ANFRAGE_BUTTON_ID\}/)
  const ctaSource = readFileSync(path.join(root, 'components', 'band', 'BandCtaSection.tsx'), 'utf8')
  assert.match(ctaSource, /<div id="cta-anfrage-btn" className="flex flex-col">\s*<AnfrageButton/)
  assert.doesNotMatch(pageSource, /final-cta-sentinel/)
})

test('Hero und Zeilenraster (mit der Zeile "Live") liegen im selben VideoModalProvider (ein Modal fuer Hero-Pille und Poster-Tile)', () => {
  const provider = pageSource.match(/<VideoModalProvider[\s\S]*?<\/VideoModalProvider>/)
  assert.ok(provider, 'VideoModalProvider nicht gefunden')
  assert.match(provider![0], /<BandHero/)
  assert.match(provider![0], /<BandTagsSection band=\{band\} hasVideo=\{hasVideo\} \/>/)
  assert.match(provider![0], /embedUrl=\{embedUrl\}/)
  assert.doesNotMatch(pageSource, /BandVideoSection/, 'die dunkle Insel ist aufgeloest')
})

test('Reihenfolge: Hero, Text, Zeilenraster, "Mehr von", Fotos, Abschluss-CTA; ohne Galerie entfaellt die Fotos-Section (BandGallerySection gibt null zurueck)', () => {
  const idx = (needle: string) => pageSource.indexOf(needle)
  const order = [
    idx('<BandHero band={band}'),
    idx('<BandDescription band={band} />'),
    idx('<BandTagsSection band={band} hasVideo={hasVideo} />'),
    idx('<BandContactSection band={band} websiteUrl={websiteUrl} />'),
    idx('<BandGallerySection band={band} />'),
    idx('<BandCtaSection band={band} />'),
  ]
  assert.ok(order.every((i) => i >= 0), 'ein Baustein fehlt')
  assert.deepEqual([...order].sort((a, b) => a - b), order)
  // der Provider endet vor "Mehr von" und umschliesst die Galerie nicht
  assert.ok(idx('</VideoModalProvider>') < idx('<BandContactSection'))
  assert.match(gallerySectionSource, /if \(band\.gallery\.length === 0\) return null;/)
  assert.match(gallerySectionSource, /<section className="bg-pl-canvas px-4 sm:px-6 pb-16 md:pb-20">/)
})

test('Artikel reserviert unteren Seitenabstand fuer die mobile Sticky-Bottom-CTA (Anfrage + Herz, siehe BandFloatingCta)', () => {
  assert.match(pageSource, /<article className="bg-pl-canvas pb-24 md:pb-0">/)
})

test('Reihenfolge am Seitenende: Zeilenraster, "Mehr von", Abschluss-CTA, BandFloatingCta', () => {
  const idx = (needle: string) => pageSource.indexOf(needle)
  const order = [
    idx('<BandTagsSection band={band} hasVideo={hasVideo} />'),
    idx('<BandContactSection band={band} websiteUrl={websiteUrl} />'),
    idx('<BandCtaSection band={band} />'),
    idx('<BandFloatingCta'),
  ]
  assert.ok(order.every((i) => i >= 0), 'ein Baustein fehlt')
  assert.deepEqual([...order].sort((a, b) => a - b), order)
})

test('BandCtaSection: Anfrage-Button + MerkButton (dunkel) in der rechten Spalte, "Noch unsicher?"-Zeile mit mailto-Link, "Interesse?" als h2', () => {
  const ctaSource = readFileSync(path.join(root, 'components', 'band', 'BandCtaSection.tsx'), 'utf8')
  assert.match(ctaSource, /<h2 [^>]*>\s*Interesse\?\s*<\/h2>/)
  assert.match(ctaSource, /Euer Abend mit \{band\.name\}/)
  assert.match(ctaSource, /Deine Anfrage geht direkt an \{band\.name\}\./)
  assert.match(ctaSource, /<AnfrageButton/)
  assert.match(ctaSource, /<MerkButton[\s\S]*?variant="dark"/)
  assert.match(ctaSource, /href=\{`mailto:\$\{CONTACT_EMAIL\}`\}/)
  assert.match(ctaSource, /Schreib mir kurz, wenn du Hilfe bei der Auswahl möchtest\./)
  assert.match(ctaSource, /md:w-\[300px\]/)
  assert.match(ctaSource, /bg-pl-paper/)
})

test('"Ähnliche Bands": SimilarBandCard statt BandCard, Block bleibt inline in page.tsx, Unterzeile entfaellt, Link "Mehr Livebands entdecken →" und Fallback-Block bleiben', () => {
  assert.match(pageSource, /import \{ SimilarBandCard \} from '@\/components\/band\/SimilarBandCard';/)
  assert.doesNotMatch(pageSource, /import BandCard from/, 'BandCard wird auf der Banddetailseite nicht mehr importiert')
  assert.doesNotMatch(pageSource, /<BandCard\b/)
  assert.match(pageSource, /<SimilarBandCard key=\{b\.slug\} band=\{b\} \/>/)
  assert.doesNotMatch(pageSource, /Weitere Livebands mit ähnlichem Gefühl/)
  assert.match(pageSource, /Mehr Livebands entdecken →/)
  assert.match(pageSource, /Noch nicht die richtige Band\? Entdecke weitere Livebands auf proudleut\./)
  assert.match(pageSource, /Alle Bands entdecken/)
  // feste 3-Spalten-Raster: 1 oder 2 Karten stehen linksbuendig in der Kartenbreite von 3
  assert.match(pageSource, /grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6/)
})

test('SimilarBandCard: Bild, Name und "Ort · Genre" in EINEM Link auf das Bandprofil; kein Merken-Herz, kein Store, keine Client-Komponente, dekoratives Bild', () => {
  const card = readFileSync(path.join(root, 'components', 'band', 'SimilarBandCard.tsx'), 'utf8').replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(card, /'use client'/)
  assert.doesNotMatch(card, /useAnfrageStore|Merk|merk/)
  assert.equal((card.match(/<Link\b/g) ?? []).length, 1)
  assert.match(card, /href=\{`\/band\/\$\{band\.slug\}`\}/)
  assert.match(card, /\[city, genre\]\.filter\(Boolean\)\.join\(' · '\)/)
  assert.match(card, /alt=""/)
  assert.match(card, /<h3 [^>]*>\{band\.name\}<\/h3>/)
  assert.doesNotMatch(card, /shortDescription|chips|line-clamp/)
})

test('"Ähnliche Bands" nutzt Spacing-Stufe "large" (bewusster Szenenwechsel vor Seitenende)', () => {
  assert.match(pageSource, /Ähnliche Bands \*\/\}\s*\{similarBands\.length > 0 \? \(\s*<section className="bg-pl-canvas border-t border-pl-soft py-16 md:py-20/)
})

test('Seiten-Rhythmus: Hero vor Beschreibung (Text) vor Zeilenraster (Tags-Section)', () => {
  const heroIdx = pageSource.indexOf('<BandHero band={band}')
  const descriptionIdx = pageSource.indexOf('<BandDescription band={band} />')
  const tagsIdx = pageSource.indexOf('<BandTagsSection band={band} hasVideo={hasVideo} />')
  assert.ok(heroIdx >= 0 && descriptionIdx >= 0 && tagsIdx >= 0, 'eine der Kernsections fehlt')
  assert.ok(heroIdx < descriptionIdx)
  assert.ok(descriptionIdx < tagsIdx)
})
