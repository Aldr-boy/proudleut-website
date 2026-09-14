import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeBandName,
  mapBandByName,
  parseCsvCheckDate,
  parseFollowerValue,
  parseCsvRow,
  resolveDuplicateGroup,
  dedupeCsvRows,
  resolvePlatformDecision,
  computePreviewVisibility,
  PLATFORM_DECISION,
} from './classify.mjs'

const NOW = new Date('2026-09-14T12:00:00.000Z')

// ─── normalizeBandName / mapBandByName ────────────────────────────────────────

test('normalizeBandName: Trim, Case, typografische Apostrophe/Gedankenstriche, Mehrfach-Leerzeichen', () => {
  assert.equal(normalizeBandName('  De Zwiadn  '), 'de zwiadn')
  assert.equal(normalizeBandName("d'Zechpreller"), "d'zechpreller")
  assert.equal(normalizeBandName('Heimatg’fühl'), "heimatg'fühl")
  assert.equal(normalizeBandName('A   B'), 'a b')
})

test('mapBandByName: exakter Treffer nach Normalisierung', () => {
  const map = new Map([['9to5', [{ id: '1', slug: '9to5', name: '9to5', status: 'active', is_published: true }]]])
  const r = mapBandByName('9to5', map)
  assert.equal(r.classification, 'EXACT')
  assert.equal(r.band.id, '1')
})

test('mapBandByName: kein Treffer -> MISSING_TARGET_BAND, kein Fuzzy-Fallback', () => {
  const map = new Map()
  const r = mapBandByName('Brugger Buam', map)
  assert.equal(r.classification, 'MISSING_TARGET_BAND')
  assert.equal(r.band, null)
})

test('mapBandByName: mehrere Treffer -> AMBIGUOUS_BAND', () => {
  const map = new Map([['x', [{ id: '1' }, { id: '2' }]]])
  const r = mapBandByName('X', map)
  assert.equal(r.classification, 'AMBIGUOUS_BAND')
  assert.equal(r.band, null)
})

// ─── parseCsvCheckDate ─────────────────────────────────────────────────────────

test('parseCsvCheckDate: gueltiges Datum, Tag.Monat.Jahr europaeisch, 1-2-stellig', () => {
  const r = parseCsvCheckDate('4.12.2025 12:11pm', NOW)
  assert.equal(r.ok, true)
  assert.equal(r.calendarDate, '2025-12-04')
})

test('parseCsvCheckDate: einstelliger Tag und Monat', () => {
  const r = parseCsvCheckDate('7.1.2026 10:44am', NOW)
  assert.equal(r.ok, true)
  assert.equal(r.calendarDate, '2026-01-07')
})

test('parseCsvCheckDate: "#ERROR!" -> FORMULA_ARTIFACT, nicht UNPARSEABLE', () => {
  const r = parseCsvCheckDate('#ERROR!', NOW)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'FORMULA_ARTIFACT')
})

test('parseCsvCheckDate: leer -> EMPTY', () => {
  const r = parseCsvCheckDate('', NOW)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'EMPTY')
})

test('parseCsvCheckDate: ungueltiges Kalenderdatum (30.2.) -> INVALID_CALENDAR_DATE', () => {
  const r = parseCsvCheckDate('30.2.2025 12:00pm', NOW)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'INVALID_CALENDAR_DATE')
})

test('parseCsvCheckDate: zukuenftiges Datum -> FUTURE_DATE', () => {
  const r = parseCsvCheckDate('1.1.2027 12:00pm', NOW)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'FUTURE_DATE')
})

test('parseCsvCheckDate: nicht auf JS-Date-Autoparsing vertrauen -- voellig falsches Format wird abgelehnt, nicht geraten', () => {
  const r = parseCsvCheckDate('2025-12-04', NOW)
  assert.equal(r.ok, false)
  assert.equal(r.reason, 'UNPARSEABLE')
})

// ─── parseFollowerValue ────────────────────────────────────────────────────────

test('parseFollowerValue: leer -> null ("nicht erfasst"), kein Fehler', () => {
  const r = parseFollowerValue('')
  assert.deepEqual(r, { ok: true, value: null })
})

test('parseFollowerValue: gueltige nichtnegative Ganzzahl', () => {
  assert.deepEqual(parseFollowerValue('5173'), { ok: true, value: 5173 })
  assert.deepEqual(parseFollowerValue('0'), { ok: true, value: 0 })
})

test('parseFollowerValue: negative Zahl -> Fehler', () => {
  assert.equal(parseFollowerValue('-5').ok, false)
})

test('parseFollowerValue: Dezimalzahl -> Fehler', () => {
  assert.equal(parseFollowerValue('5.5').ok, false)
})

// ─── parseCsvRow ────────────────────────────────────────────────────────────────

test('parseCsvRow: vollstaendige Zeile mit allen drei Plattformen', () => {
  const record = {
    _rowNumber: 2,
    'Bandname aus Verlinkung': '2 unplugged',
    Bands: '2 unplugged',
    IG_Followers: '1322',
    FB_Followers: '1457',
    YT_Subs: '170',
    'Zuletzt aktualisiert': '4.12.2025 12:11pm',
  }
  const row = parseCsvRow(record)
  assert.equal(row.nameMismatch, false)
  assert.equal(row.hasAnyMetric, true)
  assert.equal(row.platformValues.instagram.value, 1322)
  assert.equal(row.platformValues.facebook.value, 1457)
  assert.equal(row.platformValues.youtube.value, 170)
  assert.equal(row.dateResult.ok, true)
})

test('parseCsvRow: reine #ERROR!-Zeile ohne Kennzahlen -> hasAnyMetric=false', () => {
  const record = {
    _rowNumber: 30,
    'Bandname aus Verlinkung': "d'Hundskrippln",
    Bands: "d'Hundskrippln",
    IG_Followers: '',
    FB_Followers: '',
    YT_Subs: '',
    'Zuletzt aktualisiert': '#ERROR!',
  }
  const row = parseCsvRow(record)
  assert.equal(row.hasAnyMetric, false)
  assert.equal(row.dateResult.ok, false)
  assert.equal(row.dateResult.reason, 'FORMULA_ARTIFACT')
})

test('parseCsvRow: IG_Following/FB_Following/Social_Reach werden nicht extrahiert', () => {
  const record = {
    _rowNumber: 3,
    Bands: 'x',
    'Bandname aus Verlinkung': 'x',
    IG_Followers: '10',
    IG_Following: '999',
    FB_Followers: '',
    FB_Following: '999',
    YT_Subs: '',
    Social_Reach: '9999',
    'Zuletzt aktualisiert': '4.12.2025 12:00pm',
  }
  const row = parseCsvRow(record)
  assert.deepEqual(Object.keys(row.platformValues).sort(), ['facebook', 'instagram', 'youtube'])
})

// ─── Dubletten ───────────────────────────────────────────────────────────────

function row(overrides: Record<string, string>) {
  return parseCsvRow({
    _rowNumber: 1,
    Bands: 'Free Vocals',
    'Bandname aus Verlinkung': 'Free Vocals',
    IG_Followers: '',
    FB_Followers: '',
    YT_Subs: '',
    'Zuletzt aktualisiert': '',
    ...overrides,
  })
}

test('resolveDuplicateGroup: "Free Vocals" -- juengere befuellte Zeile gewinnt vollstaendig, keine Feldmischung', () => {
  const older = row({ IG_Followers: '2320', FB_Followers: '1548', YT_Subs: '', 'Zuletzt aktualisiert': '4.12.2025 12:15pm' })
  const newer = row({ IG_Followers: '2336', FB_Followers: '1548', YT_Subs: '540', 'Zuletzt aktualisiert': '17.12.2025 12:16pm' })
  const result = resolveDuplicateGroup([older, newer])
  assert.equal(result.conflict, false)
  assert.equal(result.chosen, newer)
  assert.equal(result.chosen.platformValues.instagram.value, 2336)
  assert.equal(result.discarded.length, 1)
  assert.equal(result.discarded[0], older)
})

test('resolveDuplicateGroup: "Harmonic Brass" -- befuellte Zeile gewinnt gegen leere Zeile, unabhaengig vom Datum', () => {
  const filled = row({ IG_Followers: '2214', FB_Followers: '5082', YT_Subs: '917', 'Zuletzt aktualisiert': '4.12.2025 11:40am' })
  const empty = row({ 'Zuletzt aktualisiert': '#ERROR!' })
  const result = resolveDuplicateGroup([filled, empty])
  assert.equal(result.conflict, false)
  assert.equal(result.chosen, filled)
})

test('resolveDuplicateGroup: zwei befuellte Dubletten mit identischem juengstem Datum -- widerspruechlich, keine automatische Aufloesung', () => {
  const a = row({ IG_Followers: '100', 'Zuletzt aktualisiert': '4.12.2025 12:00pm' })
  const b = row({ IG_Followers: '200', 'Zuletzt aktualisiert': '4.12.2025 4:00pm' })
  // beide auf denselben Kalendertag (4.12.2025), aber unterschiedliche Werte
  const result = resolveDuplicateGroup([a, b])
  assert.equal(result.conflict, true)
  assert.ok(result.conflictReason)
  assert.match(result.conflictReason, /identisch/)
})

test('resolveDuplicateGroup: einzelne Zeile ohne Dublette -- direkt uebernommen', () => {
  const only = row({ IG_Followers: '10', 'Zuletzt aktualisiert': '4.12.2025 12:00pm' })
  const result = resolveDuplicateGroup([only])
  assert.equal(result.conflict, false)
  assert.equal(result.chosen, only)
})

test('dedupeCsvRows: gruppiert nach normalisiertem Bandnamen ueber die gesamte Liste', () => {
  const rows = [
    row({ Bands: 'Free Vocals', 'Bandname aus Verlinkung': 'Free Vocals', IG_Followers: '2320', 'Zuletzt aktualisiert': '4.12.2025 12:15pm' }),
    row({ Bands: 'Free Vocals', 'Bandname aus Verlinkung': 'Free Vocals', IG_Followers: '2336', 'Zuletzt aktualisiert': '17.12.2025 12:16pm' }),
    row({ Bands: '9to5', 'Bandname aus Verlinkung': '9to5', IG_Followers: '3475', 'Zuletzt aktualisiert': '4.12.2025 12:09pm' }),
  ]
  const { resolved, conflicts } = dedupeCsvRows(rows)
  assert.equal(conflicts.length, 0)
  assert.equal(resolved.length, 2)
  const freeVocals = resolved.find((r) => r.normalizedName === 'free vocals')
  assert.ok(freeVocals)
  assert.ok(freeVocals.chosen)
  assert.equal(freeVocals.chosen.platformValues.instagram.value, 2336)
  assert.equal(freeVocals.discardedCount, 1)
})

// ─── resolvePlatformDecision ───────────────────────────────────────────────────

const VALID_DATE = parseCsvCheckDate('1.6.2026 12:00pm', NOW) // 2026-06-01, gueltig, nicht in der Zukunft bezogen auf NOW

test('resolvePlatformDecision: leeres CSV-Feld -> NOOP_EMPTY_SOURCE, unabhaengig vom Ziel', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: null }, dateResult: VALID_DATE, targetRow: { current_followers: 100, last_checked_at: '2026-01-01T00:00:00Z' } })
  assert.equal(r.decision, PLATFORM_DECISION.NOOP_EMPTY_SOURCE)
})

test('resolvePlatformDecision: ungueltiger Wert -> INVALID_VALUE', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: false, reason: 'x' }, dateResult: VALID_DATE, targetRow: null })
  assert.equal(r.decision, PLATFORM_DECISION.INVALID_VALUE)
})

test('resolvePlatformDecision: ungueltiges Zeilendatum -> SKIP_INVALID_DATE, auch bei gueltigem Wert', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: { ok: false, reason: 'FUTURE_DATE', detail: 'x' }, targetRow: null })
  assert.equal(r.decision, PLATFORM_DECISION.SKIP_INVALID_DATE)
})

test('resolvePlatformDecision: kein Zielprofil -> SKIP_NO_TARGET_PROFILE', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: null })
  assert.equal(r.decision, PLATFORM_DECISION.SKIP_NO_TARGET_PROFILE)
})

test('resolvePlatformDecision: Zielwert bisher null -> SET', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: { current_followers: null, last_checked_at: null } })
  assert.equal(r.decision, PLATFORM_DECISION.SET)
  assert.equal(r.proposedValue, 100)
})

test('resolvePlatformDecision: identischer Wert+Tag -> ALREADY_EQUAL (No-op)', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: { current_followers: 100, last_checked_at: '2026-06-01T00:00:00Z' } })
  assert.equal(r.decision, PLATFORM_DECISION.ALREADY_EQUAL)
})

test('resolvePlatformDecision: vorhandener Zielstand juenger als CSV -> SKIP_TARGET_NEWER, kein Ueberschreiben', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: { current_followers: 999, last_checked_at: '2026-08-01T00:00:00Z' } })
  assert.equal(r.decision, PLATFORM_DECISION.SKIP_TARGET_NEWER)
})

test('resolvePlatformDecision: gleicher Pruefstand, abweichender Wert -> Konflikt', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: { current_followers: 999, last_checked_at: '2026-06-01T00:00:00Z' } })
  assert.equal(r.decision, PLATFORM_DECISION.CONFLICT_SAME_DATE_DIFFERENT_VALUE)
})

test('resolvePlatformDecision: vorhandene Kennzahl ohne (gueltiges) Pruefdatum -> Konflikt, kein stilles Ueberschreiben', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: { current_followers: 999, last_checked_at: null } })
  assert.equal(r.decision, PLATFORM_DECISION.CONFLICT_NO_COMPARABLE_TARGET_DATE)
})

test('resolvePlatformDecision: CSV-Stand juenger als vorhandener Zielstand -> UPDATE-Vorschlag', () => {
  const r = resolvePlatformDecision({ valueResult: { ok: true, value: 100 }, dateResult: VALID_DATE, targetRow: { current_followers: 50, last_checked_at: '2026-01-01T00:00:00Z' } })
  assert.equal(r.decision, PLATFORM_DECISION.UPDATE)
  assert.equal(r.proposedValue, 100)
})

// ─── computePreviewVisibility ──────────────────────────────────────────────────

test('computePreviewVisibility: aktuelles Datum + aktive/veroeffentlichte Band -> sichtbar', () => {
  const r = computePreviewVisibility(100, '2026-09-01T00:00:00Z', { status: 'active', is_published: true }, NOW)
  assert.equal(r.wouldBeVisible, true)
})

test('computePreviewVisibility: Datenregel erfuellt, aber Band nicht oeffentlich -> insgesamt nicht sichtbar', () => {
  const r = computePreviewVisibility(100, '2026-09-01T00:00:00Z', { status: 'draft', is_published: false }, NOW)
  assert.equal(r.dateRuleVisible, true)
  assert.equal(r.bandIsPublic, false)
  assert.equal(r.wouldBeVisible, false)
})

test('computePreviewVisibility: Wert aelter als 12 Monate -> nicht sichtbar, unabhaengig vom Bandstatus', () => {
  const r = computePreviewVisibility(100, '2024-01-01T00:00:00Z', { status: 'active', is_published: true }, NOW)
  assert.equal(r.dateRuleVisible, false)
  assert.equal(r.wouldBeVisible, false)
})
