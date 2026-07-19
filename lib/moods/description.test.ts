import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasMissingDescription } from './description.ts'

test('erkennt null als fehlende Definition (Bestandsfall brass-power)', () => {
  assert.equal(hasMissingDescription(null), true)
})

test('erkennt undefined als fehlende Definition', () => {
  assert.equal(hasMissingDescription(undefined), true)
})

test('erkennt leeren String als fehlende Definition', () => {
  assert.equal(hasMissingDescription(''), true)
})

test('erkennt whitespace-only String als fehlende Definition', () => {
  assert.equal(hasMissingDescription('   '), true)
})

test('erkennt vorhandenen Text nicht als fehlende Definition', () => {
  assert.equal(hasMissingDescription('Kraftvoll, laut, mitreissend.'), false)
})
