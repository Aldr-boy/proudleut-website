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

// Getrennte Template-Versionen je Mailtyp (Block "Bandanfrage-Mail V3",
// A2-Entscheidung): Band-Mail und Veranstalter-Bestaetigung duerfen sich
// unabhaengig voneinander weiterentwickeln, ohne dass eine gemeinsame
// Konstante versehentlich beide gleichzeitig veraendert. Beide Werte sind
// nach Erstversand eingefroren: bereits gesendete/persistierte Zeilen
// behalten ihre urspruengliche template_version dauerhaft (siehe
// lib/anfrage/service.ts, Retry-Dispatch). Eine spaetere Aenderung an der
// Band-Mail-Gestaltung erhoeht BAND_TEMPLATE_VERSION auf einen neuen Wert,
// veraendert v1/v2 aber nicht rueckwirkend.
export const BAND_TEMPLATE_VERSION = 'v2';
export const CONFIRMATION_TEMPLATE_VERSION = 'v1';

export const ANFRAGE_SENDER_EMAIL = 'anfrage@proudleut.com';
export const ANFRAGE_SENDER_NAME = 'proudleut.com';

// Feste, oeffentliche Supabase-Storage-Assets fuer die Band-Mail V3
// (proudleut.com zeigt vor dem separat geplanten L-A6-Domain-Cutover noch
// nicht auf den Next.js-Build -- ein unter public/ abgelegtes Asset waere
// deshalb keine stabile, versandtaugliche URL). Beide Dateien sind
// proudleuts eigene, umgebungsunabhaengige Markenassets und bewusst als
// feste Production-URL hinterlegt, nicht ueber NEXT_PUBLIC_SUPABASE_URL
// hergeleitet.
export const BAND_MAIL_LOGO_URL =
  'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/proudleut/proudleut_Logo_rgb_72dpi.png';
export const BAND_MAIL_PORTRAIT_URL =
  'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/proudleut/Alexander%20Dressler.jpg';

// /datenschutz (app/datenschutz/page.tsx) und /impressum
// (app/impressum/page.tsx) sind seit Block "Impressum und Datenschutz"
// reale, oeffentlich erreichbare Seiten mit dem uebernommenen, freigegebenen
// Webflow-Rechtstext. Der Footer-Link verweist ebenfalls dorthin, der alte
// Pfad /datenschutzhinweise leitet dauerhaft (308) auf /datenschutz weiter
// (next.config.ts). Diese Konstante wurde nicht geaendert, da sie schon
// vorher exakt auf diese kanonischen Pfade zeigte.
export const LEGAL_LINKS = {
  datenschutzUrl: 'https://proudleut.com/datenschutz',
  impressumUrl: 'https://proudleut.com/impressum',
} as const;
