import { test } from 'node:test'
import assert from 'node:assert/strict'
import { referenceEventsVariant } from './bandReferenceEventsLayout.ts'

test('referenceEventsVariant: 0 Referenzen -> none (Section entfaellt vollstaendig)', () => {
  assert.equal(referenceEventsVariant(0), 'none')
})

test('referenceEventsVariant: genau 1 Referenz -> compact-light (heller Grund, kein dunkler Block)', () => {
  assert.equal(referenceEventsVariant(1), 'compact-light')
})

test('referenceEventsVariant: 2 Referenzen -> stage-island', () => {
  assert.equal(referenceEventsVariant(2), 'stage-island')
})

test('referenceEventsVariant: viele Referenzen bleiben stage-island (alle sichtbar, keine Pagination)', () => {
  assert.equal(referenceEventsVariant(7), 'stage-island')
  assert.equal(referenceEventsVariant(20), 'stage-island')
})
