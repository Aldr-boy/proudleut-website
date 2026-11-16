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

test('Mit Ort: "Name – Bandart aus Ort"', () => {
  assert.equal(
    buildBandTitle('Aufzundn', 'Bayrische Partyband', 'Beratzhausen'),
    'Aufzundn – Bayrische Partyband aus Beratzhausen',
  )
})

test('Ohne Ort (fehlt oder leer): Titel wie bisher', () => {
  assert.equal(buildBandTitle('Aufzundn', 'Bayrische Partyband'), 'Aufzundn – Bayrische Partyband')
  assert.equal(buildBandTitle('Aufzundn', 'Bayrische Partyband', null), 'Aufzundn – Bayrische Partyband')
  assert.equal(buildBandTitle('Aufzundn', 'Bayrische Partyband', '  '), 'Aufzundn – Bayrische Partyband')
})

test('Ohne Bandart bleibt es beim Namen, auch wenn ein Ort vorhanden ist', () => {
  assert.equal(buildBandTitle('Donnaweda', null, 'Hemau'), 'Donnaweda')
})

test('Titel mit Ort inklusive Suffix genau 75 Zeichen: Ort bleibt', () => {
  const city = 'O'.repeat(75 - BAND_TITLE_SUFFIX.length - 'X – Art aus '.length)
  const title = buildBandTitle('X', 'Art', city)
  assert.equal(title, `X – Art aus ${city}`)
  assert.equal((title + BAND_TITLE_SUFFIX).length, 75)
})

test('Titel mit Ort inklusive Suffix ueber 75 Zeichen: Ort entfaellt, Titel wie bisher', () => {
  const city = 'O'.repeat(75 - BAND_TITLE_SUFFIX.length - 'X – Art aus '.length + 1)
  assert.equal(buildBandTitle('X', 'Art', city), 'X – Art')
})
