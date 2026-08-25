import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractUuidFromDetail } from './extractIdFromDetail.ts'

test('extrahiert eine UUID aus einem band_id=-Detail', () => {
  const detail = 'band_id=884a2d54-d652-472a-8dbb-2e57de04695d not found'
  assert.equal(extractUuidFromDetail(detail), '884a2d54-d652-472a-8dbb-2e57de04695d')
})

test('extrahiert eine UUID mit vorangestelltem Kontext (Bulk-RPC-Format "band_id=<uuid>: ...")', () => {
  const detail = 'band_id=34934ebb-d7a0-4a9d-980c-45bfc716d870: 5 moods submitted, maximum 4 allowed'
  assert.equal(extractUuidFromDetail(detail), '34934ebb-d7a0-4a9d-980c-45bfc716d870')
})

test('null/undefined ergibt null', () => {
  assert.equal(extractUuidFromDetail(null), null)
  assert.equal(extractUuidFromDetail(undefined), null)
})

test('Detail ohne UUID ergibt null', () => {
  assert.equal(extractUuidFromDetail('5 moods submitted, maximum 4 allowed'), null)
})
