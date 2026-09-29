// Feldlaengen fuer /api/kontakt (Klasse-A-Fix, Auftrag L-A1b). Bewusst eigene,
// kleine Konstanten statt lib/anfrage/constants.ts::MAX_LENGTHS zu importieren
// -- das Kontaktformular hat ein anderes, kleineres Feldset (kein Datum, kein
// Ort, keine Bandauswahl) und soll unabhaengig von /api/anfrage aenderbar
// bleiben.
export const MAX_LENGTHS = {
  anlass: 200,
  vorname: 100,
  nachname: 100,
  email: 254,
  telefon: 40,
  nachricht: 5000,
} as const;

export const MIN_SUBMIT_TIME_MS = 3000;

// Absenderidentitaet bewusst von lib/anfrage/constants.ts uebernommen (nicht
// neu erfunden): dieselbe, in Resend bereits verifizierte proudleut-Domain
// versendet auch fuer dieses Formular -- eine zweite, eigens verifizierte
// Absenderadresse waere unnoetiger Zusatzaufwand ohne fachlichen Mehrwert
// (identische Begruendung wie lib/bandIntro/constants.ts).
export { ANFRAGE_SENDER_EMAIL as KONTAKT_SENDER_EMAIL, ANFRAGE_SENDER_NAME as KONTAKT_SENDER_NAME } from '../anfrage/constants.ts';

// Empfaengeradresse (Xandi) ausschliesslich per ENV, kein Default, kein
// Hardcoding (Freigabe-Auflage, Auftrag L-A1b). Anders als
// lib/bandIntro/constants.ts::getBandIntroNotifyEmail() (dort optional, der
// Versand wird bei fehlender Variable nur uebersprungen) ist diese Adresse
// hier das EINZIGE Ziel der Nachricht -- der Aufrufer (lib/kontakt/service.ts)
// behandelt ein null-Ergebnis deshalb fail-closed (temporarily_unavailable),
// nicht als uebersprungenen Nebenschritt.
export function getKontaktNotifyEmail(): string | null {
  const raw = process.env.KONTAKT_NOTIFY_EMAIL;
  return raw && raw.trim() !== '' ? raw.trim() : null;
}
