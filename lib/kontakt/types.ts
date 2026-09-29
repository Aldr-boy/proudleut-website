export type KontaktSubmissionPayload = {
  anlass: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  nachricht: string;
  datenschutz: boolean;
  firmaHidden: string;
  websiteHidden: string;
  openedAt: number;
};

export type NormalizedKontaktInput = {
  anlass: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string | null;
  nachricht: string;
};

// 'bot' (Honeypot befuellt) bleibt eine stille Erfolgsantwort wie bei
// /api/anfrage und /api/band-introductions. 'too_fast' (Mindest-Öffnungszeit
// unterschritten) ist bei diesem Endpunkt bewusst KEIN Bot-Fall -- Xandi hat
// festgelegt, dass ein zu frueher Submit hier eine ehrliche Fehlermeldung mit
// Aufforderung zum erneuten Senden bekommt, statt still wie ein Bot behandelt
// zu werden (Freigabe-Auflage, Auftrag L-A1b).
export type KontaktParseFailureReason = 'bot' | 'too_fast' | 'validation';

export type KontaktParseResult =
  | { ok: true; data: NormalizedKontaktInput }
  | { ok: false; reason: 'bot' }
  | { ok: false; reason: 'too_fast' }
  | { ok: false; reason: 'validation'; message: string };

export type SubmitKontaktResult =
  | { kind: 'accepted' }
  | { kind: 'bot_silent' }
  | { kind: 'too_fast'; message: string }
  | { kind: 'validation_error'; message: string }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  // Deckt sowohl ein technisch fehlgeschlagenes Rate-Limit als auch eine
  // fehlende Konfiguration (RESEND_API_KEY/KONTAKT_NOTIFY_EMAIL) ab -- beides
  // fail-closed, identische neutrale Meldung, kein Unterschied fuer den
  // Client erkennbar (gleiches Muster wie lib/anfrage/rateLimit.ts).
  | { kind: 'temporarily_unavailable' }
  // Resend hat den Versand nachweislich abgelehnt ODER das Ergebnis blieb
  // technisch ungeklaert (Exception/Timeout). Ohne Persistenz gibt es hier
  // keinen spaeteren Admin-Retry wie bei /api/anfrage -- deshalb wird JEDER
  // Nicht-Erfolg dem Nutzer ehrlich als Fehler gemeldet, nie als Erfolg
  // verschleiert.
  | { kind: 'server_error' };
