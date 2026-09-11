// Sechs Themen-Einstiege des neuen Bandfinder-Suchkopfs (Auftrag
// "Bandfinder-Redesign"). occasionSlug referenziert einen bestehenden
// lib/finderOccasions.ts::FINDER_OCCASIONS-Slug -- "Alle Bands" hat
// bewusst keinen Anlassfilter (null). Keine neue Taxonomie: alle Slugs
// existieren bereits real in FINDER_OCCASIONS.
export type BandFinderThemeKey =
  | 'alle'
  | 'hochzeit'
  | 'festzelt'
  | 'firmenfeier'
  | 'stadt-und-buergerfest'
  | 'konzert-club-festival'

export type BandFinderTheme = {
  key: BandFinderThemeKey
  label: string
  occasionSlug: string | null
}

export const BAND_FINDER_THEMES: BandFinderTheme[] = [
  { key: 'alle', label: 'Alle Bands', occasionSlug: null },
  { key: 'hochzeit', label: 'Hochzeit', occasionSlug: 'hochzeit' },
  { key: 'festzelt', label: 'Festzelt', occasionSlug: 'festzelt' },
  { key: 'firmenfeier', label: 'Firmenfeier', occasionSlug: 'firmenfeier' },
  { key: 'stadt-und-buergerfest', label: 'Stadt- & Bürgerfest', occasionSlug: 'stadt-und-buergerfest' },
  { key: 'konzert-club-festival', label: 'Konzert, Club & Festival', occasionSlug: 'konzert-club-festival' },
]

export type BandFinderThemeNavParams = {
  region: string | null
  suche: string
  bandtyp: string | null
  mood: string | null
}

export type BandFinderThemeNavItem = BandFinderTheme & {
  href: string
  active: boolean
}

// Reine Href-/Aktiv-Logik fuer die sechs Themen-Kacheln -- bewusst als
// eigene, testbare Funktion ausgelagert statt in BandExplorer.tsx inline
// gehalten (identisches Architekturmuster wie lib/bands/finderRouting.ts).
// Nutzt ausschliesslich die bereits bestehenden buildFinderFilterUrl()/
// buildOccasionNavUrl()-Funktionen -- keine neue Routing-Logik. Regeln
// (siehe Auftrag "Bandfinder-Redesign", Abschnitt 5):
//   - /bands ohne Anlassfilter -> "Alle Bands" aktiv
//   - /bands mit anlass=<occasionSlug> -> passendes Thema aktiv
//   - Themenseite mit lockedOccasion -> passendes Thema aktiv
//   - anderer Anlass ohne eigenen Kasten -> kein Thema aktiv
export function resolveBandFinderThemeNav(
  lockedOccasion: string | undefined,
  selectedCategory: string | null,
  params: BandFinderThemeNavParams,
  buildFinderFilterUrl: (baseRoute: string, params: BandFinderThemeNavParams) => string,
  buildOccasionNavUrl: (targetSlug: string, params: BandFinderThemeNavParams) => string
): BandFinderThemeNavItem[] {
  return BAND_FINDER_THEMES.map((theme) => {
    const href = theme.occasionSlug
      ? buildOccasionNavUrl(theme.occasionSlug, params)
      : buildFinderFilterUrl('/bands', params)
    const active = theme.occasionSlug
      ? lockedOccasion === theme.occasionSlug || (!lockedOccasion && selectedCategory === theme.occasionSlug)
      : !lockedOccasion && !selectedCategory
    return { ...theme, href, active }
  })
}
