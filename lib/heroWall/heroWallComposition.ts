// Bildplatz-Definition fuer die neue Split-Hero-Komposition (Auftrag
// "Startseiten-Hero-Redesign"). Loest die vorherige 40-Slot-Paternoster-
// Logik (ehemals simulateHeroWallSlots.ts) vollstaendig ab -- andere
// Geometrie (Split-Layout mit gekippter Bildwelt statt Vollflaechen-
// Ueberlagerung), andere Zuordnungsregel:
//
//   Bildplatz n erhaelt IMMER Poolbild n (pool[n]).
//
// Direkte 1:1-Zuordnung nach dem bestehenden hero_wall_position-Sortierung
// (siehe fetchHeroWallPool.ts) -- kein Modulo-Wrap, kein Shuffle, keine
// Wiederholung zum Auffuellen. Fehlt an einer Position ein Poolbild
// (Pool kleiner als der Bedarf des Breakpoints), bleibt der Bildplatz ein
// Platzhalter (siehe HeroWall.tsx) statt ein anderes Bild zu wiederholen.
//
// Alle Breakpoints verwenden DIESELBE Zuordnung: sie zeigen lediglich ein
// PREFIX der kanonischen Desktop-Liste (weniger Bildplaetze auf kleineren
// Screens) und ordnen dieses Prefix in eine eigene, zum Breakpoint
// passende Spaltenzahl (Tracks) um -- exakt das, was der Auftrag mit
// "duerfen Plaetze ausblenden oder umordnen" meint. Kein Breakpoint zeigt
// je ein Poolbild, das nicht auch auf jedem breiteren Breakpoint an
// mindestens derselben Position erscheint.
export type HeroWallBreakpoint = 'mobile' | 'tablet' | 'tabletWide' | 'desktop'

export const HERO_WALL_TRACK_COUNT: Record<HeroWallBreakpoint, number> = {
  mobile: 3,
  tablet: 3,
  tabletWide: 4,
  desktop: 5,
}

export const HERO_WALL_IMAGES_PER_TRACK: Record<HeroWallBreakpoint, number> = {
  mobile: 2,
  tablet: 3,
  tabletWide: 3,
  desktop: 4,
}

export const HERO_WALL_SLOT_COUNT: Record<HeroWallBreakpoint, number> = {
  mobile: HERO_WALL_TRACK_COUNT.mobile * HERO_WALL_IMAGES_PER_TRACK.mobile,
  tablet: HERO_WALL_TRACK_COUNT.tablet * HERO_WALL_IMAGES_PER_TRACK.tablet,
  tabletWide: HERO_WALL_TRACK_COUNT.tabletWide * HERO_WALL_IMAGES_PER_TRACK.tabletWide,
  desktop: HERO_WALL_TRACK_COUNT.desktop * HERO_WALL_IMAGES_PER_TRACK.desktop,
}

// Desktop definiert den groessten Bedarf -- alle anderen Breakpoints sind
// Prefixe dieser kanonischen Obergrenze (siehe Modulkommentar oben).
export const HERO_WALL_CANONICAL_SLOT_COUNT = HERO_WALL_SLOT_COUNT.desktop

export type HeroWallSlot<T> = { index: number; image: T | null }

// Baut die Tracks (Spalten) eines Breakpoints: Track i erhaelt
// KONTINUIERLICHE, aufsteigende Bildplaetze aus dem gemeinsamen Prefix
// (Track 0 = die ersten imagesPerTrack Plaetze, Track 1 die naechsten
// usw.) -- dasselbe Grundprinzip wie die abgeloeste Spec ("Spalte i
// erhaelt Slots i*8..i*8+7"), nur mit den kleineren Zahlen dieser
// Komposition. `image: null` markiert einen unbesetzten Bildplatz
// (Platzhalter) -- niemals eine Wiederholung eines anderen Poolbilds.
export function buildHeroWallTracks<T>(
  pool: readonly T[],
  breakpoint: HeroWallBreakpoint
): HeroWallSlot<T>[][] {
  const trackCount = HERO_WALL_TRACK_COUNT[breakpoint]
  const perTrack = HERO_WALL_IMAGES_PER_TRACK[breakpoint]
  const tracks: HeroWallSlot<T>[][] = []
  for (let t = 0; t < trackCount; t++) {
    const track: HeroWallSlot<T>[] = []
    for (let p = 0; p < perTrack; p++) {
      const index = t * perTrack + p
      const image = index < pool.length ? pool[index] : null
      track.push({ index, image })
    }
    tracks.push(track)
  }
  return tracks
}

// Admin-Transparenz (Auftrag Abschnitt 5): wie viele der ausgewaehlten
// Poolbilder werden von dieser Komposition ueberhaupt an einem Bildplatz
// verwendet, wie viele bleiben ungenutzt. Breakpoint-parametrisiert (Admin-
// Adaption "Bedienbarkeit"): der Editor hat einen Vorschau-Umschalter
// Mobile/Tablet/Desktop und muss die Zahl fuer die JEWEILS gewaehlte
// Ansicht zeigen (Beispiel Auftrag: "29 ausgewaehlt - 20 im Desktop-Hero
// verwendet - 9 weitere ausgewaehlt"), nicht nur fuer Desktop. Default
// bleibt 'desktop' (bisheriger, groesster Bedarf) fuer Aufrufer ohne
// eigenen Breakpoint-Kontext.
export function countUsedHeroWallSlots(
  poolLength: number,
  breakpoint: HeroWallBreakpoint = 'desktop'
): {
  used: number
  total: number
  unused: number
} {
  const total = HERO_WALL_SLOT_COUNT[breakpoint]
  const used = Math.min(poolLength, total)
  return { used, total, unused: Math.max(poolLength - total, 0) }
}
