// Reine Entscheidungslogik fuer das Schreiben der Spotify-Kennzahl
// "Monatliche Hoerer*innen" + Erfassungsdatum (social_profiles.
// monthly_listeners / monthly_listeners_as_of) im Band-Admin --
// Schwesterdatei zu resolveSocialMetricsWrite.ts (gleiches Muster:
// ausgelagert aus actions.ts, unabhaengig von Supabase-Aufrufen
// unit-testbar).
//
// Getrennt von den Follower-Kennzahlen (current_followers /
// last_checked_at): Spotify zaehlt Hoerer*innen ueber einen rollierenden
// 28-Tage-Zeitraum, deshalb gehoert zu jedem Wert ein eigenes, im Admin
// editierbares Erfassungsdatum -- KEIN gemeinsames Pruefdatum und KEIN
// "geprueft"-Haken. Wert und Datum werden immer gemeinsam gesetzt oder
// gemeinsam geleert (die Datenbank erzwingt das zusaetzlich per CHECK).
//
// Format-/Bereichspruefung (nichtnegative ganze Zahl, gueltiges nicht-
// zukuenftiges Datum) erfolgt VOR dem Aufruf (parseNonNegativeIntOrNull /
// parseNonFutureDateOrNull aus resolveSocialMetricsWrite.ts).

export type ExistingSpotifyListeners = {
  monthly_listeners: number | null
  monthly_listeners_as_of: string | null
}

export type SpotifyListenersWriteInput = {
  // bereits geparste Zahl aus dem Formularfeld, oder null bei leerem Feld
  submittedListeners: number | null
  // bereits validierter Erfassungsdatum-Wert (ISO-String, UTC-Mitternacht)
  // aus dem Formular, oder null bei leerem Datumsfeld
  submittedAsOf: string | null
}

export type SpotifyListenersWriteDecision =
  | { action: 'noop' }
  | { action: 'clear' }
  | { action: 'set'; monthly_listeners: number; monthly_listeners_as_of: string }
  | { action: 'error'; code: 'date_required' }

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b
  return new Date(a).getTime() === new Date(b).getTime()
}

export function resolveSpotifyListenersWrite(
  existing: ExistingSpotifyListeners,
  input: SpotifyListenersWriteInput,
): SpotifyListenersWriteDecision {
  const { submittedListeners, submittedAsOf } = input

  // Zahl leer: hatte die Zeile einen Wert, wird Wert UND Datum gemeinsam
  // geleert (ein Datum ohne Wert darf nie uebrig bleiben, auch wenn das
  // Datumsfeld noch mit "heute" vorbelegt ist). Ohne gespeicherten Wert
  // gibt es nichts zu tun -- das vorbelegte Datum allein wird ignoriert.
  if (submittedListeners === null) {
    return existing.monthly_listeners !== null || existing.monthly_listeners_as_of !== null
      ? { action: 'clear' }
      : { action: 'noop' }
  }

  // Wert ohne Datum: nie speichern (kein Wert ohne Datum).
  if (submittedAsOf === null) {
    return { action: 'error', code: 'date_required' }
  }

  if (
    existing.monthly_listeners === submittedListeners &&
    sameInstant(existing.monthly_listeners_as_of, submittedAsOf)
  ) {
    return { action: 'noop' }
  }

  return { action: 'set', monthly_listeners: submittedListeners, monthly_listeners_as_of: submittedAsOf }
}
