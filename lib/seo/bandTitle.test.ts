import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBandTitle, BAND_TITLE_SUFFIX } from './bandTitle.ts'

test('Band mit primaerer Bandart: "Name – Bandart"', () => {
  assert.equal(buildBandTitle('Donnaweda', 'Bayrische Partyband'), 'Donnaweda – Bayrische Partyband')
})

test('Band ohne eindeutige primaere Bandart: nur der Name', () => {
  assert.equal(buildBandTitle('Donnaweda'), 'Donnaweda')
  assert.equal(buildBandTitle('Donnaweda', undefined), 'Donnaweda')
  assert.equal(buildBandTitle('Donnaweda', '  '), 'Donnaweda')
})

test('Gesamttitel inklusive Suffix genau 70 Zeichen: Bandart bleibt', () => {
  const art = 'A'.repeat(70 - BAND_TITLE_SUFFIX.length - 'X – '.length)
  const title = buildBandTitle('X', art)
  assert.equal(title, `X – ${art}`)
  assert.equal((title + BAND_TITLE_SUFFIX).length, 70)
})

test('Gesamttitel ueber 70 Zeichen: Bandart entfaellt, nichts wird gekuerzt', () => {
  const art = 'A'.repeat(70 - BAND_TITLE_SUFFIX.length - 'X – '.length + 1)
  assert.equal(buildBandTitle('X', art), 'X')
  assert.equal(buildBandTitle('Ein sehr langer Bandname mit vielen Woertern', 'Blasmusik / Wirtshausmusik / Volksmusik'), 'Ein sehr langer Bandname mit vielen Woertern')
})
