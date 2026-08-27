import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveInstrumentSelection,
  assignInstrumentSortOrders,
  diffInstrumentAssignments,
} from './instrumentAssignment.ts'

const BASS = 'b0000000-0000-0000-0000-000000000001'
const TUBA = 'b0000000-0000-0000-0000-000000000002'
const POSAUNE = 'b0000000-0000-0000-0000-000000000003'
const UNKNOWN = 'b0000000-0000-0000-0000-000000000099'

const CATALOG = [
  { id: BASS, sort_order: 10 },
  { id: TUBA, sort_order: 20 },
  { id: POSAUNE, sort_order: 30 },
]

test('resolveInstrumentSelection: zwei gueltige Instrumente gleichzeitig speicherbar, sortiert nach Katalog-sort_order', () => {
  const result = resolveInstrumentSelection([POSAUNE, BASS], CATALOG)
  assert.deepEqual(result, { ok: true, instrumentIds: [BASS, POSAUNE] })
})

test('resolveInstrumentSelection: alle drei V1-Instrumente gleichzeitig speicherbar', () => {
  const result = resolveInstrumentSelection([TUBA, POSAUNE, BASS], CATALOG)
  assert.deepEqual(result, { ok: true, instrumentIds: [BASS, TUBA, POSAUNE] })
})

test('resolveInstrumentSelection: leere Auswahl ist gueltig (kein Instrument gepflegt)', () => {
  assert.deepEqual(resolveInstrumentSelection([], CATALOG), { ok: true, instrumentIds: [] })
})

test('resolveInstrumentSelection: unbekannte/inaktive Instrument-ID wird abgelehnt', () => {
  const result = resolveInstrumentSelection([BASS, UNKNOWN], CATALOG)
  assert.deepEqual(result, { ok: false, reason: 'unknown_or_inactive' })
})

test('resolveInstrumentSelection: doppelte ID in der Auswahl wird abgelehnt', () => {
  const result = resolveInstrumentSelection([BASS, BASS], CATALOG)
  assert.deepEqual(result, { ok: false, reason: 'duplicate' })
})

test('assignInstrumentSortOrders: fortlaufende sort_order ab 0 in Eingabereihenfolge', () => {
  assert.deepEqual(assignInstrumentSortOrders([BASS, POSAUNE]), [
    { instrument_id: BASS, sort_order: 0 },
    { instrument_id: POSAUNE, sort_order: 1 },
  ])
})

test('diffInstrumentAssignments: Instrument entfernen -- Join verschwindet, Rest bleibt', () => {
  const result = diffInstrumentAssignments([BASS, POSAUNE], [BASS])
  assert.deepEqual(result, { toAdd: [], toRemove: [POSAUNE] })
})

test('diffInstrumentAssignments: neues Instrument hinzufuegen', () => {
  const result = diffInstrumentAssignments([BASS], [BASS, TUBA])
  assert.deepEqual(result, { toAdd: [TUBA], toRemove: [] })
})

test('diffInstrumentAssignments: identische Auswahl -> keine Aenderung', () => {
  const result = diffInstrumentAssignments([BASS, TUBA], [TUBA, BASS])
  assert.deepEqual(result, { toAdd: [], toRemove: [] })
})
