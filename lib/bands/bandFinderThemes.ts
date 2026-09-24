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

// Sofort-Feedback beim Klick (Auftrag "Klick-/Aktivzustand im Bandfinder"):
// reine, framework-unabhaengige Kombinationslogik aus BandExplorer.tsx
// ausgelagert, damit sie direkt (ohne React/DOM/useLinkStatus-Mock)
// testbar ist -- identisches Architekturmuster wie resolveBandFinderThemeNav
// oben. pendingTileKey kommt aus useLinkStatus() der einzelnen Kachel
// (siehe components/bands/BandExplorer.tsx::ThemeTileMedia), theme.active
// bleibt unveraendert die fachliche Wahrheit aus resolveBandFinderThemeNav.
//
// Regel: Solange irgendeine Kachel als "pending" gemeldet wurde, gewinnt
// ausschliesslich sie die Aktiv-Optik (auch wenn theme.active fuer eine
// ANDERE Kachel noch true ist, weil die Ziel-URL/Server-Daten noch nicht
// aktualisiert sind) -- nie zwei Kacheln gleichzeitig aktiv. Ohne
// pendingTileKey (null) gilt unveraendert theme.active.
export function resolveThemeTileActive(
  pendingTileKey: BandFinderThemeKey | null,
  themeKey: BandFinderThemeKey,
  themeActive: boolean
): boolean {
  return pendingTileKey === null ? themeActive : pendingTileKey === themeKey
}

// Reducer fuer den pendingTileKey-State: eine Kachel, die "pending" meldet,
// wird sofort zur neuen pendingTileKey (der zuletzt geklickte Link gewinnt).
// Ein "idle"(false)-Report wird nur uebernommen, wenn er von der Kachel
// kommt, die den State aktuell haelt -- verhindert ein Race, falls die
// zuvor aktive/gerade verlassene Kachel ihr eigenes idle erst NACH einem
// neuen Klick auf eine andere Kachel meldet (sonst wuerde dieses spaete
// idle den neuen, korrekten pendingTileKey faelschlich wieder loeschen).
export function reduceTilePendingKey(
  current: BandFinderThemeKey | null,
  key: BandFinderThemeKey,
  isPending: boolean
): BandFinderThemeKey | null {
  if (isPending) return key
  return current === key ? null : current
}
