import { test } from 'node:test'
import assert from 'node:assert/strict'
import { referenceEventsVariant } from './bandReferenceEventsLayout.ts'

test('referenceEventsVariant: 0 Referenzen -> none (Section entfaellt vollstaendig)', () => {
  assert.equal(referenceEventsVariant(0), 'none')
})

test('referenceEventsVariant: genau 1 Referenz -> compact-light (heller Grund, kein dunkler Block)', () => {
  assert.equal(referenceEventsVariant(1), 'compact-light')
})

test('referenceEventsVariant: 2 Referenzen -> list-light (helle Liste, Redesign: keine dunkle Buehnen-Insel mehr -- siehe Abschnitt 8)', () => {
  assert.equal(referenceEventsVariant(2), 'list-light')
})

test('referenceEventsVariant: viele Referenzen bleiben list-light (alle sichtbar, keine Pagination)', () => {
  assert.equal(referenceEventsVariant(7), 'list-light')
  assert.equal(referenceEventsVariant(20), 'list-light')
})
