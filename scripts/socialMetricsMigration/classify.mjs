/**
 * classify.mjs
 *
 * Reine Entscheidungslogik fuer die einmalige CSV-Uebernahme von
 * Social-Media-Kennzahlen ("Social Media Index-Uebersicht.csv") nach
 * public.social_profiles. Keine I/O -- ausschliesslich Funktionen von
 * Eingabewerten auf Klassifikationen, analog zu
 * scripts/socialMigration/classify.mjs (URL-Erstmigration) und
 * lib/socialLinks/resolveSocialMetricsWrite.ts (Admin-Schreibpfad).
 *
 * Importiert lib/socialLinks/followerCountVisibility.ts direkt (Node
 * 24 stripped-types Support, siehe scripts/migrate-social-metrics.mjs),
 * damit die Zwoelf-Monats-Sichtbarkeitsregel nicht dupliziert wird.
 */

import { isFollowerCountVisible } from '../../lib/socialLinks/followerCountVisibility.ts'

export const TARGET_PLATFORM_FIELD = {
  instagram: 'IG_Followers',
  facebook: 'FB_Followers',
  youtube: 'YT_Subs',
}
export const TARGET_PLATFORMS = Object.keys(TARGET_PLATFORM_FIELD)

// ─── Bandnamen-Normalisierung (nur triviale Normalisierung, kein Fuzzy-Match) ──

export function normalizeBandName(raw) {
  if (raw === undefined || raw === null) return ''
  return String(raw)
    .normalize('NFKC')
    .replace(/[‘’]/g, "'") // typografische Apostrophe -> '
    .replace(/[–—]/g, '-') // en-/em-dash -> -
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * bandsByNormalizedName: Map<normalizedName, {id, slug, name, status,
 * is_published}[]> -- Werte als Array, damit Mehrfachtreffer
 * (AMBIGUOUS_BAND) erkennbar bleiben.
 */
export function mapBandByName(csvBandName, bandsByNormalizedName) {
  const key = normalizeBandName(csvBandName)
  if (!key) return { classification: 'MISSING_TARGET_BAND', band: null, reason: 'CSV-Zeile ohne Bandname' }
  const matches = bandsByNormalizedName.get(key)
  if (!matches || matches.length === 0) {
    return { classification: 'MISSING_TARGET_BAND', band: null, reason: `Kein Supabase-Band mit Name "${csvBandName}" gefunden (exakter Namensabgleich, kein Fuzzy-Match)` }
  }
  if (matches.length > 1) {
    return { classification: 'AMBIGUOUS_BAND', band: null, reason: `Name "${csvBandName}" passt auf ${matches.length} Supabase-Baender: ${matches.map((m) => m.slug).join(', ')}` }
  }
  return { classification: 'EXACT', band: matches[0], reason: 'eindeutiger Namensabgleich (nach Trim/Case/Anfuehrungszeichen-Normalisierung)' }
}

// ─── Datum: "D.M.YYYY H:MMam/pm" (Tag.Monat.Jahr, europaeisch) ────────────────
// Nur der Kalendertag wird uebernommen (last_checked_at wird bestandsweit als
// UTC-Mitternacht des Kalendertags gefuehrt, siehe
// lib/socialLinks/resolveSocialMetricsWrite.ts / BandContactSection.tsx). Die
// Uhrzeit-Angabe in der CSV ist der Zeitpunkt der Erhebung, keine fachliche
// Information -- sie wird verworfen, nicht in eine Zeitzone konvertiert. Da
// wir nur die woertlichen Y/M/D-Ziffern aus der CSV lesen und direkt als
// UTC-Mitternacht formatieren (keine Ausgangs-Zeitzone wird angenommen oder
// umgerechnet), kann kein Tagesversatz durch Zeitzonenumrechnung entstehen.

const CSV_DATETIME_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i

export function parseCsvCheckDate(raw, now = new Date()) {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return { ok: false, reason: 'EMPTY', detail: 'kein Pruefdatum in der CSV-Zeile' }
  if (trimmed === '#ERROR!') return { ok: false, reason: 'FORMULA_ARTIFACT', detail: 'Excel/Sheets-Formelartefakt "#ERROR!", keine Kennzahl in dieser Zeile' }

  const m = CSV_DATETIME_RE.exec(trimmed)
  if (!m) return { ok: false, reason: 'UNPARSEABLE', detail: `Datumsformat nicht erkannt: "${trimmed}"` }

  const [, dStr, moStr, yStr] = m
  const day = Number(dStr)
  const month = Number(moStr)
  const year = Number(yStr)

  // Kalendergueltigkeit strikt pruefen (kein 30.2., kein 31.4., ...) --
  // gleiches Rundreise-Prinzip wie parseNonFutureDateOrNull in
  // lib/socialLinks/resolveSocialMetricsWrite.ts.
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false, reason: 'INVALID_CALENDAR_DATE', detail: `"${trimmed}" ist kein gueltiges Kalenderdatum` }
  }

  if (date.getTime() > now.getTime()) {
    return { ok: false, reason: 'FUTURE_DATE', detail: `"${trimmed}" liegt in der Zukunft (bezogen auf den Ausfuehrungszeitpunkt)` }
  }

  const calendarDate = date.toISOString().slice(0, 10)
  return { ok: true, isoMidnightUtc: date.toISOString(), calendarDate }
}

// ─── Zahl: nichtnegative ganze Zahl oder "nicht erfasst" (leer) ───────────────

export function parseFollowerValue(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (trimmed === '') return { ok: true, value: null } // "nicht erfasst", nie 0
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: `kein nichtnegativer Ganzzahlwert: "${trimmed}"` }
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n)) return { ok: false, reason: `Zahl ausserhalb des sicheren Bereichs: "${trimmed}"` }
  return { ok: true, value: n }
}

// ─── Eine CSV-Zeile strukturiert parsen (rein, kein Bandabgleich) ─────────────

export function parseCsvRow(record) {
  const bandnameLink = (record['Bandname aus Verlinkung'] ?? '').trim()
  const bandsName = (record['Bands'] ?? '').trim()
  const nameMismatch = normalizeBandName(bandnameLink) !== normalizeBandName(bandsName)

  const dateResult = parseCsvCheckDate(record['Zuletzt aktualisiert'])

  /** @type {Record<'instagram'|'facebook'|'youtube', {ok:boolean, value?:number|null, reason?:string}>} */
  const platformValues = {}
  for (const platform of TARGET_PLATFORMS) {
    platformValues[platform] = parseFollowerValue(record[TARGET_PLATFORM_FIELD[platform]])
  }

  const hasAnyMetric = TARGET_PLATFORMS.some((p) => platformValues[p].ok && platformValues[p].value !== null)

  return {
    rowNumber: record._rowNumber,
    bandnameLink,
    bandsName,
    nameMismatch,
    dateResult,
    platformValues,
    hasAnyMetric,
    columnCountMismatch: !!record._columnCountMismatch,
  }
}

// ─── Dubletten: mehrere CSV-Zeilen fuer denselben (normalisierten) Bandnamen ──

/**
 * @param {ReturnType<typeof parseCsvRow>[]} rows - bereits nach Bandname gruppiert
 * @returns {{ chosen: ReturnType<typeof parseCsvRow>|null, discarded: ReturnType<typeof parseCsvRow>[], conflict: boolean, conflictReason: string|null }}
 */
export function resolveDuplicateGroup(rows) {
  if (rows.length === 1) return { chosen: rows[0], discarded: [], conflict: false, conflictReason: null }

  const filled = rows.filter((r) => r.hasAnyMetric)
  if (filled.length === 0) {
    // keine Zeile mit Kennzahl -- irrelevant fuer den Import, erste Zeile als
    // Platzhalter waehlen (keine Wirkung, da hasAnyMetric=false ueberall).
    return { chosen: rows[0], discarded: rows.slice(1), conflict: false, conflictReason: null }
  }
  if (filled.length === 1) {
    // ein befuellter, Rest leer -- leer verdraengt nie befuellt (z.B. Harmonic Brass).
    return { chosen: filled[0], discarded: rows.filter((r) => r !== filled[0]), conflict: false, conflictReason: null }
  }

  // Mehrere befuellte Zeilen: nur mit gueltigem Datum vergleichbar.
  const filledWithValidDate = filled.filter((r) => r.dateResult.ok)
  if (filledWithValidDate.length < filled.length) {
    return {
      chosen: null,
      discarded: [],
      conflict: true,
      conflictReason: 'mehrere befuellte Dubletten, mindestens eine ohne gueltiges Pruefdatum -- Aktualitaet nicht bestimmbar',
    }
  }

  const sorted = [...filledWithValidDate].sort((a, b) => (a.dateResult.calendarDate < b.dateResult.calendarDate ? 1 : a.dateResult.calendarDate > b.dateResult.calendarDate ? -1 : 0))
  const newest = sorted[0]
  const sameDateAsNewest = sorted.filter((r) => r.dateResult.calendarDate === newest.dateResult.calendarDate)

  if (sameDateAsNewest.length > 1) {
    // Mehrere gleich-aktuelle befuellte Dubletten -- widerspruechlich, nicht
    // automatisch aufloesen (Auftrag Abschnitt 3).
    return {
      chosen: null,
      discarded: [],
      conflict: true,
      conflictReason: `${sameDateAsNewest.length} befuellte Dubletten mit identischem juengstem Pruefdatum (${newest.dateResult.calendarDate}) -- widerspruechlich, keine automatische Aufloesung`,
    }
  }

  // Juengste befuellte Zeile gewinnt vollstaendig -- keine Feldmischung mit
  // aelteren Zeilen (auch nicht fuer Plattformen, die in der juengsten Zeile leer sind).
  return { chosen: newest, discarded: rows.filter((r) => r !== newest), conflict: false, conflictReason: null }
}

/**
 * Gruppiert geparste Zeilen nach normalisiertem Bandnamen und loest jede
 * Gruppe per resolveDuplicateGroup auf.
 * @param {ReturnType<typeof parseCsvRow>[]} parsedRows
 */
export function dedupeCsvRows(parsedRows) {
  const groups = new Map()
  for (const row of parsedRows) {
    const key = normalizeBandName(row.bandsName)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  const resolved = []
  const conflicts = []
  for (const [key, rows] of groups) {
    const result = resolveDuplicateGroup(rows)
    if (result.conflict) {
      conflicts.push({ normalizedName: key, rows, reason: result.conflictReason })
    } else {
      resolved.push({ normalizedName: key, chosen: result.chosen, discardedCount: result.discarded.length })
    }
  }
  return { resolved, conflicts }
}

// ─── Bestandsschutz je Plattform: CSV-Vorschlag gegen vorhandene Zielrow ──────

const PLATFORM_DECISION = /** @type {const} */ ({
  NOOP_EMPTY_SOURCE: 'NOOP_EMPTY_SOURCE',
  INVALID_VALUE: 'INVALID_VALUE',
  SKIP_INVALID_DATE: 'SKIP_INVALID_DATE',
  SKIP_NO_TARGET_PROFILE: 'SKIP_NO_TARGET_PROFILE',
  SET: 'SET',
  UPDATE: 'UPDATE',
  ALREADY_EQUAL: 'ALREADY_EQUAL',
  SKIP_TARGET_NEWER: 'SKIP_TARGET_NEWER',
  CONFLICT_SAME_DATE_DIFFERENT_VALUE: 'CONFLICT_SAME_DATE_DIFFERENT_VALUE',
  CONFLICT_NO_COMPARABLE_TARGET_DATE: 'CONFLICT_NO_COMPARABLE_TARGET_DATE',
})
export { PLATFORM_DECISION }

/**
 * @param {object} params
 * @param {{ok:true,value:number|null}|{ok:false,reason:string}} params.valueResult
 * @param {{ok:boolean, calendarDate?:string, isoMidnightUtc?:string, reason?:string, detail?:string}} params.dateResult
 * @param {{current_followers:number|null, last_checked_at:string|null}|null|undefined} params.targetRow - vorhandene social_profiles-Row (band_id+platform), oder null/undefined falls kein Profil existiert
 */
export function resolvePlatformDecision({ valueResult, dateResult, targetRow }) {
  if (!valueResult.ok) {
    return { decision: PLATFORM_DECISION.INVALID_VALUE, reason: valueResult.reason }
  }
  if (valueResult.value === null) {
    return { decision: PLATFORM_DECISION.NOOP_EMPTY_SOURCE, reason: 'CSV-Feld leer -- aendert nichts am Zielwert' }
  }
  if (!dateResult.ok) {
    return { decision: PLATFORM_DECISION.SKIP_INVALID_DATE, reason: `Pruefdatum der Zeile ungueltig (${dateResult.reason}): ${dateResult.detail}` }
  }
  if (targetRow === null || targetRow === undefined) {
    return { decision: PLATFORM_DECISION.SKIP_NO_TARGET_PROFILE, reason: 'kein bestehendes Social-Profil (mit Profil-URL) fuer diese Band+Plattform -- es wird kein neues Profil angelegt' }
  }

  const proposedValue = valueResult.value
  const proposedDate = dateResult.calendarDate

  if (targetRow.current_followers === null || targetRow.current_followers === undefined) {
    return {
      decision: PLATFORM_DECISION.SET,
      reason: 'Zielwert bisher nicht erfasst -- wird erstmals befuellt',
      proposedValue,
      proposedCheckedAt: dateResult.isoMidnightUtc,
    }
  }

  const targetDate = typeof targetRow.last_checked_at === 'string' ? targetRow.last_checked_at.slice(0, 10) : null
  const targetDateValid = targetDate !== null && !Number.isNaN(new Date(targetRow.last_checked_at).getTime())

  if (targetRow.current_followers === proposedValue && targetDateValid && targetDate === proposedDate) {
    return { decision: PLATFORM_DECISION.ALREADY_EQUAL, reason: 'Zielwert und Pruefdatum stimmen bereits ueberein -- No-op' }
  }

  if (!targetDateValid) {
    return {
      decision: PLATFORM_DECISION.CONFLICT_NO_COMPARABLE_TARGET_DATE,
      reason: 'vorhandene Kennzahl ohne verlaesslich vergleichbares Pruefdatum -- Aktualitaet nicht bestimmbar, Entscheidung noetig',
      proposedValue,
      proposedCheckedAt: dateResult.isoMidnightUtc,
    }
  }

  if (targetDate > proposedDate) {
    return {
      decision: PLATFORM_DECISION.SKIP_TARGET_NEWER,
      reason: `vorhandener Zielstand (${targetDate}) ist juenger als der CSV-Stand (${proposedDate}) -- nicht ueberschreiben`,
    }
  }

  if (targetDate === proposedDate) {
    return {
      decision: PLATFORM_DECISION.CONFLICT_SAME_DATE_DIFFERENT_VALUE,
      reason: `gleicher Pruefstand (${proposedDate}), aber abweichender Wert (Ziel ${targetRow.current_followers} vs. CSV ${proposedValue}) -- Entscheidung noetig`,
      proposedValue,
      proposedCheckedAt: dateResult.isoMidnightUtc,
    }
  }

  // targetDate < proposedDate
  return {
    decision: PLATFORM_DECISION.UPDATE,
    reason: `CSV-Stand (${proposedDate}) ist juenger als der vorhandene Zielstand (${targetDate}) -- Aktualisierung vorgeschlagen`,
    proposedValue,
    proposedCheckedAt: dateResult.isoMidnightUtc,
  }
}

// ─── Oeffentliche Sichtbarkeit (Vorschau, bezogen auf "jetzt") ────────────────

/**
 * @param {number} value
 * @param {string} checkedAtIso
 * @param {{status:string, is_published:boolean}} band
 * @param {Date} now
 */
export function computePreviewVisibility(value, checkedAtIso, band, now = new Date()) {
  const dateRuleVisible = isFollowerCountVisible(value, checkedAtIso, now)
  const bandIsPublic = band?.status === 'active' && band?.is_published === true
  return { dateRuleVisible, bandIsPublic, wouldBeVisible: dateRuleVisible && bandIsPublic }
}
