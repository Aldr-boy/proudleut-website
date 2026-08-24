// Zentrale Konstanten fuer die Bandvorstellung (Paket 2A, "Bandseite
// anfragen"). Laengenbegrenzungen muessen exakt zu den CHECK-Constraints in
// supabase/band_introductions_migration.sql passen -- bei Aenderung an
// einer Stelle immer auch die andere pruefen.

export const MAX_ADDITIONAL_LINKS = 6;

export const MAX_LENGTHS = {
  bandName: 200,
  region: 200,
  websiteUrl: 500,
  additionalLinkUrl: 2048,
  description: 1500,
  descriptionMin: 30,
  firstName: 100,
  lastName: 100,
  nickname: 100,
  email: 254,
  phone: 40,
  idempotencyKeyMin: 8,
  idempotencyKeyMax: 128,
} as const;

// Aktuelle Version der Datenschutzerklaerung, gegen die der Consent
// dokumentiert wird -- identischer Wert/dieselbe Quelle wie
// lib/anfrage/constants.ts::CURRENT_DATENSCHUTZ_VERSION (eine Erklaerung,
// eine Version, unabhaengig davon, welches Formular sie zeigt). Wird
// ausschliesslich serverseitig gesetzt, nie vom Client uebernommen.
export const CURRENT_DATENSCHUTZ_VERSION = 'v1-2026';

// Absenderidentitaet bewusst von lib/anfrage/constants.ts uebernommen (nicht
// neu erfunden): dieselbe, in Resend bereits verifizierte proudleut-Domain
// versendet fuer beide Formulare -- eine zweite, eigens fuer diese Mail
// verifizierte Absenderadresse waere unnoetiger Zusatzaufwand ohne
// fachlichen Mehrwert.
export { ANFRAGE_SENDER_EMAIL as BAND_INTRO_SENDER_EMAIL, ANFRAGE_SENDER_NAME as BAND_INTRO_SENDER_NAME } from '../anfrage/constants.ts';

export const BAND_INTRO_TEMPLATE_VERSION = 'v1';

// /datenschutz -- dieselbe Quelle wie lib/anfrage/constants.ts::LEGAL_LINKS,
// hier erneut exportiert, damit dieser Ordner nicht fuer eine einzelne
// Konstante auf lib/anfrage verweisen muss.
export const LEGAL_LINKS = {
  datenschutzUrl: 'https://proudleut.com/datenschutz',
  impressumUrl: 'https://proudleut.com/impressum',
} as const;

// Interne Benachrichtigungsadresse (Xandi). Bewusst per Env-Var statt
// hartcodierter Adresse (Auftrag Abschnitt 31: "Keine Mailadresse hart
// codieren"). Fehlt die Variable, wird ausschliesslich der interne
// Benachrichtigungsschritt uebersprungen (Fall C, sauber geloggt) -- die
// Bandvorstellung bleibt gespeichert, die Bestaetigungsmail an die Band geht
// unabhaengig davon raus.
export function getBandIntroNotifyEmail(): string | null {
  const raw = process.env.BAND_INTRO_NOTIFY_EMAIL;
  return raw && raw.trim() !== '' ? raw.trim() : null;
}
