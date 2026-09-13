// Reine Entscheidungslogik fuer das Schreiben der Follower-Kennzahl +
// Pruefdatum eines Social-Profils (social_profiles.current_followers /
// last_checked_at) im Band-Admin -- Schwesterdatei zu
// resolveSocialLinkWrite.ts, gleiches Architekturmuster (ausgelagert aus
// actions.ts, unabhaengig von Supabase-Aufrufen unit-testbar).
//
// Betrifft ausschliesslich current_followers -- current_following wird
// von diesem Feature nicht gepflegt (Auftrag: "Keine Following-Zahlen").
//
// Format-/Bereichspruefung (nichtnegative ganze Zahl, gueltiges
// nicht-zukuenftiges Datum) ist bereits VOR dem Aufruf dieser Funktion
// erfolgt (parseNonNegativeIntOrNull / parseNonFutureDateOrNull unten) --
// diese Funktion trifft nur noch die Geschaefts-Entscheidung, WAS mit
// bereits gueltig geparsten Werten zu tun ist.

export type ExistingSocialMetrics = {
  current_followers: number | null
  last_checked_at: string | null
}

export type SocialMetricsWriteInput = {
  // bereits geparste Zahl aus dem Formularfeld, oder null bei leerem Feld
  submittedFollowers: number | null
  // Haken "diese Plattform wurde am [gemeinsamen Datum] geprueft"
  confirmChecked: boolean
  // bereits validierter, gemeinsamer Pruefdatum-Wert (ISO-String) aus dem
  // Formular, oder null bei leerem/nicht angegebenem Datum
  checkedAtDate: string | null
}

export type SocialMetricsWriteDecision =
  | { action: 'noop' }
  | { action: 'clear' }
  | { action: 'set'; current_followers: number; last_checked_at: string }
  | { action: 'error'; code: 'check_required' }

export function resolveSocialMetricsWrite(
  existing: ExistingSocialMetrics,
  input: SocialMetricsWriteInput,
): SocialMetricsWriteDecision {
  const { submittedFollowers, confirmChecked, checkedAtDate } = input
  const stored = existing.current_followers

  // Zahl wurde geleert (hatte vorher einen Wert) -- Pruefdatum wird IMMER
  // mitgeleert, unabhaengig vom Haken (Auftrag: "Wird eine Zahl geleert,
  // das zugehoerige Pruefdatum ebenfalls leeren").
  if (submittedFollowers === null && stored !== null) {
    return { action: 'clear' }
  }

  const numberChanged = submittedFollowers !== stored

  if (!confirmChecked) {
    // Ohne Haken darf sich die Zahl nicht stillschweigend aendern --
    // eine neu erfasste oder geaenderte Zahl verlangt eine ausdrueckliche
    // Pruefbestaetigung samt Datum.
    if (numberChanged && submittedFollowers !== null) {
      return { action: 'error', code: 'check_required' }
    }
    return { action: 'noop' }
  }

  // Haken gesetzt, aber keine Zahl vorhanden (weder vorher noch jetzt) --
  // nichts zu bestaetigen, keine Wirkung.
  if (submittedFollowers === null) {
    return { action: 'noop' }
  }

  if (!checkedAtDate) {
    return { action: 'error', code: 'check_required' }
  }

  return { action: 'set', current_followers: submittedFollowers, last_checked_at: checkedAtDate }
}

// ── Format-/Bereichsvalidierung (Formulareingaben -> gueltige Werte) ──

export type ParsedIntResult = { ok: true; value: number | null } | { ok: false }

// Nichtnegative ganze Zahl oder leer ("nicht erfasst", von 0
// unterscheidbar). Lehnt Minuszeichen, Dezimalpunkt/-komma und sonstigen
// nicht-numerischen Text ab -- \d+ allein laesst kein Vorzeichen zu.
export function parseNonNegativeIntOrNull(raw: string): ParsedIntResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }
  if (!/^\d+$/.test(trimmed)) return { ok: false }
  const n = Number(trimmed)
  if (!Number.isSafeInteger(n)) return { ok: false }
  return { ok: true, value: n }
}

export type ParsedDateResult = { ok: true; value: string | null } | { ok: false }

// Gueltiges Kalenderdatum (YYYY-MM-DD, wie von <input type="date">
// geliefert) oder leer. Lehnt ungueltige Kalendertage (z. B. 2026-02-30,
// die Date sonst stillschweigend auf den naechsten Monat rollen wuerde)
// und zukuenftige Daten ab. Ergebnis ist ein ISO-Zeitstempel (UTC
// Mitternacht) fuer die Speicherung.
export function parseNonFutureDateOrNull(raw: string, now: Date = new Date()): ParsedDateResult {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!match) return { ok: false }

  const [, yStr, mStr, dStr] = match
  const y = Number(yStr)
  const m = Number(mStr)
  const d = Number(dStr)
  const date = new Date(Date.UTC(y, m - 1, d))

  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { ok: false }
  }

  if (date.getTime() > now.getTime()) return { ok: false }

  return { ok: true, value: date.toISOString() }
}
