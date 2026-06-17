import { supabase } from './client'

export async function getBandFromSupabase(slug: string) {
  const { data, error } = await supabase
    .from('bands')
    .select(`
      *,
      band_profiles (*),
      locations (*),
      media_assets (*),
      videos (*),
      social_profiles (*),
      reference_events (*),
      band_event_types ( event_types (*) ),
      band_band_types ( band_types (*) ),
      band_lineups ( lineups (*) ),
      band_sound_worlds ( sound_worlds (*) ),
      band_moods ( moods (*) ),
      band_repertoire_styles ( repertoire_styles (*) ),
      band_services ( services (*) ),
      band_relations!band_relations_source_band_id_fkey (
        relation_type,
        rank,
        reason,
        target_band:bands!band_relations_target_band_id_fkey (
          id,
          name,
          slug
        )
      )
    `)
    .eq('slug', slug)
    .single()

  return { data, error }
}

export async function getAllBandsFromSupabase() {
  const { data, error } = await supabase
    .from('bands')
    .select(`
      id,
      name,
      slug,
      status,
      band_profiles ( short_description ),
      locations ( city_name, landkreis, regierungsbezirk, plz, latitude, longitude ),
      media_assets ( url, alt_text, role, sort_order ),
      band_event_types ( sort_order, event_types ( name, slug ) ),
      band_band_types ( is_primary, sort_order, band_types ( name, slug ) )
    `)
    .eq('status', 'active')
    .order('name', { ascending: true })

  return { data, error }
}
