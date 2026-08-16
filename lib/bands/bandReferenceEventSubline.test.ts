import { test } from 'node:test'
import assert from 'node:assert/strict'
import { referenceEventSublines } from './bandReferenceEventSubline.ts'

test('kein city, kein year, keine description -> keine Unterzeile', () => {
  assert.deepEqual(referenceEventSublines({}), [])
})

test('nur city, kein year, keine description -> bestehendes Verhalten: eine Zeile mit city', () => {
  assert.deepEqual(referenceEventSublines({ city: 'Regensburg' }), ['Regensburg'])
})

test('nur year, kein city, keine description -> bestehendes Verhalten: eine Zeile mit year', () => {
  assert.deepEqual(referenceEventSublines({ year: 2024 }), ['2024'])
})

test('city + year, keine description -> bestehendes Verhalten unveraendert: eine Zeile "city · year"', () => {
  assert.deepEqual(referenceEventSublines({ city: 'Regensburg', year: 2024 }), ['Regensburg · 2024'])
})

test('nur description, kein city, kein year -> eine Zeile "description"', () => {
  assert.deepEqual(referenceEventSublines({ description: 'Wiederkehrendes Engagement' }), ['Wiederkehrendes Engagement'])
})

test('description + year, kein city -> eine Zeile "description · year"', () => {
  assert.deepEqual(
    referenceEventSublines({ description: 'Wiederkehrendes Engagement', year: 2024 }),
    ['Wiederkehrendes Engagement · 2024'],
  )
})

test('city + description, kein year -> zwei Zeilen: city, dann description', () => {
  assert.deepEqual(
    referenceEventSublines({ city: 'Regensburg', description: 'Wiederkehrendes Engagement' }),
    ['Regensburg', 'Wiederkehrendes Engagement'],
  )
})

test('city + description + year -> zwei Zeilen: city allein, dann "description · year" -- year erscheint nie doppelt', () => {
  assert.deepEqual(
    referenceEventSublines({ city: 'Regensburg', description: 'Wiederkehrendes Engagement', year: 2024 }),
    ['Regensburg', 'Wiederkehrendes Engagement · 2024'],
  )
})
