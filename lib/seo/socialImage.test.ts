import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSocialCrop, parseFocus, SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from './socialImage.ts'
import { MOBILE_HERO_OBJECT_POSITION } from '../bands/heroImagePresentation.ts'

test('Fokus kommt aus dem mobilen Header (50% 35%)', () => {
  assert.deepEqual(parseFocus(MOBILE_HERO_OBJECT_POSITION), { x: 0.5, y: 0.35 })
  assert.deepEqual(parseFocus('kaputt'), { x: 0.5, y: 0.5 })
})

test('Querformat 3:2 (1046x686): Breite fuellt, Ausschnitt oben betont, ca. 20 % entfernt', () => {
  const c = computeSocialCrop(1046, 686)
  assert.equal(c.resizeWidth, SOCIAL_IMAGE_WIDTH)
  assert.equal(c.left, 0)
  assert.equal(c.top, Math.round((c.resizeHeight - SOCIAL_IMAGE_HEIGHT) * 0.35))
  assert.ok(c.visibleShare > 0.75 && c.visibleShare < 0.85)
})

test('Bild exakt 1200x630: kein Zuschnitt', () => {
  const c = computeSocialCrop(1200, 630)
  assert.deepEqual([c.resizeWidth, c.resizeHeight, c.left, c.top, c.visibleShare], [1200, 630, 0, 0, 1])
})

test('Banner 4:1: Hoehe fuellt, seitlich mittig angeschnitten, mehr als 40 % entfernt', () => {
  const c = computeSocialCrop(1046, 268)
  assert.equal(c.resizeHeight, SOCIAL_IMAGE_HEIGHT)
  assert.equal(c.top, 0)
  assert.equal(c.left, Math.round((c.resizeWidth - SOCIAL_IMAGE_WIDTH) * 0.5))
  assert.ok(c.visibleShare < 0.6)
})

test('Hochformat: Breite fuellt, Ausschnitt bleibt im Bild', () => {
  const c = computeSocialCrop(800, 1200)
  assert.ok(c.top >= 0 && c.top + SOCIAL_IMAGE_HEIGHT <= c.resizeHeight)
  assert.ok(c.visibleShare < 0.6)
})
