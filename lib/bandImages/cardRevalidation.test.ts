import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BAND_CARD_REVALIDATION_PATHS } from './cardRevalidation.ts'

test('BAND_CARD_REVALIDATION_PATHS enthaelt genau /bands und /veranstaltung/[slug]', () => {
  assert.deepEqual(BAND_CARD_REVALIDATION_PATHS, [
    { path: '/bands' },
    { path: '/veranstaltung/[slug]', type: 'page' },
  ])
})

test('BAND_CARD_REVALIDATION_PATHS: /veranstaltung/[slug] wird als Route-Pattern (type=page) revalidiert, nicht als Einzelpfad', () => {
  const entry = BAND_CARD_REVALIDATION_PATHS.find((p) => p.path === '/veranstaltung/[slug]')
  assert.equal(entry?.type, 'page')
})

test('BAND_CARD_REVALIDATION_PATHS enthaelt keine globale Site-Invalidierung (kein "/" Eintrag)', () => {
  assert.equal(BAND_CARD_REVALIDATION_PATHS.some((p) => p.path === '/'), false)
})
