// Zentrale Konstanten fuer das native Anfragesystem (Block L-A1).
// Laengenbegrenzungen muessen exakt zu den CHECK-Constraints in
// supabase/anfragesystem_native_migration.sql passen -- bei Aenderung an
// einer Stelle immer auch die andere pruefen.

export const MAX_BANDS_PER_ANFRAGE = 8;

export const MAX_LENGTHS = {
  vorname: 100,
  nachname: 100,
  email: 254,
  telefon: 40,
  anlass: 200,
  datumText: 300,
  location: 200,
  plzOrt: 200,
  nachricht: 3000,
  gaestezahl: 50,
  spielzeit: 100,
  idempotencyKeyMin: 8,
  idempotencyKeyMax: 128,
} as const;

// Aktuelle Version der Datenschutzerklaerung, gegen die der Consent
// dokumentiert wird. Wird ausschliesslich serverseitig gesetzt (nicht vom
// Client uebernommen) -- siehe DoD 21 "Datenschutz-Consent wird
// serverseitig geprueft und mit Zeitpunkt und Version dokumentiert".
export const CURRENT_DATENSCHUTZ_VERSION = 'v1-2026';

export const TEMPLATE_VERSION = 'v1';

export const ANFRAGE_SENDER_EMAIL = 'anfrage@proudleut.com';
export const ANFRAGE_SENDER_NAME = 'proudleut.com';

// /datenschutz und ein Impressum existieren im Frontend aktuell nicht als
// eigene Seiten (bestaetigt: kein app/datenschutz, kein app/impressum;
// Footer-Impressum-Link ist Platzhalter href="#"). Die bestehenden
// Formulare (AnfrageModal, KontaktFormular) verlinken trotzdem bereits auf
// /datenschutz -- diese Konstante haelt sich an dasselbe, bereits
// bestehende Muster, statt einen neuen, anders lautenden Verweis zu
// erfinden. Siehe CUTOVER.md fuer den notwendigen Owner-Schritt.
export const LEGAL_LINKS = {
  datenschutzUrl: 'https://proudleut.com/datenschutz',
  impressumUrl: 'https://proudleut.com/impressum',
} as const;
