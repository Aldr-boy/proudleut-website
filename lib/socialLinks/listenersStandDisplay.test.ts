import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowOwnListenersStand } from './listenersStandDisplay.ts'
import { resolveFollowerStandDisplay } from './followerCountVisibility.ts'

const SEP_26 = '2026-09-26T00:00:00.000Z'

test('gemeinsamer Stand im selben Monat -> kein eigenes Spotify-Datum (keine Doppelung)', () => {
  assert.equal(
    shouldShowOwnListenersStand(SEP_26, { kind: 'shared', checkedAt: '2026-09-01T00:00:00.000Z' }),
    false,
  )
})

test('gemeinsamer Stand in anderem Monat desselben Jahres -> eigenes Datum', () => {
  assert.equal(
    shouldShowOwnListenersStand(SEP_26, { kind: 'shared', checkedAt: '2026-08-31T00:00:00.000Z' }),
    true,
  )
})

test('gleicher Monat, anderes Jahr -> eigenes Datum', () => {
  assert.equal(
    shouldShowOwnListenersStand(SEP_26, { kind: 'shared', checkedAt: '2025-09-26T00:00:00.000Z' }),
    true,
  )
})

test('kein gemeinsamer Stand (keine sichtbaren Follower-Zahlen) -> eigenes Datum bleibt sichtbar', () => {
  assert.equal(shouldShowOwnListenersStand(SEP_26, { kind: 'none' }), true)
})

test('je Plattform eigene Daten (per_platform) -> eigenes Datum bleibt sichtbar', () => {
  assert.equal(shouldShowOwnListenersStand(SEP_26, { kind: 'per_platform' }), true)
})

test('Monatsgrenze wird in UTC verglichen (wie die UTC-Formatierung im Renderort)', () => {
  // 30.09. 23:59 UTC ist noch September, 01.10. 00:00 UTC schon Oktober.
  assert.equal(
    shouldShowOwnListenersStand('2026-09-30T23:59:59.000Z', { kind: 'shared', checkedAt: '2026-09-01T00:00:00.000Z' }),
    false,
  )
  assert.equal(
    shouldShowOwnListenersStand('2026-10-01T00:00:00.000Z', { kind: 'shared', checkedAt: '2026-09-01T00:00:00.000Z' }),
    true,
  )
})

test('zusammen mit resolveFollowerStandDisplay: Follower am selben Tag, Spotify im selben Monat -> ausgeblendet; Spotify ohne Follower -> sichtbar', () => {
  const shared = resolveFollowerStandDisplay([
    { checkedAt: '2026-09-05T00:00:00.000Z' },
    { checkedAt: '2026-09-05T00:00:00.000Z' },
  ])
  assert.equal(shouldShowOwnListenersStand(SEP_26, shared), false)
  assert.equal(shouldShowOwnListenersStand(SEP_26, resolveFollowerStandDisplay([])), true)
})
