import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResolveBandsResult, ResolvedBand } from './types.ts';

type BandContactRow = { email: string | null; is_primary_inquiry: boolean };
type BandRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  band_contacts: BandContactRow[] | null;
};

// Loest die vom Client als reine Lookup-Keys gesendeten Slugs AUSSCHLIESSLICH
// serverseitig gegen Supabase auf. Bandname und Empfaengeradresse kommen
// nie vom Client (DoD 6/7). Kann eine Band nicht eindeutig als aktive Band
// mit gueltigem primaeren Anfragekontakt aufgeloest werden, wird die
// GESAMTE Anfrage abgelehnt -- kein Teil-Insert, keine stillschweigende
// Entfernung der Band (siehe Teilpaket 5 "Band ohne Kontakt").
//
// Gibt die Bands in der vom Aufrufer uebergebenen Reihenfolge zurueck
// (relevant fuer die spaetere anfrage_bands.position-Zuweisung).
export async function resolveActiveBandsWithContact(
  client: SupabaseClient,
  bandSlugs: string[]
): Promise<ResolveBandsResult> {
  const { data, error } = await client
    .from('bands')
    .select('id, name, slug, status, band_contacts(email, is_primary_inquiry)')
    .in('slug', bandSlugs);

  if (error) {
    throw new Error(`Bandauflösung fehlgeschlagen: ${error.message}`);
  }

  const bySlug = new Map<string, BandRow>();
  for (const row of (data ?? []) as BandRow[]) {
    bySlug.set(row.slug, row);
  }

  const resolved: ResolvedBand[] = [];
  for (const slug of bandSlugs) {
    const band = bySlug.get(slug);
    if (!band || band.status !== 'active') {
      return { ok: false, bandName: band?.name ?? slug };
    }
    const primaryContact = (band.band_contacts ?? []).find(
      (c) => c.is_primary_inquiry === true && !!c.email
    );
    if (!primaryContact?.email) {
      return { ok: false, bandName: band.name };
    }
    resolved.push({ bandId: band.id, name: band.name, recipientEmail: primaryContact.email });
  }

  return { ok: true, bands: resolved };
}
