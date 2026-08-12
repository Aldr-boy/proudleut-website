import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeMoodAssignments, normalizeBandFromSupabase } from './normalizeBand.ts'

test('normalizeMoodAssignments: liefert Name UND stabilen Slug pro Zuordnung', () => {
  const raw = [
    { sort_order: 1, moods: { name: 'Party pur', slug: 'party-pur', sort_order: 3 } },
  ]
  assert.deepEqual(normalizeMoodAssignments(raw), [{ name: 'Party pur', slug: 'party-pur' }])
})

test('normalizeMoodAssignments: sortiert nach band_moods.sort_order (kuratierte Prioritaet)', () => {
  const raw = [
    { sort_order: 2, moods: { name: 'B', slug: 'b', sort_order: 0 } },
    { sort_order: 1, moods: { name: 'A', slug: 'a', sort_order: 0 } },
  ]
  assert.deepEqual(
    normalizeMoodAssignments(raw).map((m) => m.slug),
    ['a', 'b']
  )
})

test('normalizeMoodAssignments: bei gleichem band_moods.sort_order entscheidet moods.sort_order', () => {
  const raw = [
    { sort_order: 0, moods: { name: 'B', slug: 'b', sort_order: 2 } },
    { sort_order: 0, moods: { name: 'A', slug: 'a', sort_order: 1 } },
  ]
  assert.deepEqual(
    normalizeMoodAssignments(raw).map((m) => m.slug),
    ['a', 'b']
  )
})

test('normalizeMoodAssignments: bei doppeltem Gleichstand entscheidet moods.name als Tie-Breaker', () => {
  const raw = [
    { sort_order: 0, moods: { name: 'Zeta', slug: 'zeta', sort_order: 0 } },
    { sort_order: 0, moods: { name: 'Alpha', slug: 'alpha', sort_order: 0 } },
  ]
  assert.deepEqual(
    normalizeMoodAssignments(raw).map((m) => m.name),
    ['Alpha', 'Zeta']
  )
})

test('normalizeMoodAssignments: leere/fehlende band_moods ergibt leeres Array, kein Crash', () => {
  assert.deepEqual(normalizeMoodAssignments(null), [])
  assert.deepEqual(normalizeMoodAssignments(undefined), [])
  assert.deepEqual(normalizeMoodAssignments([]), [])
})

test('normalizeMoodAssignments: Eintrag ohne Name oder ohne Slug wird verworfen, nicht als leere Zeichenkette gefuehrt', () => {
  const raw = [
    { sort_order: 0, moods: { name: 'Vollstaendig', slug: 'vollstaendig' } },
    { sort_order: 1, moods: { name: '', slug: 'ohne-namen' } },
    { sort_order: 2, moods: { name: 'Ohne Slug', slug: '' } },
  ]
  assert.deepEqual(normalizeMoodAssignments(raw), [{ name: 'Vollstaendig', slug: 'vollstaendig' }])
})

// ── Block "Event-Type-Anfrage-Label V1" ──────────────────────────────

test('normalizeBandFromSupabase: eventTypes enthaelt weiterhin die kanonischen Namen, KEINE Umstellung auf anfrage_label', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_event_types: [
      { sort_order: 1, event_types: { name: 'Firmenfeier & Business Event', slug: 'firmenfeier-business-event', anfrage_label: 'Firmenfeier' } },
      { sort_order: 2, event_types: { name: 'Hochzeit', slug: 'hochzeit', anfrage_label: null } },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.deepEqual(band.eventTypes, ['Firmenfeier & Business Event', 'Hochzeit'])
  assert.deepEqual(band.categorySlugs, ['firmenfeier-business-event', 'hochzeit'])
})

test('normalizeBandFromSupabase: anfrageEventTypes liefert anfrage_label je Event Type, null bei fehlendem Label', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_event_types: [
      { sort_order: 1, event_types: { name: 'Firmenfeier & Business Event', slug: 'firmenfeier-business-event', anfrage_label: 'Firmenfeier' } },
      { sort_order: 2, event_types: { name: 'Hochzeit', slug: 'hochzeit', anfrage_label: null } },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.deepEqual(band.anfrageEventTypes, [
    { name: 'Firmenfeier & Business Event', slug: 'firmenfeier-business-event', anfrageLabel: 'Firmenfeier' },
    { name: 'Hochzeit', slug: 'hochzeit', anfrageLabel: null },
  ])
})

test('normalizeBandFromSupabase: zwei Privatfeier-Event-Types bleiben ueber ihren Slug unterscheidbar', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_event_types: [
      { sort_order: 1, event_types: { name: 'private Feiern', slug: 'private-feiern', anfrage_label: 'Private Feier' } },
      { sort_order: 2, event_types: { name: 'exklusive Privatfeiern', slug: 'exklusive-privatfeiern', anfrage_label: 'Exklusive Privatfeier' } },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.deepEqual(band.anfrageEventTypes.map((t) => t.slug), ['private-feiern', 'exklusive-privatfeiern'])
  assert.deepEqual(band.anfrageEventTypes.map((t) => t.anfrageLabel), ['Private Feier', 'Exklusive Privatfeier'])
})

// ── Paket 2A "Banddokumente" ──────────────────────────────────────────

test('normalizeBandFromSupabase: keine band_documents -> documents ist ein leeres Array, kein Crash', () => {
  const band = normalizeBandFromSupabase({ name: 'Testband', slug: 'testband', status: 'active' })
  assert.deepEqual(band.documents, [])
})

test('normalizeBandFromSupabase: genau 1 Dokument wird vollstaendig gemappt, optionale Felder fehlen defensiv', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_documents: [
      {
        id: 'doc-1',
        title: 'Präsentation für Veranstalter',
        audience_label: 'Für Veranstalter & Festwirte',
        description: null,
        file_url: 'https://example.com/band-media/doc-1.pdf',
        thumbnail_url: null,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.deepEqual(band.documents, [
    {
      id: 'doc-1',
      title: 'Präsentation für Veranstalter',
      audienceLabel: 'Für Veranstalter & Festwirte',
      description: undefined,
      fileUrl: 'https://example.com/band-media/doc-1.pdf',
      thumbnailUrl: undefined,
    },
  ])
})

test('normalizeBandFromSupabase: mehrere Dokumente werden deterministisch nach sort_order sortiert', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_documents: [
      { id: 'doc-b', title: 'B', audience_label: 'Für Brautpaare', file_url: 'https://example.com/b.pdf', sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
      { id: 'doc-a', title: 'A', audience_label: 'Für Veranstalter', file_url: 'https://example.com/a.pdf', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.deepEqual(band.documents.map((d) => d.id), ['doc-a', 'doc-b'])
})

test('normalizeBandFromSupabase: optionale description/thumbnail_url werden uebernommen, wenn vorhanden', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_documents: [
      {
        id: 'doc-1',
        title: 'Präsentation',
        audience_label: 'Für Veranstalter',
        description: 'Kurzbeschreibung der Präsentation.',
        file_url: 'https://example.com/doc-1.pdf',
        thumbnail_url: 'https://example.com/doc-1-cover.jpg',
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.equal(band.documents[0].description, 'Kurzbeschreibung der Präsentation.')
  assert.equal(band.documents[0].thumbnailUrl, 'https://example.com/doc-1-cover.jpg')
})

test('normalizeBandFromSupabase: Dokumentzeile ohne Pflichtfeld (title/audience_label/file_url) wird verworfen', () => {
  const row = {
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    band_documents: [
      { id: 'doc-1', title: '', audience_label: 'Für Veranstalter', file_url: 'https://example.com/doc-1.pdf', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
      { id: 'doc-2', title: 'Titel', audience_label: '', file_url: 'https://example.com/doc-2.pdf', sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
      { id: 'doc-3', title: 'Titel', audience_label: 'Für Veranstalter', file_url: '', sort_order: 2, created_at: '2026-01-01T00:00:00Z' },
    ],
  }
  const band = normalizeBandFromSupabase(row)
  assert.deepEqual(band.documents, [])
})
