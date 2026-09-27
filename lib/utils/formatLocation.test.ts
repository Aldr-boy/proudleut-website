import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatLocation } from './formatLocation.ts'

test('kreisfreie Stadt: Landkreis-Wert beginnt mit "Kreisfreie Stadt" -> nur der Ort, kein redundanter Zusatz', () => {
  assert.equal(
    formatLocation({ city: 'München', district: 'Kreisfreie Stadt München' }),
    'München',
  )
})

test('normaler Landkreis: unveraendert, weiterhin "Ort · Landkreis"', () => {
  assert.equal(
    formatLocation({ city: 'Pyrbaum', district: 'Landkreis Neumarkt i.d.OPf.' }),
    'Pyrbaum · Landkreis Neumarkt i.d.OPf.',
  )
})

test('fehlender Landkreis: unveraendert, Fallback auf administrativeRegion/state wie bisher', () => {
  assert.equal(
    formatLocation({ city: 'Konstanz', administrativeRegion: 'Freiburg' }),
    'Konstanz · Freiburg',
  )
  assert.equal(
    formatLocation({ city: 'Konstanz', state: 'Baden-Württemberg' }),
    'Konstanz · Baden-Württemberg',
  )
})

test('weder Landkreis noch administrativeRegion noch state -> nur der Ort', () => {
  assert.equal(formatLocation({ city: 'Amberg' }), 'Amberg')
})

test('kein Ort -> leerer String, unabhaengig von anderen Feldern', () => {
  assert.equal(formatLocation(undefined), '')
  assert.equal(formatLocation({ district: 'Kreisfreie Stadt München' }), '')
})
