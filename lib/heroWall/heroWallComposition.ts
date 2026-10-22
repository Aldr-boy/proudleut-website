// Bildplatz-Definition fuer die Split-Hero-Komposition (Auftrag
// "Hero-Bildwand: horizontale Steuerung", Option 1 -- Round-Robin).
// Loest die vorherige 40-Slot-Paternoster-Logik (ehemals
// simulateHeroWallSlots.ts) vollstaendig ab -- andere Geometrie
// (Split-Layout mit gekippter Bildwelt statt Vollflaechen-Ueberlagerung),
// andere Zuordnungsregel:
//
//   Poolbild n landet in Spur (n mod Spurenzahl), an Zeile
//   floor(n / Spurenzahl) dieser Spur (Round-Robin statt
//   zusammenhaengender Bloecke).
//
// Direkte, deterministische Zuordnung nach dem bestehenden
// hero_wall_position-Sortierung (siehe fetchHeroWallPool.ts) -- kein
// Shuffle, keine Wiederholung zum Auffuellen. Fehlt an einer Position ein
// Poolbild (Pool kleiner als der Bedarf des Breakpoints), bleibt der
// Bildplatz ein Platzhalter (siehe HeroWall.tsx) statt ein anderes Bild
// zu wiederholen.
//
// Welche Poolindizes ueberhaupt verwendet werden (0..HERO_WALL_SLOT_COUNT-1
// je Breakpoint), bleibt unveraendert ein PREFIX der kanonischen
// Desktop-Liste -- Verkleinern des Viewports schneidet weiterhin nur das
// Ende der Liste ab, holt nie ein anderes Bild herein. Anders als zuvor
// landet ein bestimmter Poolindex aber NICHT mehr zwangslaeufig in
// derselben Spur auf jedem Breakpoint (die Spurenzahl unterscheidet sich
// je Breakpoint: 5/4/3/3) -- das ist hier gewollt: die vorhandenen
// Auf-/Ab-Pfeile im Admin-Editor wirken dadurch automatisch auch
// horizontal, benachbarte Poolbilder verteilen sich auf verschiedene
// Spuren statt sich in einer einzigen zu buendeln.
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

// Baut die Tracks (Spalten) eines Breakpoints per Round-Robin: Spur t,
// Zeile r erhaelt Poolindex (r * trackCount + t) -- Track 0 bekommt Index
// 0, trackCount, 2*trackCount, ...; Track 1 bekommt 1, trackCount+1, ...
// usw. Jeder Poolindex erscheint in genau einer Spur, an genau einer
// Zeile (bijektive Zuordnung ueber den gesamten Prefix, keine Duplikate).
// Innerhalb einer Spur bleibt die Reihenfolge stabil aufsteigend nach
// Poolindex (Zeile 0 < Zeile 1 < ...). `image: null` markiert einen
// unbesetzten Bildplatz (Platzhalter, siehe HeroWall.tsx) -- niemals eine
// Wiederholung eines anderen Poolbilds, auch wenn eine Spur dadurch
// weniger echte Bilder traegt als eine andere.
export function buildHeroWallTracks<T>(
  pool: readonly T[],
  breakpoint: HeroWallBreakpoint
): HeroWallSlot<T>[][] {
  const trackCount = HERO_WALL_TRACK_COUNT[breakpoint]
  const perTrack = HERO_WALL_IMAGES_PER_TRACK[breakpoint]
  const tracks: HeroWallSlot<T>[][] = []
  for (let t = 0; t < trackCount; t++) {
    const track: HeroWallSlot<T>[] = []
    for (let r = 0; r < perTrack; r++) {
      const index = r * trackCount + t
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
