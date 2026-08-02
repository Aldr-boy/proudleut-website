import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMoodSlugParam, bandMatchesMood } from './bandMoodFilter.ts'

test('resolveMoodSlugParam: bekannter Slug wird uebernommen', () => {
  assert.equal(
    resolveMoodSlugParam('tanzflaechen-garantie', ['tanzflaechen-garantie', 'party-pur']),
    'tanzflaechen-garantie'
  )
})

test('resolveMoodSlugParam: fehlender Parameter (null) ergibt null -- kein Filter aktiv', () => {
  assert.equal(resolveMoodSlugParam(null, ['tanzflaechen-garantie']), null)
})

test('resolveMoodSlugParam: leerer String ergibt null', () => {
  assert.equal(resolveMoodSlugParam('', ['tanzflaechen-garantie']), null)
})

test('resolveMoodSlugParam: unbekannter Slug ergibt null -- kein Crash, keine irrefuehrende Auswahl', () => {
  assert.equal(resolveMoodSlugParam('nicht-vorhanden', ['tanzflaechen-garantie', 'party-pur']), null)
})

test('resolveMoodSlugParam: leere bekannte Slug-Liste (z. B. Bands noch nicht geladen) crasht nicht', () => {
  assert.equal(resolveMoodSlugParam('tanzflaechen-garantie', []), null)
})

test('bandMatchesMood: ohne Auswahl (null) lassen alle Baender den Filter passieren', () => {
  assert.equal(bandMatchesMood([], null), true)
  assert.equal(bandMatchesMood([{ slug: 'party-pur' }], null), true)
})

test('bandMatchesMood: mit Auswahl nur Baender mit passendem Slug', () => {
  const bandMoods = [{ slug: 'party-pur' }, { slug: 'tanzflaechen-garantie' }]
  assert.equal(bandMatchesMood(bandMoods, 'tanzflaechen-garantie'), true)
  assert.equal(bandMatchesMood(bandMoods, 'generationenverbindend'), false)
})

test('bandMatchesMood: Band ohne Mood-Zuordnungen matcht nie eine Auswahl', () => {
  assert.equal(bandMatchesMood([], 'tanzflaechen-garantie'), false)
})
