import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSocialLinkWrite, type ExistingSocialProfileRow } from './resolveSocialLinkWrite.ts'

function row(overrides: Partial<ExistingSocialProfileRow> = {}): ExistingSocialProfileRow {
  return {
    id: 'row-1',
    url: 'https://instagram.com/example',
    current_followers: null,
    current_following: null,
    last_checked_at: null,
    ...overrides,
  }
}

test('keine bestehende Zeile, leeres Feld -> noop', () => {
  assert.deepEqual(resolveSocialLinkWrite([], null), { action: 'noop' })
})

test('keine bestehende Zeile, Wert eingegeben -> insert', () => {
  assert.deepEqual(resolveSocialLinkWrite([], 'https://spotify.com/artist/example'), {
    action: 'insert',
    url: 'https://spotify.com/artist/example',
  })
})

test('bestehende Zeile, unveraenderter Wert -> noop (kein Write)', () => {
  const existing = row({ url: 'https://instagram.com/example' })
  assert.deepEqual(resolveSocialLinkWrite([existing], 'https://instagram.com/example'), { action: 'noop' })
})

test('bestehende Zeile, geaenderter Wert -> update nur der url, Zeile bleibt erhalten', () => {
  const existing = row({ id: 'ig-row', url: 'https://instagram.com/old', current_followers: 1200 })
  const decision = resolveSocialLinkWrite([existing], 'https://instagram.com/new')
  assert.deepEqual(decision, { action: 'update', rowId: 'ig-row', url: 'https://instagram.com/new' })
})

test('bestehende Zeile ohne Metadaten, geleert -> delete', () => {
  const existing = row({ id: 'empty-meta-row', current_followers: null, current_following: null, last_checked_at: null })
  assert.deepEqual(resolveSocialLinkWrite([existing], null), { action: 'delete', rowId: 'empty-meta-row' })
})

test('bestehende Zeile mit current_followers, geleert -> blocked_has_metadata (nicht loeschen)', () => {
  const existing = row({ id: 'has-followers', current_followers: 500 })
  assert.deepEqual(resolveSocialLinkWrite([existing], null), { action: 'blocked_has_metadata', rowId: 'has-followers' })
})

test('bestehende Zeile mit current_following, geleert -> blocked_has_metadata', () => {
  const existing = row({ id: 'has-following', current_following: 10 })
  assert.deepEqual(resolveSocialLinkWrite([existing], null), { action: 'blocked_has_metadata', rowId: 'has-following' })
})

test('bestehende Zeile mit last_checked_at, geleert -> blocked_has_metadata', () => {
  const existing = row({ id: 'has-checked-at', last_checked_at: '2025-12-04T12:00:00Z' })
  assert.deepEqual(resolveSocialLinkWrite([existing], null), { action: 'blocked_has_metadata', rowId: 'has-checked-at' })
})

test('mehrere Zeilen fuer dieselbe Plattform (Duplikat) -> skip_duplicate, unabhaengig vom eingegebenen Wert', () => {
  const duplicates = [row({ id: 'dup-1' }), row({ id: 'dup-2' })]
  assert.deepEqual(resolveSocialLinkWrite(duplicates, 'https://instagram.com/changed'), { action: 'skip_duplicate' })
  assert.deepEqual(resolveSocialLinkWrite(duplicates, null), { action: 'skip_duplicate' })
})

test('drei oder mehr Duplikat-Zeilen werden ebenfalls als skip_duplicate erkannt', () => {
  const duplicates = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })]
  assert.deepEqual(resolveSocialLinkWrite(duplicates, 'https://instagram.com/x'), { action: 'skip_duplicate' })
})
