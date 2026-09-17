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
// page.tsx eingebunden, sondern in BandVideoSection ("02") bzw.
// BandTagsSection ("03") eingebettet -- "zusammenhaengende
// Inhaltsbereiche" statt vier zusaetzlich gestapelter Alt-Sections (siehe
// BandTagsSection.tsx, BandVideoSection.tsx). HeroCTA ist in BandHero
// eingebettet (kein eigener "hero-cta"-Balken mehr), BandFloatingCta nutzt
// weiterhin heroSentinelId/finalSentinelId.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const pageSource = readFileSync(path.join(root, 'app', 'band', '[slug]', 'page.tsx'), 'utf8')
const heroCtaSource = readFileSync(path.join(root, 'components', 'band', 'HeroCTA.tsx'), 'utf8')
const bandHeroSource = readFileSync(path.join(root, 'components', 'band', 'BandHero.tsx'), 'utf8')
const tagsSectionSource = readFileSync(path.join(root, 'components', 'band', 'BandTagsSection.tsx'), 'utf8')
const videoSectionSource = readFileSync(path.join(root, 'components', 'band', 'BandVideoSection.tsx'), 'utf8')

test('BandReferenceEvents, BandGallery, BandDocumentsSection und BandWeddingModule sind nicht mehr eigenstaendig in page.tsx eingebunden, sondern in "02"/"03" eingebettet', () => {
  assert.doesNotMatch(pageSource, /<BandReferenceEvents/)
  assert.doesNotMatch(pageSource, /<BandGallery/)
  assert.doesNotMatch(pageSource, /<BandDocumentsSection/)
  assert.doesNotMatch(pageSource, /<BandWeddingModule/)
  assert.match(videoSectionSource, /<BandGallery band=\{band\} \/>/)
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

test('BandFloatingCta wird mit heroSentinelId="hero-cta-sentinel", finalSentinelId="final-cta-sentinel" und hasVideo eingebunden', () => {
  const block = pageSource.match(/<BandFloatingCta[\s\S]*?\/>/)
  assert.ok(block, 'BandFloatingCta-Aufruf nicht gefunden')
  assert.match(block![0], /heroSentinelId="hero-cta-sentinel"/)
  assert.match(block![0], /finalSentinelId="final-cta-sentinel"/)
  assert.match(block![0], /hasVideo=\{hasVideo\}/)
})

test('die von BandFloatingCta referenzierten Sentinel-IDs existieren real in HeroCTA und page.tsx', () => {
  assert.match(heroCtaSource, /id="hero-cta-sentinel"/)
  assert.match(pageSource, /id="final-cta-sentinel"/)
})

test('Artikel reserviert unteren Seitenabstand fuer die mobile Sticky-Bottom-CTA (3-Button-Zeile, siehe BandFloatingCta)', () => {
  assert.match(pageSource, /<article className="bg-pl-canvas pb-24 md:pb-0">/)
})

test('"Ähnliche Bands" nutzt Spacing-Stufe "large" (bewusster Szenenwechsel vor Seitenende)', () => {
  assert.match(pageSource, /Ähnliche Bands \*\/\}\s*\{similarBands\.length > 0 \? \(\s*<section className="bg-pl-canvas border-t border-pl-soft py-16 md:py-20/)
})

test('Seiten-Rhythmus: Hero vor 01 (Beschreibung) vor 02 (Video-Section) vor 03 (Tags-Section)', () => {
  const heroIdx = pageSource.indexOf('<BandHero band={band}')
  const descriptionIdx = pageSource.indexOf('<BandDescription band={band} />')
  const videoIdx = pageSource.indexOf('<BandVideoSection band={band}')
  const tagsIdx = pageSource.indexOf('<BandTagsSection band={band} />')
  assert.ok(heroIdx >= 0 && descriptionIdx >= 0 && videoIdx >= 0 && tagsIdx >= 0, 'eine der Kernsections fehlt')
  assert.ok(heroIdx < descriptionIdx)
  assert.ok(descriptionIdx < videoIdx)
  assert.ok(videoIdx < tagsIdx)
})
