import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findCategoryForEventTypeSlug } from './bandTagsCategoryMatch.ts'
import { CATEGORIES } from '../../lib/categories.ts'

// ── Korrekturpaket "Spielt bei"-Chip-Verlinkung ──────────────────────
// Regressionsauftrag: findCategoryForEventTypeSlug darf ausschliesslich
// ueber CATEGORIES[].supabaseEventTypeSlugs zuordnen -- niemals ueber
// Namensvergleich, identische Slugs oder sonstige Heuristik.

test('findCategoryForEventTypeSlug: eindeutig gemappter Event-Type-Slug liefert die zugehoerige Kategorie', () => {
  const category = findCategoryForEventTypeSlug('firmenfeier-business-event')
  assert.equal(category?.slug, 'firmenfeier')
})

test('findCategoryForEventTypeSlug: weiterer eindeutig gemappter Fall (Festzelt-Gruppe)', () => {
  assert.equal(findCategoryForEventTypeSlug('stadt-und-buergerfest')?.slug, 'festzelt')
})

test('findCategoryForEventTypeSlug: Event-Type-Slug ohne Kategorie-Zuordnung liefert undefined', () => {
  assert.equal(findCategoryForEventTypeSlug('konzert'), undefined)
})

test('findCategoryForEventTypeSlug: Regression "gala" -- Namensgleichheit mit dem Kategorie-Slug "gala" darf NICHT allein zum Link fuehren', () => {
  // Production-Event-Type-Slug "gala" ist bewusst NICHT in
  // CATEGORIES.find(c => c.slug === 'gala').supabaseEventTypeSlugs enthalten.
  const galaCategory = CATEGORIES.find((c) => c.slug === 'gala')
  assert.ok(galaCategory, 'Voraussetzung: Kategorie mit slug "gala" existiert weiterhin')
  assert.ok(
    !galaCategory!.supabaseEventTypeSlugs?.includes('gala'),
    'Voraussetzung: "gala" ist nicht in der Gala-Kategorie eigener supabaseEventTypeSlugs-Liste enthalten'
  )
  assert.equal(findCategoryForEventTypeSlug('gala'), undefined)
})

test('findCategoryForEventTypeSlug: verwendet ausschliesslich supabaseEventTypeSlugs, kein Namens-/Slug-Vergleich mit category.slug', () => {
  // "hochzeit" ist sowohl Event-Type-Slug als auch Kategorie-Slug UND in
  // supabaseEventTypeSlugs enthalten -- funktioniert hier also aus dem
  // richtigen Grund (explizite Zuordnung), nicht zufaellig durch
  // Namensgleichheit.
  const category = findCategoryForEventTypeSlug('hochzeit')
  assert.equal(category?.slug, 'hochzeit')
  const hochzeitCategory = CATEGORIES.find((c) => c.slug === 'hochzeit')
  assert.ok(hochzeitCategory!.supabaseEventTypeSlugs?.includes('hochzeit'))
})

test('findCategoryForEventTypeSlug: unbekannter/nicht existierender Slug liefert undefined, kein Crash', () => {
  assert.equal(findCategoryForEventTypeSlug('dieser-slug-existiert-nicht'), undefined)
})
