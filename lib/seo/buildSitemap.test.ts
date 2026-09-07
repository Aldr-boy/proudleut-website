import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSitemapEntries, STATIC_PUBLIC_PATHS } from './buildSitemap.ts'

// Paket 2 (Sitemap): echte Ausfuehrungstests fuer die reine, netzwerkfreie
// Sitemap-Aufbaulogik -- mit Fixtures statt Live-DB, wie im Auftrag
// ausdruecklich gewuenscht ("Wo sinnvoll reine Sitemap-Building-Logik mit
// Fixtures testen"). Die eigentliche Sichtbarkeits-/Statusfilterung
// (aktive Bands, aktive Personen) passiert bereits vor diesem Aufruf in
// den bestehenden, wiederverwendeten Read-Pfaden (getAllBandsFromSupabase,
// getAllPublicPeopleSlugsFromSupabase) -- das wird strukturell in
// app/sitemapFoundation.test.ts geprueft, nicht hier erneut simuliert.

const FIXTURE = {
  categorySlugs: ['hochzeit', 'festzelt'],
  bandSlugs: ['blechstreet-boys', 'bigband-steinbach'],
  peopleSlugs: ['dominik-palmer'],
}

test('Homepage (/) ist enthalten, absolut unter https://proudleut.com/', () => {
  const entries = buildSitemapEntries(FIXTURE)
  const home = entries.find((e) => e.url === 'https://proudleut.com/')
  assert.ok(home, 'https://proudleut.com/ fehlt in der Sitemap')
})

test('/bands ist enthalten', () => {
  const entries = buildSitemapEntries(FIXTURE)
  assert.ok(entries.some((e) => e.url === 'https://proudleut.com/bands'))
})

test('alle STATIC_PUBLIC_PATHS erscheinen genau einmal', () => {
  const entries = buildSitemapEntries(FIXTURE)
  for (const path of STATIC_PUBLIC_PATHS) {
    const expected = path === '/' ? 'https://proudleut.com/' : `https://proudleut.com${path}`
    const matches = entries.filter((e) => e.url === expected)
    assert.equal(matches.length, 1, `${expected} sollte genau einmal vorkommen`)
  }
})

test('Bandslug wird zu https://proudleut.com/band/[slug]', () => {
  const entries = buildSitemapEntries(FIXTURE)
  assert.ok(entries.some((e) => e.url === 'https://proudleut.com/band/blechstreet-boys'))
  assert.ok(entries.some((e) => e.url === 'https://proudleut.com/band/bigband-steinbach'))
})

test('Personenslug wird zu https://proudleut.com/musiker/[slug]', () => {
  const entries = buildSitemapEntries(FIXTURE)
  assert.ok(entries.some((e) => e.url === 'https://proudleut.com/musiker/dominik-palmer'))
})

test('Kategorieslug wird zu https://proudleut.com/veranstaltung/[slug]', () => {
  const entries = buildSitemapEntries(FIXTURE)
  assert.ok(entries.some((e) => e.url === 'https://proudleut.com/veranstaltung/hochzeit'))
  assert.ok(entries.some((e) => e.url === 'https://proudleut.com/veranstaltung/festzelt'))
})

test('leere/null/undefined Slugs werden nicht aufgenommen, kein Crash', () => {
  const entries = buildSitemapEntries({
    categorySlugs: ['hochzeit', '', null, undefined],
    bandSlugs: ['blechstreet-boys', '', null, undefined],
    peopleSlugs: ['', null, undefined],
  })
  assert.ok(!entries.some((e) => e.url.endsWith('/veranstaltung/')))
  assert.ok(!entries.some((e) => e.url.endsWith('/band/')))
  assert.ok(!entries.some((e) => e.url.endsWith('/musiker/')))
  assert.equal(entries.filter((e) => e.url.includes('/veranstaltung/')).length, 1)
  assert.equal(entries.filter((e) => e.url.includes('/band/')).length, 1)
  assert.equal(entries.filter((e) => e.url.includes('/musiker/')).length, 0)
})

test('doppelte Slugs erzeugen keine doppelte URL', () => {
  const entries = buildSitemapEntries({
    categorySlugs: ['hochzeit', 'hochzeit'],
    bandSlugs: ['blechstreet-boys', 'blechstreet-boys', 'blechstreet-boys'],
    peopleSlugs: ['dominik-palmer', 'dominik-palmer'],
  })
  assert.equal(entries.filter((e) => e.url === 'https://proudleut.com/veranstaltung/hochzeit').length, 1)
  assert.equal(entries.filter((e) => e.url === 'https://proudleut.com/band/blechstreet-boys').length, 1)
  assert.equal(entries.filter((e) => e.url === 'https://proudleut.com/musiker/dominik-palmer').length, 1)
})

test('keine Duplikate insgesamt, auch nicht ueber Gruppen hinweg', () => {
  const entries = buildSitemapEntries(FIXTURE)
  const urls = entries.map((e) => e.url)
  assert.equal(new Set(urls).size, urls.length)
})

test('alle URLs absolut unter https://proudleut.com, keine localhost-/vercel.app-Treffer', () => {
  const entries = buildSitemapEntries(FIXTURE)
  for (const e of entries) {
    assert.ok(e.url.startsWith('https://proudleut.com/'), e.url)
    assert.ok(!e.url.includes('localhost'), e.url)
    assert.ok(!e.url.includes('vercel.app'), e.url)
  }
})

test('keine Query-Parameter (Finder-Filter) in irgendeiner URL', () => {
  const entries = buildSitemapEntries(FIXTURE)
  for (const e of entries) {
    assert.ok(!e.url.includes('?'), e.url)
  }
})

test('deterministische Reihenfolge: statisch -> Veranstaltung -> Band -> Musiker, je Gruppe alphabetisch nach Slug', () => {
  const shuffled = {
    categorySlugs: ['hochzeit', 'festzelt'],
    bandSlugs: ['bigband-steinbach', 'blechstreet-boys'],
    peopleSlugs: ['dominik-palmer'],
  }
  const entries = buildSitemapEntries(shuffled)
  const urls = entries.map((e) => e.url)

  assert.deepEqual(
    urls.slice(0, STATIC_PUBLIC_PATHS.length),
    STATIC_PUBLIC_PATHS.map((p) => (p === '/' ? 'https://proudleut.com/' : `https://proudleut.com${p}`))
  )

  const afterStatic = urls.slice(STATIC_PUBLIC_PATHS.length)
  assert.deepEqual(afterStatic, [
    'https://proudleut.com/veranstaltung/festzelt',
    'https://proudleut.com/veranstaltung/hochzeit',
    'https://proudleut.com/band/bigband-steinbach',
    'https://proudleut.com/band/blechstreet-boys',
    'https://proudleut.com/musiker/dominik-palmer',
  ])
})

test('Reihenfolge ist unabhaengig von der Eingabereihenfolge (identisches Ergebnis bei vertauschten Fixtures)', () => {
  const a = buildSitemapEntries({
    categorySlugs: ['hochzeit', 'festzelt'],
    bandSlugs: ['blechstreet-boys', 'bigband-steinbach'],
    peopleSlugs: ['dominik-palmer'],
  })
  const b = buildSitemapEntries({
    categorySlugs: ['festzelt', 'hochzeit'],
    bandSlugs: ['bigband-steinbach', 'blechstreet-boys'],
    peopleSlugs: ['dominik-palmer'],
  })
  assert.deepEqual(a.map((e) => e.url), b.map((e) => e.url))
})

test('kein Eintrag traegt lastModified (keine erfundenen/unzuverlaessigen Zeitstempel)', () => {
  const entries = buildSitemapEntries(FIXTURE)
  for (const e of entries) {
    assert.equal('lastModified' in e, false, `${e.url} sollte kein lastModified haben`)
  }
})
