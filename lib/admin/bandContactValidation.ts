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

export type ContactWriteErrorCode =
  | 'missing_fields'
  | 'too_long'
  | 'invalid_role'
  | 'invalid_email'
  | 'duplicate_role'
  | 'primary_conflict'
  | 'check_failed'
  | 'invalid_contact'
  | 'primary_email_required_active'
  | 'db_error';

// Bildet die SQLSTATE-Fehlercodes aus
// supabase/fn_set_primary_inquiry_contact.sql (Codex-Nachtrag PR #26,
// zweiter Review, Befund 1+2 -- create_band_contact()/update_band_contact())
// auf die bestehenden Kontakt-Fehlercodes/Admin-Meldungen in
// app/admin/bands/[id]/actions.ts ab. CC001/CC010/CC011 sind Existenz-/
// Zugehoerigkeitsprobleme, CC002-CC006 spiegeln die bisherige
// clientseitige validateContact()-Klassifizierung, CC007 ist der bereits
// bestehende 'primary_email_required_active'-Fall. Ein roher Postgres-
// 23505 (Race gegen die UNIQUE-Indizes fuer Rolle/Primaerkontakt) bzw.
// 23514 (CHECK-Constraint) fallen zusaetzlich auf die bereits etablierten
// Faelle zurueck (identisches Muster wie das bisherige pgContactErrorCode).
export function mapContactWriteError(error: { code?: string; message?: string }): ContactWriteErrorCode {
  switch (error.code) {
    case 'CC001':
    case 'CC010':
    case 'CC011':
      return 'invalid_contact';
    case 'CC002':
      return 'missing_fields';
    case 'CC003':
      return 'too_long';
    case 'CC004':
      return 'invalid_email';
    case 'CC005':
      return 'invalid_role';
    case 'CC006':
      return 'duplicate_role';
    case 'CC007':
      return 'primary_email_required_active';
    case '23505':
      if (error.message?.includes('idx_band_contacts_unique_role')) return 'duplicate_role';
      if (error.message?.includes('idx_band_contacts_one_primary_per_band')) return 'primary_conflict';
      return 'duplicate_role';
    case '23514':
      return 'check_failed';
    default:
      return 'db_error';
  }
}
