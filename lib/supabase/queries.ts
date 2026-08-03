import { supabase } from './client'

export async function getBandFromSupabase(slug: string) {
  const { data, error } = await supabase
    .from('bands')
    .select(`
      *,
      band_profiles (
        short_description,
        main_text,
        slogan,
        meta_description,
        wedding_description,
        wedding_possible_playtimes,
        wedding_constellation,
        wedding_kidnapping_bride,
        wedding_moderation
      ),
      locations (*),
      media_assets (*),
      videos (*),
      social_profiles (*),
      reference_events (*),
      band_event_types ( event_types (*) ),
      band_band_types ( band_types (*) ),
      band_lineups ( lineups (*) ),
      band_moods ( sort_order, moods (*) ),
      band_repertoire_styles ( sort_order, repertoire_styles (*) ),
      band_services ( services (*) ),
      band_relations!band_relations_source_band_id_fkey (
        relation_type,
        rank,
        target_band:bands!band_relations_target_band_id_fkey (
          id,
          name,
          slug
        )
      )
    `)
    .eq('slug', slug)
    .eq('status', 'active')
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
      band_band_types ( is_primary, sort_order, band_types ( name, slug ) ),
      band_moods ( sort_order, moods ( name, slug, sort_order ) )
    `)
    .eq('status', 'active')
    .order('name', { ascending: true })

  return { data, error }
}
