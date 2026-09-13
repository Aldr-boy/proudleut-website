import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isFollowerCountVisible,
  resolveFollowerStandDisplay,
  FOLLOWER_COUNT_MAX_AGE_MONTHS,
} from './followerCountVisibility.ts'

const NOW = new Date('2026-05-17T12:00:00.000Z')

test('Konstante: Gueltigkeitsdauer betraegt 12 Kalendermonate', () => {
  assert.equal(FOLLOWER_COUNT_MAX_AGE_MONTHS, 12)
})

test('gueltige Zahl mit aktuellem Datum -> sichtbar', () => {
  assert.equal(isFollowerCountVisible(5173, '2026-05-01T00:00:00.000Z', NOW), true)
})

test('Nullwert -> nicht sichtbar', () => {
  assert.equal(isFollowerCountVisible(0, '2026-05-01T00:00:00.000Z', NOW), false)
})

test('negative Zahl -> nicht sichtbar', () => {
  assert.equal(isFollowerCountVisible(-5, '2026-05-01T00:00:00.000Z', NOW), false)
})

test('keine ganze Zahl -> nicht sichtbar', () => {
  assert.equal(isFollowerCountVisible(5.5, '2026-05-01T00:00:00.000Z', NOW), false)
})

test('fehlende Zahl (null/undefined) -> nicht sichtbar', () => {
  assert.equal(isFollowerCountVisible(null, '2026-05-01T00:00:00.000Z', NOW), false)
  assert.equal(isFollowerCountVisible(undefined, '2026-05-01T00:00:00.000Z', NOW), false)
})

test('fehlendes Pruefdatum -> nicht sichtbar, auch bei gueltiger Zahl', () => {
  assert.equal(isFollowerCountVisible(100, null, NOW), false)
  assert.equal(isFollowerCountVisible(100, undefined, NOW), false)
})

test('ungueltiges Pruefdatum (kein parsbares Datum) -> nicht sichtbar', () => {
  assert.equal(isFollowerCountVisible(100, 'nicht-ein-datum', NOW), false)
})

test('zukuenftiges Pruefdatum -> nicht sichtbar', () => {
  assert.equal(isFollowerCountVisible(100, '2026-05-18T00:00:00.000Z', NOW), false)
})

test('genau 12 Kalendermonate alt -> noch sichtbar (Stichtag inklusive)', () => {
  const exactly12MonthsAgo = '2025-05-17T12:00:00.000Z'
  assert.equal(isFollowerCountVisible(100, exactly12MonthsAgo, NOW), true)
})

test('unmittelbar aelter als 12 Kalendermonate -> nicht mehr sichtbar', () => {
  const justOverAYearAgo = '2025-05-17T11:59:59.000Z'
  assert.equal(isFollowerCountVisible(100, justOverAYearAgo, NOW), false)
})

test('resolveFollowerStandDisplay: keine sichtbaren Metriken -> none', () => {
  assert.deepEqual(resolveFollowerStandDisplay([]), { kind: 'none' })
})

test('resolveFollowerStandDisplay: eine Metrik -> shared (trivial derselbe Tag)', () => {
  assert.deepEqual(resolveFollowerStandDisplay([{ checkedAt: '2026-05-17T00:00:00.000Z' }]), {
    kind: 'shared',
    checkedAt: '2026-05-17T00:00:00.000Z',
  })
})

test('resolveFollowerStandDisplay: mehrere Metriken mit demselben Kalendertag -> shared', () => {
  const result = resolveFollowerStandDisplay([
    { checkedAt: '2026-05-17T00:00:00.000Z' },
    { checkedAt: '2026-05-17T00:00:00.000Z' },
    { checkedAt: '2026-05-17T00:00:00.000Z' },
  ])
  assert.deepEqual(result, { kind: 'shared', checkedAt: '2026-05-17T00:00:00.000Z' })
})

test('resolveFollowerStandDisplay: unterschiedliche Tage -> per_platform', () => {
  const result = resolveFollowerStandDisplay([
    { checkedAt: '2026-05-17T00:00:00.000Z' },
    { checkedAt: '2026-05-18T00:00:00.000Z' },
  ])
  assert.deepEqual(result, { kind: 'per_platform' })
})

test('resolveFollowerStandDisplay: derselbe Monat, aber unterschiedliche Tage -> per_platform (kein Ableiten allein aus dem Monat)', () => {
  const result = resolveFollowerStandDisplay([
    { checkedAt: '2026-05-01T00:00:00.000Z' },
    { checkedAt: '2026-05-31T00:00:00.000Z' },
  ])
  assert.deepEqual(result, { kind: 'per_platform' })
})
