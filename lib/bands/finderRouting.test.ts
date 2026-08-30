import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildFinderFilterUrl, buildOccasionNavUrl } from './finderRouting.ts'

const NO_FILTERS = { region: null, suche: '', bandtyp: null, mood: null }

test('buildFinderFilterUrl: Basisroute ohne Filter bleibt unveraendert', () => {
  assert.equal(buildFinderFilterUrl('/veranstaltung/hochzeit', NO_FILTERS), '/veranstaltung/hochzeit')
  assert.equal(buildFinderFilterUrl('/bands', NO_FILTERS), '/bands')
})

test('buildFinderFilterUrl: uebrige Filter werden als Query-Params an die gegebene Basisroute angehaengt, kein anlass-Param', () => {
  const url = buildFinderFilterUrl('/veranstaltung/hochzeit', {
    region: 'Oberpfalz',
    suche: '',
    bandtyp: null,
    mood: 'emotional',
  })
  assert.equal(url, '/veranstaltung/hochzeit?region=oberpfalz&mood=emotional')
  assert.ok(!url.includes('anlass='), 'URL-Basis auf Veranstaltungsseite darf keinen anlass-Param enthalten')
})

test('buildOccasionNavUrl: Anlass MIT bestehender Landingpage navigiert zu /veranstaltung/<slug>, Filter bleiben erhalten', () => {
  const url = buildOccasionNavUrl('firmenfeier', { region: 'Oberpfalz', suche: '', bandtyp: null, mood: 'emotional' })
  assert.equal(url, '/veranstaltung/firmenfeier?region=oberpfalz&mood=emotional')
})

test('buildOccasionNavUrl: Anlass OHNE Landingpage navigiert zu /bands?anlass=<slug>, Filter bleiben erhalten', () => {
  const url = buildOccasionNavUrl('brautentfuehrung', { region: 'Oberpfalz', suche: '', bandtyp: null, mood: 'emotional' })
  assert.equal(url, '/bands?anlass=brautentfuehrung&region=oberpfalz&mood=emotional')
})

test('buildOccasionNavUrl: weiterer Finder-only-Anlass (stadt-und-buergerfest) navigiert ebenfalls zu /bands?anlass=...', () => {
  const url = buildOccasionNavUrl('stadt-und-buergerfest', NO_FILTERS)
  assert.equal(url, '/bands?anlass=stadt-und-buergerfest')
})

test('"Alle Anlaesse" (buildFinderFilterUrl mit Basisroute /bands) enthaelt keinen anlass-Param, Filter bleiben erhalten', () => {
  const url = buildFinderFilterUrl('/bands', { region: 'Oberpfalz', suche: '', bandtyp: null, mood: 'emotional' })
  assert.equal(url, '/bands?region=oberpfalz&mood=emotional')
  assert.ok(!url.includes('anlass='))
})

test('buildFinderFilterUrl: suche wird nicht lowercased, region/bandtyp werden lowercased', () => {
  const url = buildFinderFilterUrl('/veranstaltung/hochzeit', {
    region: 'Oberpfalz',
    suche: 'München',
    bandtyp: 'Partyband',
    mood: null,
  })
  assert.equal(url, '/veranstaltung/hochzeit?region=oberpfalz&suche=M%C3%BCnchen&bandtyp=partyband')
})
