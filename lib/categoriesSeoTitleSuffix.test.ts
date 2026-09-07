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
