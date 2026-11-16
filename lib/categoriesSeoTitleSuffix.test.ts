import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES } from './categories.ts'

// Paket 3 (doppelter "– proudleut.com"-Suffix): echte Ausfuehrungstests
// gegen die tatsaechliche CATEGORIES-Quelle. Der Suffix wird ausschliesslich
// vom Root-Layout-title.template ("%s – proudleut.com") ergaenzt -- kein
// seoTitle darf ihn zusaetzlich literal enthalten.

test('kein seoTitle in CATEGORIES enthaelt mehr literal "proudleut.com" (Root-Template ergaenzt den Suffix bereits)', () => {
  for (const category of CATEGORIES) {
    assert.ok(
      !category.seoTitle?.includes('proudleut.com'),
      `${category.slug}: seoTitle "${category.seoTitle}" enthaelt noch den redundanten Suffix`
    )
  }
})

test('Hochzeit-seoTitle ist exakt "Hochzeitsbands" (Root-Template ergibt final "Hochzeitsbands – proudleut.com")', () => {
  const hochzeit = CATEGORIES.find((c) => c.slug === 'hochzeit')
  assert.equal(hochzeit?.seoTitle, 'Hochzeitsbands')
})

test('alle 8 Kategorien besitzen weiterhin einen nicht-leeren seoTitle', () => {
  assert.equal(CATEGORIES.length, 8)
  for (const category of CATEGORIES) {
    assert.ok(category.seoTitle && category.seoTitle.length > 0, `${category.slug} hat keinen seoTitle mehr`)
  }
})

test('Seitentitel (pageTitle) von Hochzeit, Firmenfeier und Weihnachtsfeier nennen Bayern, ohne Suffix; Open-Graph-seoTitle bleibt unveraendert', () => {
  const by = (slug: string) => CATEGORIES.find((c) => c.slug === slug)
  assert.equal(by('hochzeit')?.pageTitle, 'Hochzeitsbands in Bayern')
  assert.equal(by('firmenfeier')?.pageTitle, 'Bands für Firmenfeiern in Bayern')
  assert.equal(by('weihnachtsfeier')?.pageTitle, 'Bands für Weihnachtsfeiern in Bayern')
  assert.equal(by('firmenfeier')?.seoTitle, 'Bands für Firmenfeier & Business Events')
  assert.equal(by('weihnachtsfeier')?.seoTitle, 'Bands für Weihnachtsfeiern')
  for (const c of CATEGORIES) {
    assert.ok(!c.pageTitle?.includes('proudleut.com'), `${c.slug}: pageTitle darf den Suffix nicht enthalten`)
  }
})

test('Meta-Description von Hochzeit ist ersetzt, die Open-Graph-Beschreibung bleibt', () => {
  const h = CATEGORIES.find((c) => c.slug === 'hochzeit')
  assert.equal(
    h?.pageDescription,
    'Hochzeitsbands in Bayern für Trauung, Sektempfang und Party. Von uns ausgewählt, direkt bei der Band anfragen.',
  )
  assert.equal(h?.seoDescription, 'Finde die passende Liveband für deine Hochzeit – persönlich, direkt und mit starken Bands.')
})
