// hero_focus ist in der DB nullable; NULL bedeutet fachlich 'center'
// (siehe docs/spezifikation-hero-bildwand.md Abschnitt 7 und
// supabase/media_assets_hero_wall_columns.sql). Diese Funktion kapselt
// genau diese eine Umwandlung, damit sie im Admin-Editor und in
// Server Actions nicht mehrfach leicht unterschiedlich implementiert wird.

export type HeroFocus = 'top' | 'center' | 'bottom'

export function resolveHeroFocus(value: string | null | undefined): HeroFocus {
  return value === 'top' || value === 'center' || value === 'bottom' ? value : 'center'
}
