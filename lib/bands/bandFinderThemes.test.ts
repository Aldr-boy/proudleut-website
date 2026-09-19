import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BAND_FINDER_THEMES,
  resolveBandFinderThemeNav,
  resolveThemeTileActive,
  reduceTilePendingKey,
} from './bandFinderThemes.ts'
import { buildFinderFilterUrl, buildOccasionNavUrl } from './finderRouting.ts'

// Auftrag "Bandfinder-Redesign": echte Ausfuehrungstests fuer die reine
// Href-/Aktiv-Logik der sechs Themen-Kacheln, gegen die tatsaechlichen
// (nicht gemockten) buildFinderFilterUrl()/buildOccasionNavUrl().

const NO_FILTER = { region: null, suche: '', bandtyp: null, mood: null }

test('BAND_FINDER_THEMES enthaelt genau die sechs geforderten Einstiege in Reihenfolge', () => {
  assert.deepEqual(
    BAND_FINDER_THEMES.map((t) => t.key),
    ['alle', 'hochzeit', 'festzelt', 'firmenfeier', 'stadt-und-buergerfest', 'konzert-club-festival']
  )
  assert.deepEqual(
    BAND_FINDER_THEMES.map((t) => t.label),
    ['Alle Bands', 'Hochzeit', 'Festzelt', 'Firmenfeier', 'Stadt- & Bürgerfest', 'Konzert, Club & Festival']
  )
})

test('/bands ohne Anlassfilter: "Alle Bands" aktiv, alle anderen inaktiv', () => {
  const nav = resolveBandFinderThemeNav(undefined, null, NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  const byKey = Object.fromEntries(nav.map((t) => [t.key, t]))
  assert.equal(byKey.alle.active, true)
  assert.equal(byKey.hochzeit.active, false)
  assert.equal(byKey.festzelt.active, false)
  assert.equal(byKey.firmenfeier.active, false)
  assert.equal(byKey['stadt-und-buergerfest'].active, false)
  assert.equal(byKey['konzert-club-festival'].active, false)
})

test('/bands mit anlass=hochzeit: Hochzeit aktiv, Alle Bands inaktiv', () => {
  const nav = resolveBandFinderThemeNav(undefined, 'hochzeit', NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  const byKey = Object.fromEntries(nav.map((t) => [t.key, t]))
  assert.equal(byKey.hochzeit.active, true)
  assert.equal(byKey.alle.active, false)
})

test('Themenseite mit lockedOccasion=festzelt: Festzelt aktiv', () => {
  const nav = resolveBandFinderThemeNav('festzelt', 'festzelt', NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  const byKey = Object.fromEntries(nav.map((t) => [t.key, t]))
  assert.equal(byKey.festzelt.active, true)
  assert.equal(byKey.alle.active, false)
})

test('anderer Anlass ohne eigenen Themenkasten (z. B. geburtstag): keiner der sechs Einstiege aktiv', () => {
  const nav = resolveBandFinderThemeNav('geburtstag', 'geburtstag', NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  assert.ok(nav.every((t) => t.active === false))
})

test('Href "Alle Bands": /bands ohne anlass-Param, uebrige Filter bleiben erhalten', () => {
  const nav = resolveBandFinderThemeNav(
    undefined,
    'hochzeit',
    { region: 'Oberbayern', suche: 'Test', bandtyp: 'Partyband', mood: 'mitsing-faktor' },
    buildFinderFilterUrl,
    buildOccasionNavUrl
  )
  const alle = nav.find((t) => t.key === 'alle')!
  assert.equal(alle.href, '/bands?region=oberbayern&suche=Test&bandtyp=partyband&mood=mitsing-faktor')
  assert.ok(!alle.href.includes('anlass='))
})

test('Href Hochzeit: navigiert zur bestehenden /veranstaltung/hochzeit-Landingpage (echte CATEGORIES-Route)', () => {
  const nav = resolveBandFinderThemeNav(undefined, null, NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  const hochzeit = nav.find((t) => t.key === 'hochzeit')!
  assert.equal(hochzeit.href, '/veranstaltung/hochzeit')
})

test('Href Stadt- & Buergerfest: keine eigene Landingpage -> /bands?anlass=stadt-und-buergerfest', () => {
  const nav = resolveBandFinderThemeNav(undefined, null, NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  const stadtfest = nav.find((t) => t.key === 'stadt-und-buergerfest')!
  assert.equal(stadtfest.href, '/bands?anlass=stadt-und-buergerfest')
})

test('Href Konzert, Club & Festival: keine eigene Landingpage -> /bands?anlass=konzert-club-festival, bestehende Filter bleiben erhalten', () => {
  const nav = resolveBandFinderThemeNav(
    undefined,
    null,
    { region: 'Schwaben', suche: '', bandtyp: null, mood: null },
    buildFinderFilterUrl,
    buildOccasionNavUrl
  )
  const item = nav.find((t) => t.key === 'konzert-club-festival')!
  assert.equal(item.href, '/bands?anlass=konzert-club-festival&region=schwaben')
})

test('Klick auf ein anderes Thema im Veranstaltungsseiten-Kontext navigiert zur Ziel-Landingpage (bestehende R1-Regel), nicht zur aktuellen Route', () => {
  const nav = resolveBandFinderThemeNav('hochzeit', 'hochzeit', NO_FILTER, buildFinderFilterUrl, buildOccasionNavUrl)
  const festzelt = nav.find((t) => t.key === 'festzelt')!
  assert.equal(festzelt.href, '/veranstaltung/festzelt')
})

// Auftrag "Klick-/Aktivzustand im Bandfinder": resolveThemeTileActive()
// kombiniert theme.active (fachliche Wahrheit, s.o.) mit dem
// clientseitigen pendingTileKey (aus useLinkStatus() der geklickten
// Kachel) fuer sofortiges visuelles Feedback, ohne auf Navigation/
// Server-Datenladen zu warten.

test('resolveThemeTileActive: ohne pendingTileKey (null) gilt unveraendert theme.active', () => {
  assert.equal(resolveThemeTileActive(null, 'hochzeit', true), true)
  assert.equal(resolveThemeTileActive(null, 'hochzeit', false), false)
})

test('resolveThemeTileActive: waehrend Pending gewinnt ausschliesslich die geklickte Kachel, auch wenn eine ANDERE Kachel noch theme.active=true traegt (URL noch nicht aktualisiert)', () => {
  // Bisher aktive Kachel "hochzeit" (theme.active=true), aber "festzelt"
  // wurde geklickt (pendingTileKey='festzelt') -- "hochzeit" muss JETZT
  // false liefern, "festzelt" true. Nie zwei Kacheln gleichzeitig aktiv.
  assert.equal(resolveThemeTileActive('festzelt', 'hochzeit', true), false)
  assert.equal(resolveThemeTileActive('festzelt', 'festzelt', false), true)
})

test('resolveThemeTileActive: Klick auf die bereits aktive Kachel bleibt durchgehend aktiv (kein sichtbarer Zustandswechsel)', () => {
  assert.equal(resolveThemeTileActive('hochzeit', 'hochzeit', true), true)
})

test('reduceTilePendingKey: eine als pending gemeldete Kachel wird sofort zur neuen pendingTileKey', () => {
  assert.equal(reduceTilePendingKey(null, 'festzelt', true), 'festzelt')
  assert.equal(reduceTilePendingKey('hochzeit', 'festzelt', true), 'festzelt')
})

test('reduceTilePendingKey: ein idle-Report loescht den State nur, wenn er vom aktuellen Halter kommt', () => {
  assert.equal(reduceTilePendingKey('festzelt', 'festzelt', false), null)
})

test('reduceTilePendingKey: ein verspaeteter idle-Report einer NICHT mehr haltenden Kachel darf den neueren pendingTileKey nicht loeschen (Race beim schnellen Kachelwechsel)', () => {
  // Nutzer klickt schnell hintereinander "hochzeit" dann "festzelt";
  // "hochzeit" meldet sein eigenes idle=false, nachdem "festzelt" bereits
  // pendingTileKey haelt -- "festzelt" darf dadurch nicht verloren gehen.
  assert.equal(reduceTilePendingKey('festzelt', 'hochzeit', false), 'festzelt')
})
