import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FINDER_OCCASIONS, bandMatchesFinderOccasion, getFinderOccasionBySlug } from './finderOccasions.ts'
import { CATEGORIES } from './categories.ts'

// Fachliche Bereinigung "Festzelt-Definition": CATEGORIES['festzelt'] war
// frueher bewusst breiter als die Finder-Semantik (Sammelkategorie fuer
// Stadt-/Buergerfest, Bierfest, Brauereifest, Buergerfest, Biergarten,
// Wirtshausmusi, Fruehschoppen). Das ist kein Soll-Zustand mehr: Festzelt
// ist ein eigenstaendiger Anlass, /veranstaltung/festzelt und der Finder
// teilen jetzt denselben, engen Scope.
test('CATEGORIES[festzelt] hat denselben engen Scope wie FINDER_OCCASIONS[festzelt]', () => {
  const festzeltCategory = CATEGORIES.find((c) => c.slug === 'festzelt')
  assert.ok(festzeltCategory, 'CATEGORIES-Eintrag "festzelt" muss weiterhin existieren')
  assert.deepEqual(festzeltCategory!.supabaseEventTypeSlugs, ['festzelt'])
})

test('FINDER_OCCASIONS: elf Anlaesse in der vorgegebenen Reihenfolge', () => {
  assert.deepEqual(
    FINDER_OCCASIONS.map((o) => o.slug),
    [
      'hochzeit',
      'brautentfuehrung',
      'festzelt',
      'stadt-und-buergerfest',
      'firmenfeier',
      'geburtstag',
      'gala',
      'fasching',
      'weihnachtsfeier',
      'festival',
      'konzert-club-festival',
    ]
  )
})

// Auftrag "Bandfinder-Redesign": sechster Themen-Einstieg. Read-only gegen
// Produktion verifiziert -- "festival", "konzert" und "club" sind drei
// eigenstaendige, aktive event_types mit realen Bandzuordnungen (26
// Baender insgesamt), im Code bislang nur "festival" ueber CATEGORIES
// verdrahtet. Eigene Finder-Option ohne CATEGORIES-Gegenpart, identisches
// Muster wie "stadt-und-buergerfest" -- die bestehende CATEGORIES['festival']
// (/veranstaltung/festival) bleibt davon unberuehrt.
test('Konzert, Club & Festival matcht festival ODER konzert ODER club -- CATEGORIES[festival] bleibt unveraendert eng (nur "festival")', () => {
  const konzertClubFestival = getFinderOccasionBySlug('konzert-club-festival')
  assert.ok(konzertClubFestival)
  assert.equal(konzertClubFestival!.title, 'Konzert, Club & Festival')
  assert.deepEqual(konzertClubFestival!.supabaseEventTypeSlugs, ['festival', 'konzert', 'club'])

  const festivalCategory = CATEGORIES.find((c) => c.slug === 'festival')
  assert.ok(festivalCategory)
  assert.deepEqual(festivalCategory!.supabaseEventTypeSlugs, ['festival'], 'CATEGORIES[festival] darf durch den neuen Finder-Eintrag nicht erweitert werden')

  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['festival'] }, konzertClubFestival!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['konzert'] }, konzertClubFestival!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['club'] }, konzertClubFestival!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['hochzeit'] }, konzertClubFestival!), false)
})

test('Repro Free Vocals: matcht Konzert, Club & Festival (traegt sowohl konzert als auch festival)', () => {
  const freeVocals = { categorySlugs: ['konzert', 'festival', 'stadt-und-buergerfest', 'firmenfeier-business-event', 'hochzeit', 'geburtstagsfeier', 'beerdigung', 'empfang'] }
  const konzertClubFestival = getFinderOccasionBySlug('konzert-club-festival')!
  assert.equal(bandMatchesFinderOccasion(freeVocals, konzertClubFestival), true)
})

test('Brautentführung ist ein eigener Finder-Anlass direkt nach Hochzeit -- matcht ausschliesslich brautentfuehrung', () => {
  assert.equal(FINDER_OCCASIONS[1].slug, 'brautentfuehrung', 'Brautentfuehrung muss direkt nach Hochzeit stehen')

  const brautentfuehrung = getFinderOccasionBySlug('brautentfuehrung')
  assert.ok(brautentfuehrung)
  assert.equal(brautentfuehrung!.title, 'Brautentführung')
  assert.equal(brautentfuehrung!.slug, 'brautentfuehrung')
  assert.deepEqual(brautentfuehrung!.supabaseEventTypeSlugs, ['brautentfuehrung'])

  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['brautentfuehrung'] }, brautentfuehrung!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['hochzeit'] }, brautentfuehrung!), false)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['freie-trauung'] }, brautentfuehrung!), false)
})

test('Festzelt matcht ausschliesslich festzelt -- kein Cluster mehr', () => {
  const festzelt = getFinderOccasionBySlug('festzelt')
  assert.ok(festzelt)
  assert.deepEqual(festzelt!.supabaseEventTypeSlugs, ['festzelt'])

  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['festzelt'] }, festzelt!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['stadt-und-buergerfest'] }, festzelt!), false)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['buergerfest'] }, festzelt!), false)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['bierfest'] }, festzelt!), false)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['wirtshausmusi', 'fruehschoppen'] }, festzelt!), false)
})

test('Stadt- & Buergerfest matcht stadt-und-buergerfest und buergerfest, nicht festzelt', () => {
  const stadtBuergerfest = getFinderOccasionBySlug('stadt-und-buergerfest')
  assert.ok(stadtBuergerfest)
  assert.equal(stadtBuergerfest!.title, 'Stadt- & Bürgerfest')
  assert.deepEqual(stadtBuergerfest!.supabaseEventTypeSlugs, ['stadt-und-buergerfest', 'buergerfest'])

  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['stadt-und-buergerfest'] }, stadtBuergerfest!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['buergerfest'] }, stadtBuergerfest!), true)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['festzelt'] }, stadtBuergerfest!), false)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: ['bierfest'] }, stadtBuergerfest!), false)
})

// Reale Production-Repros (Werte read-only gegen Production verifiziert,
// siehe vorheriger Audit) -- als literale Fixtures statt Live-DB-Aufruf,
// analog zu anderen Unit-Tests in diesem Repo.
test('Repro Free Vocals: kein Festzelt-Match, aber Stadt- & Buergerfest-Match', () => {
  const freeVocals = {
    categorySlugs: [
      'konzert',
      'festival',
      'stadt-und-buergerfest',
      'firmenfeier-business-event',
      'hochzeit',
      'geburtstagsfeier',
      'beerdigung',
      'empfang',
    ],
  }
  const festzelt = getFinderOccasionBySlug('festzelt')!
  const stadtBuergerfest = getFinderOccasionBySlug('stadt-und-buergerfest')!

  assert.equal(bandMatchesFinderOccasion(freeVocals, festzelt), false)
  assert.equal(bandMatchesFinderOccasion(freeVocals, stadtBuergerfest), true)
})

test('Repro Bigband STEINBACH: kein Festzelt-Match (nur buergerfest), aber Stadt- & Buergerfest-Match', () => {
  const bigbandSteinbach = { categorySlugs: ['buergerfest'] }
  const festzelt = getFinderOccasionBySlug('festzelt')!
  const stadtBuergerfest = getFinderOccasionBySlug('stadt-und-buergerfest')!

  assert.equal(bandMatchesFinderOccasion(bigbandSteinbach, festzelt), false)
  assert.equal(bandMatchesFinderOccasion(bigbandSteinbach, stadtBuergerfest), true)
})

test('getFinderOccasionBySlug: unbekannter Slug liefert undefined, kein Crash', () => {
  assert.equal(getFinderOccasionBySlug('dieser-slug-existiert-nicht'), undefined)
})

test('bandMatchesFinderOccasion: Band ohne categorySlugs matcht nie', () => {
  const festzelt = getFinderOccasionBySlug('festzelt')!
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: undefined }, festzelt), false)
  assert.equal(bandMatchesFinderOccasion({ categorySlugs: [] }, festzelt), false)
})

test('die uebrigen sieben bestehenden Anlaesse behalten nicht-leere, aus CATEGORIES abgeleitete Slug-Listen', () => {
  for (const slug of ['hochzeit', 'firmenfeier', 'geburtstag', 'gala', 'fasching', 'weihnachtsfeier', 'festival']) {
    const occasion = getFinderOccasionBySlug(slug)
    assert.ok(occasion, `${slug} fehlt in FINDER_OCCASIONS`)
    assert.ok(occasion!.supabaseEventTypeSlugs.length > 0, `${slug} hat keine supabaseEventTypeSlugs`)
  }
})
