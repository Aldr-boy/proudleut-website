import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasMissingDescription } from './description.ts'

test('erkennt null als fehlende Beschreibung (Bestandsfall: alle 322 importierten Katalogeintraege)', () => {
  assert.equal(hasMissingDescription(null), true)
})

test('erkennt undefined als fehlende Beschreibung', () => {
  assert.equal(hasMissingDescription(undefined), true)
})

test('erkennt leeren String als fehlende Beschreibung', () => {
  assert.equal(hasMissingDescription(''), true)
})

test('erkennt whitespace-only String als fehlende Beschreibung', () => {
  assert.equal(hasMissingDescription('   '), true)
})

test('erkennt vorhandenen Text nicht als fehlende Beschreibung', () => {
  assert.equal(hasMissingDescription('Zünftige Blasmusik mit Partyeinlage.'), false)
})
