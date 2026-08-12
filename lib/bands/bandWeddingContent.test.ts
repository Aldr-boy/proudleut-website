import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasWeddingContent } from './bandWeddingContent.ts'

// Auftrag 5 "Fehlende Module": ohne Hochzeit -- BandWeddingModule entfaellt
// komplett, kein leeres Loch.

test('hasWeddingContent: Band mit "Hochzeit" unter den Event-Types -> true', () => {
  assert.equal(hasWeddingContent({ eventTypes: ['Hochzeit', 'Festzelt'] }), true)
})

test('hasWeddingContent: Vergleich ist case-insensitiv und trimmt', () => {
  assert.equal(hasWeddingContent({ eventTypes: ['  HOCHZEIT  '] }), true)
})

test('hasWeddingContent: Band ohne Hochzeit unter den Event-Types -> false', () => {
  assert.equal(hasWeddingContent({ eventTypes: ['Festzelt', 'Firmenfeier'] }), false)
})

test('hasWeddingContent: leere Event-Types -> false, kein Crash', () => {
  assert.equal(hasWeddingContent({ eventTypes: [] }), false)
})
