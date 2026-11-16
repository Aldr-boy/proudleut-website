import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildFinderFilterUrl, buildOccasionNavUrl, resolveAnlassRedirect } from './finderRouting.ts'

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

test('buildOccasionNavUrl: Trauung hat bewusst keine eigene /veranstaltung/trauung-Landingpage -- ein Anlasswechsel von der gesperrten Hochzeits-Veranstaltungsseite navigiert zu /bands?anlass=trauung, nicht zu weiterhin nur Hochzeitsbands', () => {
  const url = buildOccasionNavUrl('trauung', { region: 'Oberpfalz', suche: '', bandtyp: null, mood: 'emotional' })
  assert.equal(url, '/bands?anlass=trauung&region=oberpfalz&mood=emotional')
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

test('resolveAnlassRedirect: Anlass mit Anlassseite -> /veranstaltung/<anlass>, uebrige Filter bleiben, anlass-Param entfaellt', () => {
  assert.equal(resolveAnlassRedirect(new URLSearchParams('anlass=hochzeit')), '/veranstaltung/hochzeit')
  assert.equal(
    resolveAnlassRedirect(new URLSearchParams('anlass=weihnachtsfeier&region=oberpfalz&suche=M%C3%BCnchen&bandtyp=partyband&mood=emotional')),
    '/veranstaltung/weihnachtsfeier?region=oberpfalz&suche=M%C3%BCnchen&bandtyp=partyband&mood=emotional',
  )
})

test('resolveAnlassRedirect: Anlaesse ohne Anlassseite, unbekannte Werte und fehlender anlass-Param -> kein Redirect', () => {
  assert.equal(resolveAnlassRedirect(new URLSearchParams('anlass=trauung&region=oberpfalz')), null)
  assert.equal(resolveAnlassRedirect(new URLSearchParams('anlass=stadt-und-buergerfest')), null)
  assert.equal(resolveAnlassRedirect(new URLSearchParams('anlass=konzert-club-festival')), null)
  assert.equal(resolveAnlassRedirect(new URLSearchParams('anlass=gibtsnicht')), null)
  assert.equal(resolveAnlassRedirect(new URLSearchParams('region=oberpfalz')), null)
})

test('Umkreis: wird bei Navigation zu Anlassseite und zu /bands als umkreis-Param mitgegeben, ohne Umkreis (0/null/fehlt) kein Param', () => {
  const f = { region: null, suche: '84028', bandtyp: null, mood: null }
  assert.equal(buildOccasionNavUrl('hochzeit', { ...f, umkreis: 50 }), '/veranstaltung/hochzeit?suche=84028&umkreis=50')
  assert.equal(buildOccasionNavUrl('trauung', { ...f, umkreis: 25 }), '/bands?anlass=trauung&suche=84028&umkreis=25')
  assert.equal(buildFinderFilterUrl('/bands', { ...f, umkreis: 100 }), '/bands?suche=84028&umkreis=100')
  assert.equal(buildOccasionNavUrl('hochzeit', { ...f, umkreis: 0 }), '/veranstaltung/hochzeit?suche=84028')
  assert.equal(buildOccasionNavUrl('hochzeit', f), '/veranstaltung/hochzeit?suche=84028')
})

test('resolveAnlassRedirect: umkreis-Param bleibt bei der Weiterleitung erhalten', () => {
  assert.equal(
    resolveAnlassRedirect(new URLSearchParams('anlass=gala&suche=84028&umkreis=50')),
    '/veranstaltung/gala?suche=84028&umkreis=50',
  )
})
