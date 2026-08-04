// Reine, testbare Validierungs-/Fehlerabbildungslogik fuer die
// Kontaktintegritaet im Band-Admin (Block L-A1, Teilpaket 3). Ausgelagert
// aus app/admin/bands/new/actions.ts, damit sie ohne
// Next.js-Request-Scope (next/headers) unit-testbar ist -- dasselbe
// Muster wie lib/moods/slug.ts fuer app/admin/moods/actions.ts.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_CONTACT_EMAIL_LENGTH = 254;

export function isValidContactEmail(email: string): boolean {
  if (!email) return false;
  if (email.length > MAX_CONTACT_EMAIL_LENGTH) return false;
  if (/[\r\n]/.test(email)) return false;
  return EMAIL_REGEX.test(email);
}

// Bildet die SQLSTATE-Fehlercodes aus
// supabase/fn_create_band_with_primary_contact.sql auf verstaendliche
// Admin-Fehlermeldungen ab. Ein roher Postgres-23505 (Slug-Race zwischen
// Vorab-Check und Insert) faellt zusaetzlich auf den Slug-Fehler zurueck.
export function mapCreateBandRpcError(error: { code?: string; message?: string }): { field: string; message: string } {
  switch (error.code) {
    case 'BCC01':
      return { field: 'name', message: 'Name ist erforderlich (max. 200 Zeichen)' };
    case 'BCC02':
      return { field: 'slug', message: 'Nur Kleinbuchstaben, Zahlen und Bindestriche' };
    case 'BCC03':
      return { field: 'status', message: 'Ungültiger Status' };
    case 'BCC05':
    case '23505':
      return { field: 'slug', message: 'Dieser Slug ist bereits vergeben' };
    case 'BCC10':
      return { field: 'contact_email', message: 'Anfrage-E-Mail ist erforderlich' };
    case 'BCC11':
      return { field: 'contact_email', message: 'Bitte eine gültige Anfrage-E-Mail-Adresse eingeben' };
    default:
      return { field: 'form', message: `Datenbankfehler: ${error.message ?? 'unbekannt'}` };
  }
}
