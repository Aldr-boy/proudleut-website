import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidCreditName } from './creditValidation.ts'

test('isValidCreditName: nicht-leerer Name bis 80 Zeichen gueltig', () => {
  assert.equal(isValidCreditName('Paul Young'), true)
  assert.equal(isValidCreditName('a'.repeat(80)), true)
})

test('isValidCreditName: leeres/nur-Whitespace ungueltig', () => {
  assert.equal(isValidCreditName(''), false)
  assert.equal(isValidCreditName('   '), false)
})

test('isValidCreditName: ueber 80 Zeichen ungueltig', () => {
  assert.equal(isValidCreditName('a'.repeat(81)), false)
})
