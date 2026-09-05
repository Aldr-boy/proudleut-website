import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveHeroFocus } from './resolveHeroFocus.ts'

test('resolveHeroFocus: NULL wird fachlich als center behandelt', () => {
  assert.equal(resolveHeroFocus(null), 'center')
})

test('resolveHeroFocus: undefined wird ebenfalls als center behandelt', () => {
  assert.equal(resolveHeroFocus(undefined), 'center')
})

test('resolveHeroFocus: gueltige Werte werden unveraendert durchgereicht', () => {
  assert.equal(resolveHeroFocus('top'), 'top')
  assert.equal(resolveHeroFocus('center'), 'center')
  assert.equal(resolveHeroFocus('bottom'), 'bottom')
})

test('resolveHeroFocus: unbekannter/fehlerhafter Wert faellt sicher auf center zurueck', () => {
  assert.equal(resolveHeroFocus('sideways'), 'center')
  assert.equal(resolveHeroFocus(''), 'center')
})
