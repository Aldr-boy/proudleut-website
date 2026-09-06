import { supabase } from '@/lib/supabase/client'

// Liest den kuratierten Hero-Bildwand-Pool: alle media_assets mit
// hero_wall = true, sortiert nach hero_wall_position (0-basiert,
// lueckenlos gepflegt durch public.update_hero_wall_selection, siehe
// supabase/fn_update_hero_wall_selection.sql). Wird sowohl von der
// Admin-Live-Vorschau (Paket 2, Schritt 2B) als auch vom Homepage-
// Cutover (Schritt 2D) verwendet -- eine einzige Datenzugriffsstelle,
// keine zweite Implementierung.
//
// Bewusst der oeffentliche Client (lib/supabase/client.ts, NEXT_PUBLIC_*
// Anon-Key), nicht der Admin-Client mit Service-Role-Key: dieselbe
// Leseoperation wird auch auf der oeffentlichen Homepage ausgefuehrt
// (Schritt 2D), media_assets ist dort bereits ueber RLS oeffentlich
// lesbar (siehe lib/supabase/queries.ts, getBandFromSupabase() liest
// media_assets identisch ueber denselben Client) -- kein Grund, hierfuer
// volle Schreibrechte samt RLS-Bypass zu verwenden.
export type HeroWallPoolImage = {
  id: string
  url: string
  heroFocus: string | null
}

export async function fetchHeroWallPool(): Promise<HeroWallPoolImage[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, url, hero_focus')
    .eq('hero_wall', true)
    .order('hero_wall_position', { ascending: true })

  if (error) {
    throw new Error(`fetchHeroWallPool: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    heroFocus: row.hero_focus,
  }))
}
