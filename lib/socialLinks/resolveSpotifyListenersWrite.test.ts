import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveSpotifyListenersWrite,
  type ExistingSpotifyListeners,
} from './resolveSpotifyListenersWrite.ts'
import { resolveSocialLinkWrite } from './resolveSocialLinkWrite.ts'
import { parseNonNegativeIntOrNull, parseNonFutureDateOrNull } from './resolveSocialMetricsWrite.ts'

const NOW = new Date('2026-09-26T12:00:00.000Z')
const DATE_A = '2026-09-01T00:00:00.000Z'
const DATE_B = '2026-09-20T00:00:00.000Z'

function existing(overrides: Partial<ExistingSpotifyListeners> = {}): ExistingSpotifyListeners {
  return { monthly_listeners: null, monthly_listeners_as_of: null, ...overrides }
}

test('neuer Wert + Datum -> set (beide zusammen)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(existing(), { submittedListeners: 12686, submittedAsOf: DATE_A }),
    { action: 'set', monthly_listeners: 12686, monthly_listeners_as_of: DATE_A },
  )
})

test('Wert 0 mit Datum ist gueltig -> set (0 ist von "nicht erfasst" unterscheidbar)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(existing(), { submittedListeners: 0, submittedAsOf: DATE_A }),
    { action: 'set', monthly_listeners: 0, monthly_listeners_as_of: DATE_A },
  )
})

test('Wert ohne Datum -> error date_required (kein Wert ohne Datum)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(existing(), { submittedListeners: 12686, submittedAsOf: null }),
    { action: 'error', code: 'date_required' },
  )
})

test('nur Datum, kein Wert, nichts gespeichert -> noop (das vorbelegte Datum allein wird nie gespeichert)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(existing(), { submittedListeners: null, submittedAsOf: DATE_A }),
    { action: 'noop' },
  )
})

test('Wert geleert -> clear, auch wenn das Datumsfeld noch ein Datum traegt (Wert + Datum gemeinsam entfernt)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(
      existing({ monthly_listeners: 12686, monthly_listeners_as_of: DATE_A }),
      { submittedListeners: null, submittedAsOf: DATE_B },
    ),
    { action: 'clear' },
  )
})

test('Wert geleert und Datum ebenfalls leer -> clear', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(
      existing({ monthly_listeners: 5, monthly_listeners_as_of: DATE_A }),
      { submittedListeners: null, submittedAsOf: null },
    ),
    { action: 'clear' },
  )
})

test('unveraenderter Wert + unverfaendertes Datum -> noop (bloßes Speichern anderer Felder schreibt nichts)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(
      existing({ monthly_listeners: 12686, monthly_listeners_as_of: DATE_A }),
      { submittedListeners: 12686, submittedAsOf: DATE_A },
    ),
    { action: 'noop' },
  )
})

test('gleiches Datum in anderer ISO-Schreibweise gilt als unveraendert (Postgres liefert +00:00)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(
      existing({ monthly_listeners: 12686, monthly_listeners_as_of: '2026-09-01T00:00:00+00:00' }),
      { submittedListeners: 12686, submittedAsOf: DATE_A },
    ),
    { action: 'noop' },
  )
})

test('gleicher Wert, neues Datum -> set (Stand aktualisieren)', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(
      existing({ monthly_listeners: 12686, monthly_listeners_as_of: DATE_A }),
      { submittedListeners: 12686, submittedAsOf: DATE_B },
    ),
    { action: 'set', monthly_listeners: 12686, monthly_listeners_as_of: DATE_B },
  )
})

test('neuer Wert, gleiches Datum -> set', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(
      existing({ monthly_listeners: 12686, monthly_listeners_as_of: DATE_A }),
      { submittedListeners: 13000, submittedAsOf: DATE_A },
    ),
    { action: 'set', monthly_listeners: 13000, monthly_listeners_as_of: DATE_A },
  )
})

test('nichts gespeichert, nichts eingegeben -> noop', () => {
  assert.deepEqual(
    resolveSpotifyListenersWrite(existing(), { submittedListeners: null, submittedAsOf: null }),
    { action: 'noop' },
  )
})

// ── Wiederverwendete Format-/Bereichshelfer (Datum nicht in der Zukunft) ──

test('Format-Helfer: Zahl nichtnegativ, Datum nicht in der Zukunft, nachtraegliches Datum erlaubt', () => {
  assert.deepEqual(parseNonNegativeIntOrNull('12686'), { ok: true, value: 12686 })
  assert.deepEqual(parseNonNegativeIntOrNull(''), { ok: true, value: null })
  assert.deepEqual(parseNonNegativeIntOrNull('-1'), { ok: false })
  assert.deepEqual(parseNonNegativeIntOrNull('12.686'), { ok: false })
  assert.deepEqual(parseNonFutureDateOrNull('2026-09-01', NOW), { ok: true, value: DATE_A })
  assert.deepEqual(parseNonFutureDateOrNull('2027-01-01', NOW), { ok: false })
})

// ── Link-Entfernen darf die Spotify-Kennzahl nie still verwerfen ──

test('Spotify-Zeile mit monthly_listeners: Link geleert -> blocked_has_metadata (Kennzahl bleibt erhalten)', () => {
  const decision = resolveSocialLinkWrite(
    [
      {
        id: 'sp-1',
        url: 'https://open.spotify.com/artist/x',
        current_followers: null,
        current_following: null,
        last_checked_at: null,
        monthly_listeners: 12686,
        monthly_listeners_as_of: DATE_A,
      },
    ],
    null,
  )
  assert.deepEqual(decision, { action: 'blocked_has_metadata', rowId: 'sp-1' })
})

test('Spotify-Zeile ohne Kennzahl: Link geleert -> delete (unveraendertes Verhalten)', () => {
  const decision = resolveSocialLinkWrite(
    [
      {
        id: 'sp-2',
        url: 'https://open.spotify.com/artist/x',
        current_followers: null,
        current_following: null,
        last_checked_at: null,
        monthly_listeners: null,
        monthly_listeners_as_of: null,
      },
    ],
    null,
  )
  assert.deepEqual(decision, { action: 'delete', rowId: 'sp-2' })
})
