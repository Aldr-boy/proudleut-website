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
  alt: string
}

// Auftrag "Alt-Texte Startseite": media_assets.alt_text ist die Quelle fuer
// die Kachel-Alt-Texte. Sechs gespeicherte Texte beschreiben ein anderes
// Bild oder mehr, als sichtbar ist (beim Ansehen geprueft) -- bis sie in der
// Bilddatenbank korrigiert sind, gilt hier der geprueft passende Text. Danach
// kann der jeweilige Eintrag entfallen.
const ALT_OVERRIDES: Record<string, string> = {
  // Saustoimusi hero.webp: acht (nicht neun) Musiker sichtbar
  '8452972d-5782-47c4-bb04-6c9b729c4cdc':
    'Die Musiker der Partyband Saustoimusi in Tracht gehen lachend durch eine Wiese im Abendlicht.',
  // San2 thumbnail.webp: Portrait, nicht die Live-Session des Hero-Bilds
  '56f65522-ac42-4c6c-987b-b4c2f112636d':
    'Porträt von San2: Sänger mit hellem Hut und Bart singt mit geschlossenen Augen in ein Mikrofon. Sepia-Aufnahme.',
  // May Vibes gallery-01.webp: Auftritt mit tanzendem Kind, keine Produktionshalle
  'fc0a5568-bb6b-4ea8-8e25-0c1ea2e451d5':
    'Die Band May Vibes spielt bei einer Feier mit Gitarre, Kontrabass und Schlagzeug, während ein kleines Mädchen im Tüllkleid tanzt.',
  // Heimatfieber hero-ec44c989...webp: Studioportrait, keine Party
  'a6057943-fb89-4457-9934-9ec5fa34e72d':
    'Die fünf Musiker der Partyband Heimatfieber in Tracht ballen vor grünem Hintergrund lachend die Fäuste.',
  // LPC hero.webp: nur Musiker im Freien zu sehen, kein Brautpaar erkennbar
  'f2cb97be-5abd-4877-ad5e-68ae1f706b8c':
    'Musiker der Partyband LPC mit Klarinette, Gitarre und Kontrabass lachen im Freien in die Kamera.',
  // Bigband Steinbach gallery-03.webp: Bläsersatz sichtbar, keine Streicher erkennbar
  '4cf18045-592f-4ef7-b59c-6b07969ee177':
    'Die Bigband Steinbach auf einer beleuchteten Bühne mit Bläsersatz, Schlagzeug und Sängerin vor Publikum.',
}

export async function fetchHeroWallPool(): Promise<HeroWallPoolImage[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, url, hero_focus, alt_text')
    .eq('hero_wall', true)
    .order('hero_wall_position', { ascending: true })

  if (error) {
    throw new Error(`fetchHeroWallPool: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    heroFocus: row.hero_focus,
    alt: ALT_OVERRIDES[row.id] ?? row.alt_text ?? '',
  }))
}
