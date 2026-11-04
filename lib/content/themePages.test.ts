import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getPublishedThemePages, getThemePagesForBand } from './themePages.ts'
import { festzeltBayernGroups, FESTZELT_BAYERN_MIN_BANDS } from './festzeltBayern.ts'
import { hochzeitOberpfalzGroups, hochzeitOberpfalzBlasmusik, HOCHZEIT_OBERPFALZ_MIN_BANDS } from './hochzeitOberpfalz.ts'

const festzeltSlugs = festzeltBayernGroups.flatMap((g) => g.bands.map((b) => b.slug))
const hochzeitSlugs = hochzeitOberpfalzGroups.flatMap((g) => g.bands.map((b) => b.slug))

test('ohne aktive Bands ist keine Themenseite veroeffentlicht (Footer zeigt keinen Unterpunkt)', () => {
  assert.deepEqual(getPublishedThemePages(new Set()), [])
})

test('Themenseite erscheint erst ab der Mindestzahl aktiver Bands (wie in der Sitemap)', () => {
  const justBelow = new Set(festzeltSlugs.slice(0, FESTZELT_BAYERN_MIN_BANDS - 1))
  assert.equal(getPublishedThemePages(justBelow).length, 0)
  const atMin = new Set(festzeltSlugs.slice(0, FESTZELT_BAYERN_MIN_BANDS))
  assert.deepEqual(getPublishedThemePages(atMin).map((t) => t.path), ['/veranstaltung/festzelt/bayern'])

  const hochzeitMin = new Set(hochzeitSlugs.slice(0, HOCHZEIT_OBERPFALZ_MIN_BANDS))
  assert.deepEqual(getPublishedThemePages(hochzeitMin).map((t) => t.path), ['/veranstaltung/hochzeit/oberpfalz'])
})

test('Band verlinkt nur auf Themenseiten, auf denen sie steht und die veroeffentlicht sind', () => {
  const active = new Set([...festzeltSlugs, ...hochzeitSlugs])
  const festzeltBand = festzeltSlugs.find((s) => !hochzeitSlugs.includes(s))!
  assert.deepEqual(getThemePagesForBand(festzeltBand, active).map((t) => t.occasionSlug), ['festzelt'])
  assert.deepEqual(getThemePagesForBand('unbekannte-band', new Set([...active, 'unbekannte-band'])), [])
  // nicht aktiv -> kein Link
  assert.deepEqual(getThemePagesForBand(festzeltBand, new Set(hochzeitSlugs)), [])
  // Themenseite nicht veroeffentlicht -> kein Link, auch wenn die Band dort steht
  assert.deepEqual(getThemePagesForBand(festzeltBand, new Set([festzeltBand])), [])
})

test('Blasmusik-Band der Hochzeitsseite zaehlt als dort aufgefuehrt', () => {
  const active = new Set([...hochzeitSlugs, hochzeitOberpfalzBlasmusik.bands[0].slug])
  assert.ok(getThemePagesForBand(hochzeitOberpfalzBlasmusik.bands[0].slug, active).some((t) => t.occasionSlug === 'hochzeit'))
})

test('Footer ist ein Server-Bauteil und rendert die Unterpunkte im HTML (kein use client)', () => {
  const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'components', 'Footer.tsx'), 'utf8')
  assert.ok(!/['"]use client['"]/.test(src))
  assert.match(src, /export default async function Footer/)
  assert.match(src, /getPublishedThemePages\(activeSlugs\)/)
})
