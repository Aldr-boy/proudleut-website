import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPersonTitle } from './personTitle.ts'

test('Mit Rolle: "Name – Rolle"', () => {
  assert.equal(buildPersonTitle('Dominik Palmer', 'Bassist'), 'Dominik Palmer – Bassist')
})

test('Ohne Rolle (fehlt oder leer): nur der Name', () => {
  assert.equal(buildPersonTitle('Dominik Palmer'), 'Dominik Palmer')
  assert.equal(buildPersonTitle('Dominik Palmer', null), 'Dominik Palmer')
  assert.equal(buildPersonTitle('Dominik Palmer', '  '), 'Dominik Palmer')
})
