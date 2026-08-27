import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersonMemberships, normalizePersonFromSupabase, normalizePersonLinks } from './normalizePerson.ts'

test('normalizePersonFromSupabase: aktive Person wird vollstaendig normalisiert', () => {
  const row = {
    id: 'p1',
    name: 'PL Public Test Person',
    slug: 'pl-public-test-person',
    bio: 'Technische Testfixture.',
    image_url: null,
    website_url: 'https://example.invalid/',
    approved_at: '2026-01-01T00:00:00Z',
    band_memberships: [],
    person_links: [],
  }
  const person = normalizePersonFromSupabase(row)
  assert.equal(person.id, 'p1')
  assert.equal(person.name, 'PL Public Test Person')
  assert.equal(person.slug, 'pl-public-test-person')
  assert.equal(person.bio, 'Technische Testfixture.')
  assert.equal(person.imageUrl, undefined)
  assert.equal(person.websiteUrl, 'https://example.invalid/')
  assert.deepEqual(person.memberships, [])
  assert.deepEqual(person.links, [])
})

test('normalizePersonMemberships: sichtbare Memberships (RLS liefert bereits gefiltert) werden korrekt uebernommen', () => {
  const raw = [
    {
      role: 'Testrolle',
      sort_order: 0,
      bands: { id: 'b1', name: 'Donnaweda', slug: 'donnaweda' },
      band_membership_instruments: [
        { sort_order: 0, instruments: { name: 'Bass', slug: 'bass', sort_order: 10 } },
      ],
    },
  ]
  assert.deepEqual(normalizePersonMemberships(raw), [
    {
      bandId: 'b1',
      bandName: 'Donnaweda',
      bandSlug: 'donnaweda',
      role: 'Testrolle',
      instruments: [{ name: 'Bass', slug: 'bass' }],
    },
  ])
})

test('normalizePersonMemberships: Zeile ohne bands (durch RLS bereits ausgeschlossen) wird uebersprungen, kein Crash', () => {
  const raw = [{ role: 'x', sort_order: 0, bands: null, band_membership_instruments: [] }]
  assert.deepEqual(normalizePersonMemberships(raw), [])
})

test('normalizePersonMemberships: leere/fehlende band_memberships ergibt leeres Array (Empty State), kein Crash', () => {
  assert.deepEqual(normalizePersonMemberships(null), [])
  assert.deepEqual(normalizePersonMemberships(undefined), [])
  assert.deepEqual(normalizePersonMemberships([]), [])
})

test('normalizePersonMemberships: sortiert nach band_memberships.sort_order, danach Bandname (deutsche Locale) als Tie-Breaker', () => {
  const raw = [
    { role: 'B', sort_order: 0, bands: { id: 'b2', name: 'Zeta Band', slug: 'zeta-band' }, band_membership_instruments: [] },
    { role: 'A', sort_order: 0, bands: { id: 'b1', name: 'Alpha Band', slug: 'alpha-band' }, band_membership_instruments: [] },
  ]
  assert.deepEqual(normalizePersonMemberships(raw).map((m) => m.bandSlug), ['alpha-band', 'zeta-band'])
})

test('normalizePersonMemberships: Instrumente stabil nach Join-sort_order sortiert (zwei Instrumente gleichzeitig)', () => {
  const raw = [
    {
      role: 'Testrolle',
      sort_order: 0,
      bands: { id: 'b1', name: 'Donnaweda', slug: 'donnaweda' },
      band_membership_instruments: [
        { sort_order: 1, instruments: { name: 'Posaune', slug: 'posaune', sort_order: 30 } },
        { sort_order: 0, instruments: { name: 'Bass', slug: 'bass', sort_order: 10 } },
      ],
    },
  ]
  assert.deepEqual(
    normalizePersonMemberships(raw)[0].instruments,
    [{ name: 'Bass', slug: 'bass' }, { name: 'Posaune', slug: 'posaune' }],
  )
})

// ── person_links (Paket 4C-B) ────────────────────────────────────────

test('normalizePersonLinks: sichtbare Links (RLS liefert bereits gefiltert) werden korrekt uebernommen', () => {
  const raw = [{ id: 'l1', label: 'Wikipedia', url: 'https://de.wikipedia.org/wiki/Test', sort_order: 0 }]
  assert.deepEqual(normalizePersonLinks(raw), [{ id: 'l1', label: 'Wikipedia', url: 'https://de.wikipedia.org/wiki/Test' }])
})

test('normalizePersonLinks: leere/fehlende person_links ergibt leeres Array (Empty State), kein Crash', () => {
  assert.deepEqual(normalizePersonLinks(null), [])
  assert.deepEqual(normalizePersonLinks(undefined), [])
  assert.deepEqual(normalizePersonLinks([]), [])
})

test('normalizePersonLinks: sortiert nach sort_order, danach Label (deutsche Locale) als Tie-Breaker', () => {
  const raw = [
    { id: 'l2', label: 'Offizielle Seite', url: 'https://example.org/', sort_order: 10 },
    { id: 'l1', label: 'Wikipedia', url: 'https://de.wikipedia.org/wiki/Test', sort_order: 0 },
  ]
  assert.deepEqual(normalizePersonLinks(raw).map((l) => l.id), ['l1', 'l2'])
})

test('normalizePersonLinks: bei gleichem sort_order entscheidet das Label als Tie-Breaker', () => {
  const raw = [
    { id: 'l2', label: 'Zeta', url: 'https://example.org/zeta', sort_order: 0 },
    { id: 'l1', label: 'Alpha', url: 'https://example.org/alpha', sort_order: 0 },
  ]
  assert.deepEqual(normalizePersonLinks(raw).map((l) => l.label), ['Alpha', 'Zeta'])
})

test('normalizePersonLinks: Zeile ohne id/label/url wird defensiv verworfen, kein Crash', () => {
  const raw = [{ id: null, label: 'X', url: 'https://example.org/', sort_order: 0 }]
  assert.deepEqual(normalizePersonLinks(raw), [])
})
