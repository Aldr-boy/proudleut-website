import { supabase } from '../supabase/client'

// Oeffentliche Personenabfrage (Musiker-/Personenebene V1, Paket 4B).
// Nutzt denselben anon-Client wie lib/supabase/queries.ts::getBandFromSupabase
// -- die RLS-Policy people_public_read (status='active') ist die alleinige
// Sichtbarkeitsgrenze, kein service_role, keine zusaetzliche Filterung
// hier. Eine draft/archivierte Person liefert dadurch schlicht 0 Zeilen;
// .single() macht das zu einem error, den der Aufrufer (app/musiker/[slug]/
// page.tsx) als notFound() behandelt -- identisches Prinzip wie bei Baendern.
export async function getPersonBySlugFromSupabase(slug: string) {
  const { data, error } = await supabase
    .from('people')
    .select(`
      id,
      name,
      slug,
      bio,
      image_url,
      website_url,
      approved_at,
      band_memberships (
        role,
        sort_order,
        bands ( id, name, slug, media_assets ( url, alt_text, role, sort_order ) ),
        band_membership_instruments (
          sort_order,
          instruments ( name, slug, sort_order )
        )
      ),
      person_links (
        id,
        label,
        url,
        sort_order
      ),
      person_credits (
        id,
        name,
        sort_order
      )
    `)
    .eq('slug', slug)
    .single()

  return { data, error }
}
