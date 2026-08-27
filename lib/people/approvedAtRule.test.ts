import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canPublish, canArchive } from './approvedAtRule.ts'

test('canPublish: draft -> true (Publish setzt approved_at neu)', () => {
  assert.equal(canPublish('draft'), true)
})

test('canPublish: archived -> true (Republish setzt approved_at neu)', () => {
  assert.equal(canPublish('archived'), true)
})

test('canPublish: active -> false (bereits aktiv, nichts zu veroeffentlichen)', () => {
  assert.equal(canPublish('active'), false)
})

test('canArchive: active -> true', () => {
  assert.equal(canArchive('active'), true)
})

test('canArchive: draft -> false', () => {
  assert.equal(canArchive('draft'), false)
})

test('canArchive: archived -> false (bereits archiviert)', () => {
  assert.equal(canArchive('archived'), false)
})
