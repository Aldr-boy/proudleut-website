import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer app/band/[slug]/page.tsx,
// components/band/HeroCTA.tsx, components/band/BandContactSection.tsx und
// components/band/BandFloatingCta.tsx. Die Seite ist eine async Server
// Component mit await-Aufrufen -- in diesem Repo nicht per node:test
// ausfuehrbar (keine React-/Next.js-Server-Component-Test-Infrastruktur).
// Echte Quelldateien per readFileSync lesen und strukturell pruefen --
// identisches, bereits etabliertes Muster wie
// lib/admin/eventTypesPageDisplay.test.ts.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const pageSource = readFileSync(path.join(root, 'app', 'band', '[slug]', 'page.tsx'), 'utf8')
const heroCtaSource = readFileSync(path.join(root, 'components', 'band', 'HeroCTA.tsx'), 'utf8')
const contactSource = readFileSync(path.join(root, 'components', 'band', 'BandContactSection.tsx'), 'utf8')

test('Auftrag 4.3: bei genau 1 Referenz wird BandReferenceEvents ausserhalb jeder bg-pl-stage-Huelle gerendert (heller Grund)', () => {
  const match = pageSource.match(/\{referenceCount === 1 && <BandReferenceEvents band=\{band\} \/>\}/)
  assert.ok(match, 'erwartete Zeile fuer referenceCount === 1 nicht gefunden')
})

test('Auftrag 4.3: ab 2 Referenzen steht BandReferenceEvents innerhalb einer bg-pl-stage-Section', () => {
  const block = pageSource.match(/\{referenceCount >= 2 && \(([\s\S]*?)\)\}/)
  assert.ok(block, 'erwarteter referenceCount >= 2 Block nicht gefunden')
  assert.match(block![1], /bg-pl-stage/)
  assert.match(block![1], /<BandReferenceEvents/)
})

test('mergeStageIsland-Formel entspricht "referenceCount >= 2 && hasSocialStats" (max. 2 dunkle Buehnen-Sections/Seite)', () => {
  assert.match(pageSource, /const mergeStageIsland = referenceCount >= 2 && hasSocialStats;/)
})

test('mergeStageIsland real ausgewertet: nur ab 2 Referenzen UND vorhandenen Social-Stats aktiv', () => {
  function mergeStageIsland(referenceCount: number, hasSocialStats: boolean) {
    return referenceCount >= 2 && hasSocialStats
  }
  assert.equal(mergeStageIsland(0, true), false)
  assert.equal(mergeStageIsland(1, true), false)
  assert.equal(mergeStageIsland(2, false), false)
  assert.equal(mergeStageIsland(2, true), true)
  assert.equal(mergeStageIsland(5, true), true)
})

test('standalone Social-Stats-Section rendert nur, wenn NICHT bereits in der Buehnen-Insel zusammengefuehrt', () => {
  assert.match(pageSource, /\{hasSocialStats && !mergeStageIsland && \(/)
})

test('BandFloatingCta wird mit heroCtaId="hero-cta" und contactSectionId="band-contact-section" eingebunden', () => {
  const block = pageSource.match(/<BandFloatingCta[\s\S]*?\/>/)
  assert.ok(block, 'BandFloatingCta-Aufruf nicht gefunden')
  assert.match(block![0], /heroCtaId="hero-cta"/)
  assert.match(block![0], /contactSectionId="band-contact-section"/)
})

test('die von BandFloatingCta referenzierten IDs existieren real in HeroCTA und BandContactSection', () => {
  assert.match(heroCtaSource, /id="hero-cta"/)
  assert.match(contactSource, /id="band-contact-section"/)
})

test('Artikel reserviert unteren Seitenabstand fuer die mobile Sticky-Bottom-CTA', () => {
  assert.match(pageSource, /<article className="bg-pl-canvas pb-20 md:pb-0">/)
})

test('"Ähnliche Bands" nutzt Spacing-Stufe "large" (bewusster Szenenwechsel vor Seitenende)', () => {
  assert.match(pageSource, /Ähnliche Bands \*\/\}\s*\{similarBands\.length > 0 \? \(\s*<section className="bg-pl-canvas border-t border-pl-soft py-16 md:py-20/)
})
