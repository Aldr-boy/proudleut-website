import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateMembershipDates, parseSortOrder, validateRole } from './membershipValidation.ts'

test('validateMembershipDates: beide leer -> gueltig (Zeitraum nicht gepflegt)', () => {
  assert.equal(validateMembershipDates('', ''), null)
})

test('validateMembershipDates: nur joined_at gesetzt -> gueltig (laufend)', () => {
  assert.equal(validateMembershipDates('2020-01-01', ''), null)
})

test('validateMembershipDates: left_at >= joined_at -> gueltig', () => {
  assert.equal(validateMembershipDates('2020-01-01', '2020-01-01'), null)
  assert.equal(validateMembershipDates('2020-01-01', '2022-06-15'), null)
})

test('validateMembershipDates: left_at < joined_at -> left_before_joined', () => {
  assert.equal(validateMembershipDates('2022-01-01', '2020-01-01'), 'left_before_joined')
})

test('parseSortOrder: leer -> 0', () => {
  assert.equal(parseSortOrder(''), 0)
  assert.equal(parseSortOrder('   '), 0)
})

test('parseSortOrder: gueltige nicht-negative Ganzzahl -> Zahl', () => {
  assert.equal(parseSortOrder('0'), 0)
  assert.equal(parseSortOrder('5'), 5)
})

test('parseSortOrder: negativ oder nicht-ganzzahlig oder Text -> null', () => {
  assert.equal(parseSortOrder('-1'), null)
  assert.equal(parseSortOrder('1.5'), null)
  assert.equal(parseSortOrder('abc'), null)
})

test('validateRole: bis 100 Zeichen gueltig, darueber ungueltig', () => {
  assert.equal(validateRole(''), true)
  assert.equal(validateRole('Bass'), true)
  assert.equal(validateRole('a'.repeat(100)), true)
  assert.equal(validateRole('a'.repeat(101)), false)
})
