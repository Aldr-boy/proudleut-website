import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeOverallStatus } from './status.ts'

test('computeOverallStatus: alle gesendet -> versendet', () => {
  assert.equal(computeOverallStatus(['gesendet', 'gesendet']), 'versendet')
})

test('computeOverallStatus: alle fehlgeschlagen -> fehlerhaft', () => {
  assert.equal(computeOverallStatus(['fehlgeschlagen', 'fehlgeschlagen']), 'fehlerhaft')
})

test('computeOverallStatus: Mix aus gesendet und fehlgeschlagen -> teilweise_versendet', () => {
  assert.equal(computeOverallStatus(['gesendet', 'fehlgeschlagen']), 'teilweise_versendet')
})

test('computeOverallStatus: Mix aus gesendet und ungeklaert -> teilweise_versendet', () => {
  assert.equal(computeOverallStatus(['gesendet', 'ungeklaert']), 'teilweise_versendet')
})

test('computeOverallStatus: nur fehlgeschlagen + ungeklaert, kein gesendet -> ungeklaert', () => {
  assert.equal(computeOverallStatus(['fehlgeschlagen', 'ungeklaert']), 'ungeklaert')
})

test('computeOverallStatus: einzelne Band, gesendet -> versendet', () => {
  assert.equal(computeOverallStatus(['gesendet']), 'versendet')
})

test('computeOverallStatus: leere Liste faellt sicher auf fehlerhaft zurueck', () => {
  assert.equal(computeOverallStatus([]), 'fehlerhaft')
})
