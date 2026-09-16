import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHeroImagePresentation, resolveMobileHeroImage } from './heroImagePresentation.ts'
import type { ImageAsset } from '@/lib/types/image'

function img(url: string): ImageAsset {
  return { url, alt: 'x', source: 'external' }
}

test('resolveHeroImagePresentation: ohne Eintrag -> leeres Objekt (gemeinsamer Standard)', () => {
  assert.deepEqual(resolveHeroImagePresentation('irgendeine-band'), {})
})

test('resolveHeroImagePresentation: vorhandener Eintrag wird zurueckgegeben', () => {
  const presentation = { 'meine-band': { desktopObjectPosition: 'center 30%' } }
  assert.deepEqual(resolveHeroImagePresentation('meine-band', presentation), { desktopObjectPosition: 'center 30%' })
})

test('resolveMobileHeroImage: ohne Konfiguration -> heroImage unveraendert', () => {
  const heroImage = img('https://x/hero.jpg')
  const result = resolveMobileHeroImage({ slug: 'irgendeine-band', heroImage, gallery: [img('https://x/g1.jpg')] })
  assert.equal(result, heroImage)
})

test('resolveMobileHeroImage: kein heroImage und keine Konfiguration -> undefined', () => {
  const result = resolveMobileHeroImage({ slug: 'irgendeine-band', heroImage: undefined, gallery: [] })
  assert.equal(result, undefined)
})

test('resolveMobileHeroImage: konfigurierter Treffer in der Galerie wird verwendet', () => {
  const heroImage = img('https://x/hero.jpg')
  const gallery = [img('https://x/gallery-02.jpg'), img('https://x/gallery-portrait.jpg')]
  const presentation = { 'meine-band': { mobileImageUrlContains: 'gallery-portrait' } }
  const result = resolveMobileHeroImage({ slug: 'meine-band', heroImage, gallery }, presentation)
  assert.equal(result, gallery[1])
})

test('resolveMobileHeroImage: konfigurierter Treffer im heroImage selbst wird gefunden', () => {
  const heroImage = img('https://x/hero-wide.jpg')
  const presentation = { 'meine-band': { mobileImageUrlContains: 'hero-wide' } }
  const result = resolveMobileHeroImage({ slug: 'meine-band', heroImage, gallery: [] }, presentation)
  assert.equal(result, heroImage)
})

test('resolveMobileHeroImage: konfigurierter, aber nicht auffindbarer Treffer faellt auf heroImage zurueck', () => {
  const heroImage = img('https://x/hero.jpg')
  const gallery = [img('https://x/g1.jpg'), img('https://x/g2.jpg')]
  const presentation = { 'meine-band': { mobileImageUrlContains: 'nicht-vorhanden' } }
  const result = resolveMobileHeroImage({ slug: 'meine-band', heroImage, gallery }, presentation)
  assert.equal(result, heroImage)
})

test('resolveMobileHeroImage: Treffer konfiguriert, aber gar kein heroImage vorhanden -> undefined, kein Crash', () => {
  const gallery = [img('https://x/g1.jpg')]
  const presentation = { 'meine-band': { mobileImageUrlContains: 'g1' } }
  const result = resolveMobileHeroImage({ slug: 'meine-band', heroImage: undefined, gallery }, presentation)
  assert.equal(result, gallery[0])
})
