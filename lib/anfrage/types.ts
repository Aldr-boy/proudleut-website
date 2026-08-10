export type AnfrageSubmissionPayload = {
  idempotencyKey: string;
  bandSlugs: string[];
  anlass: string;
  datumText: string;
  location: string;
  plzOrt: string;
  gaestezahl: string;
  spielzeit: string;
  nachricht: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  datenschutz: boolean;
  firmaHidden: string;
  websiteHidden: string;
  openedAt: number;
};

export type NormalizedAnfrageInput = {
  idempotencyKey: string;
  bandSlugs: string[];
  anlass: string | null;
  datumText: string;
  location: string | null;
  plzOrt: string | null;
  gaestezahl: string | null;
  spielzeit: string | null;
  nachricht: string | null;
  vorname: string;
  nachname: string | null;
  email: string;
  telefon: string | null;
};

export type ParseFailureReason = 'bot' | 'validation';

export type ParseResult =
  | { ok: true; data: NormalizedAnfrageInput }
  | { ok: false; reason: 'bot' }
  | { ok: false; reason: 'validation'; message: string };

export type ResolvedBand = {
  bandId: string;
  name: string;
  slug: string;
  recipientEmail: string;
};

export type ResolveBandsResult =
  | { ok: true; bands: ResolvedBand[] }
  | { ok: false; bandName: string };

export type SendStatus = 'ausstehend' | 'gesendet' | 'fehlgeschlagen' | 'ungeklaert';
export type AnfrageStatus = 'eingegangen' | 'teilweise_versendet' | 'versendet' | 'fehlerhaft' | 'ungeklaert';

export type SubmitAnfrageResult =
  | { kind: 'accepted' }
  | { kind: 'bot_silent' }
  | { kind: 'validation_error'; message: string }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  // Rate-Limit-Pruefung selbst technisch fehlgeschlagen (RPC/Tabelle fehlt,
  // Berechtigungsfehler, unerwartete Antwort) -- fail-closed (Codex-Nachtrag
  // PR #26, Befund 3): keine Persistenz, kein Versand, neutrale Meldung.
  | { kind: 'temporarily_unavailable' }
  | { kind: 'unresolvable_band'; bandName: string }
  | { kind: 'server_error' };

export type MailSendOutcome =
  | { status: 'gesendet'; messageId: string }
  | { status: 'fehlgeschlagen'; errorMessage: string }
  | { status: 'ungeklaert'; errorMessage: string };
