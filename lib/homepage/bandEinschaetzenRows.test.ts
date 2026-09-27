import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEinschaetzenRows, buildSocialRow, buildDocumentRow } from './bandEinschaetzenRows.ts'
import type { Band, BandDocument } from '../types/band.ts'

function baseBand(overrides: Partial<Band> = {}): Band {
  return {
    id: 'band-1',
    name: 'Testband',
    slug: 'testband',
    status: 'active',
    bandartNames: [],
    bandartSlugs: [],
    eventTypes: ['Hochzeit'],
    klingtNach: ['Soul'],
    moods: [],
    musikalischVerortet: ['Funk'],
    location: { city: 'München', administrativeRegion: 'Oberbayern' },
    socialLinks: {},
    referenceEvents: [],
    similarBands: {},
    documents: [],
    homepageReady: true,
    heroImage: { url: 'https://example.com/hero.jpg', alt: 'Testband live', source: 'external' },
    gallery: [],
    ...overrides,
  }
}

function doc(overrides: Partial<BandDocument> = {}): BandDocument {
  return {
    id: 'doc-1',
    title: 'Presse- & Booking-Info',
    audienceLabel: 'Für Veranstalter',
    fileUrl: 'https://example.com/doc.pdf',
    ...overrides,
  }
}

// ── buildSocialRow ───────────────────────────────────────────────────────

test('buildSocialRow: keine gueltigen Kennzahlen -> Zeile entfaellt komplett', () => {
  const band = baseBand({ socialProfileMetrics: undefined, spotifyMonthlyListeners: undefined })
  assert.equal(buildSocialRow(band), null)
})

test('buildSocialRow: einzelne fehlende Kennzahl (Facebook) -> nur diese Plattform fehlt, Rest bleibt', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2026-09-26T00:00:00+00:00' },
      youtube: { count: 1150, checkedAt: '2026-09-26T00:00:00+00:00' },
    },
    spotifyMonthlyListeners: { count: 12686, asOf: '2026-09-26T00:00:00+00:00' },
  })
  const row = buildSocialRow(band)
  assert.ok(row)
  assert.deepEqual(
    row!.metrics.map((m) => m.key),
    ['spotify', 'instagram', 'youtube']
  )
})

test('buildSocialRow: Reihenfolge ist immer Spotify, Instagram, Facebook, YouTube', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2026-09-26T00:00:00+00:00' },
      facebook: { count: 3200, checkedAt: '2026-09-26T00:00:00+00:00' },
      youtube: { count: 1150, checkedAt: '2026-09-26T00:00:00+00:00' },
    },
    spotifyMonthlyListeners: { count: 12686, asOf: '2026-09-26T00:00:00+00:00' },
  })
  const row = buildSocialRow(band)
  assert.deepEqual(
    row!.metrics.map((m) => m.key),
    ['spotify', 'instagram', 'facebook', 'youtube']
  )
})

test('buildSocialRow: Einheiten exakt "Monatliche Hörer*innen" / "Follower" / "Abonnenten", keine Summierung', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2026-09-26T00:00:00+00:00' },
      facebook: { count: 3200, checkedAt: '2026-09-26T00:00:00+00:00' },
      youtube: { count: 1150, checkedAt: '2026-09-26T00:00:00+00:00' },
    },
    spotifyMonthlyListeners: { count: 12686, asOf: '2026-09-26T00:00:00+00:00' },
  })
  const row = buildSocialRow(band)
  const byKey = Object.fromEntries(row!.metrics.map((m) => [m.key, m]))
  assert.equal(byKey.spotify.unit, 'Monatliche Hörer*innen')
  assert.equal(byKey.instagram.unit, 'Follower')
  assert.equal(byKey.facebook.unit, 'Follower')
  assert.equal(byKey.youtube.unit, 'Abonnenten')
  // Kein Feld, das eine Gesamtsumme traegt.
  assert.equal((row as unknown as { total?: unknown }).total, undefined)
})

test('buildSocialRow: gleicher Kalendertag bei allen Follower-Metriken -> EIN gemeinsamer Stand, kein eigenes Spotify-Datum daneben', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2026-09-26T00:00:00+00:00' },
      facebook: { count: 3200, checkedAt: '2026-09-26T00:00:00+00:00' },
      youtube: { count: 1150, checkedAt: '2026-09-26T00:00:00+00:00' },
    },
    spotifyMonthlyListeners: { count: 12686, asOf: '2026-09-26T00:00:00+00:00' },
  })
  const row = buildSocialRow(band)
  assert.equal(row!.sharedStandText, 'Stand: September 2026')
  assert.ok(row!.metrics.every((m) => m.standText === undefined))
})

test('buildSocialRow: unterschiedliche Standdaten -> kein erfundenes gemeinsames Datum, stattdessen je Plattform', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2026-08-01T00:00:00+00:00' },
      facebook: { count: 3200, checkedAt: '2026-09-26T00:00:00+00:00' },
      youtube: { count: 1150, checkedAt: '2026-09-26T00:00:00+00:00' },
    },
    spotifyMonthlyListeners: { count: 12686, asOf: '2026-09-26T00:00:00+00:00' },
  })
  const row = buildSocialRow(band)
  assert.equal(row!.sharedStandText, undefined)
  const byKey = Object.fromEntries(row!.metrics.map((m) => [m.key, m]))
  assert.equal(byKey.instagram.standText, 'Stand: 01.08.2026')
  assert.equal(byKey.facebook.standText, 'Stand: 26.09.2026')
  assert.equal(byKey.youtube.standText, 'Stand: 26.09.2026')
})

test('buildSocialRow: veraltete/unglueltige Kennzahl wird wie auf der Bandseite ausgeblendet (12-Monats-Regel)', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2020-01-01T00:00:00+00:00' },
    },
    spotifyMonthlyListeners: undefined,
  })
  assert.equal(buildSocialRow(band), null)
})

// ── buildDocumentRow ─────────────────────────────────────────────────────

test('buildDocumentRow: genau ein eindeutiges Presse-/Booking-Dokument -> Zeile mit dessen Link', () => {
  const band = baseBand({ documents: [doc({ fileUrl: 'https://example.com/presse.pdf' })] })
  assert.deepEqual(buildDocumentRow(band), {
    kind: 'document',
    label: 'Für Veranstalter',
    href: 'https://example.com/presse.pdf',
  })
})

test('buildDocumentRow: kein Dokument vorhanden -> Zeile entfaellt', () => {
  assert.equal(buildDocumentRow(baseBand({ documents: [] })), null)
})

test('buildDocumentRow: kein Dokument erfuellt beide Stichworte -> Zeile entfaellt (kein blindes documents[0])', () => {
  const band = baseBand({
    documents: [doc({ title: 'Rider', audienceLabel: 'Für die Technik' })],
  })
  assert.equal(buildDocumentRow(band), null)
})

test('buildDocumentRow: mehrere moegliche Presse-/Booking-Dokumente -> Zeile entfaellt statt blind eines zu waehlen', () => {
  const band = baseBand({
    documents: [
      doc({ id: 'doc-1', title: 'Presse- & Booking-Info 2025' }),
      doc({ id: 'doc-2', title: 'Presse- & Booking-Info 2026' }),
    ],
  })
  assert.equal(buildDocumentRow(band), null)
})

// ── buildEinschaetzenRows ────────────────────────────────────────────────

test('buildEinschaetzenRows: Reihenfolge Klingt nach, Stil & Einfluesse, Spielt bei, Herkunft, Social & Streaming, Fuer Veranstalter, Fotos & Video', () => {
  const band = baseBand({
    socialProfileMetrics: {
      instagram: { count: 5066, checkedAt: '2026-09-26T00:00:00+00:00' },
    },
    documents: [doc()],
  })
  const rows = buildEinschaetzenRows(band)
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Klingt nach', 'Stil & Einflüsse', 'Spielt bei', 'Herkunft', 'Social & Streaming', 'Für Veranstalter', 'Fotos & Video']
  )
})

test('buildEinschaetzenRows: "Besetzung" wird in dieser Homepage-Demo nie angezeigt, auch wenn weddingInfo.bandSize vorhanden ist', () => {
  const band = baseBand({ weddingInfo: { bandSize: '6-köpfige Band' } })
  const rows = buildEinschaetzenRows(band)
  assert.ok(!rows.some((r) => r.label === 'Besetzung'))
})

test('buildEinschaetzenRows: fehlende Kennzahlen und fehlendes Dokument -> beide Zeilen entfallen, Rest bleibt', () => {
  const band = baseBand({ socialProfileMetrics: undefined, spotifyMonthlyListeners: undefined, documents: [] })
  const rows = buildEinschaetzenRows(band)
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Klingt nach', 'Stil & Einflüsse', 'Spielt bei', 'Herkunft', 'Fotos & Video']
  )
})

test('buildEinschaetzenRows: "Fotos & Video" bleibt immer die letzte Zeile', () => {
  const band = baseBand({
    socialProfileMetrics: { instagram: { count: 5066, checkedAt: '2026-09-26T00:00:00+00:00' } },
    documents: [doc()],
  })
  const rows = buildEinschaetzenRows(band)
  assert.equal(rows[rows.length - 1].label, 'Fotos & Video')
})
