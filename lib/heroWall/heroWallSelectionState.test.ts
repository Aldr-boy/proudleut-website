import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isBelowRecommendedMinimum,
  isInMobilePool,
  heroWallSelectionsAreEqual,
  HERO_WALL_MIN_RECOMMENDED,
  HERO_WALL_MOBILE_POOL_SIZE,
} from './heroWallSelectionState.ts'

test('Schwellenwerte entsprechen der Spec (Mindestens 10, Mobile-Pool 16)', () => {
  assert.equal(HERO_WALL_MIN_RECOMMENDED, 10)
  assert.equal(HERO_WALL_MOBILE_POOL_SIZE, 16)
})

test('isBelowRecommendedMinimum: Warnung bei weniger als 10 ausgewaehlten Bildern', () => {
  assert.equal(isBelowRecommendedMinimum(0), true)
  assert.equal(isBelowRecommendedMinimum(9), true)
  assert.equal(isBelowRecommendedMinimum(10), false)
  assert.equal(isBelowRecommendedMinimum(17), false)
})

test('isInMobilePool: genau die ersten 16 Positionen (0-basiert) gelten als mobiler Pool', () => {
  assert.equal(isInMobilePool(0), true)
  assert.equal(isInMobilePool(15), true)
  assert.equal(isInMobilePool(16), false)
  assert.equal(isInMobilePool(39), false)
})

test('heroWallSelectionsAreEqual: identische Reihenfolge und Fokus -> true', () => {
  const a = [{ id: '1', heroFocus: 'center' as const }, { id: '2', heroFocus: 'top' as const }]
  const b = [{ id: '1', heroFocus: 'center' as const }, { id: '2', heroFocus: 'top' as const }]
  assert.equal(heroWallSelectionsAreEqual(a, b), true)
})

test('heroWallSelectionsAreEqual: unterschiedliche Reihenfolge -> false (Position ist fachlich relevant)', () => {
  const a = [{ id: '1', heroFocus: 'center' as const }, { id: '2', heroFocus: 'center' as const }]
  const b = [{ id: '2', heroFocus: 'center' as const }, { id: '1', heroFocus: 'center' as const }]
  assert.equal(heroWallSelectionsAreEqual(a, b), false)
})

test('heroWallSelectionsAreEqual: unterschiedlicher hero_focus bei sonst gleicher Reihenfolge -> false', () => {
  const a = [{ id: '1', heroFocus: 'center' as const }]
  const b = [{ id: '1', heroFocus: 'top' as const }]
  assert.equal(heroWallSelectionsAreEqual(a, b), false)
})

test('heroWallSelectionsAreEqual: unterschiedliche Laenge -> false', () => {
  const a = [{ id: '1', heroFocus: 'center' as const }]
  const b = [{ id: '1', heroFocus: 'center' as const }, { id: '2', heroFocus: 'center' as const }]
  assert.equal(heroWallSelectionsAreEqual(a, b), false)
})

test('heroWallSelectionsAreEqual: zwei leere Auswahllisten -> true', () => {
  assert.equal(heroWallSelectionsAreEqual([], []), true)
})
