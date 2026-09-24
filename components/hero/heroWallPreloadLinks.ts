import { getImageProps } from 'next/image'
import { HERO_WALL_IMAGES_PER_TRACK, type HeroWallBreakpoint } from '@/lib/heroWall/heroWallComposition'
import type { HeroWallImage } from './HeroWall'

// EXPERIMENT Variante S ("Media-Query-Preloads", Auftrag "Hero-Wall-
// Preloads pro Breakpoint pruefen und experimentell optimieren"):
// next/images automatische `preload`-Prop-Injektion kann keinem
// CSS-Media-Query zugeordnet werden -- bestaetigt per Quellcode-Lektuere
// (node_modules/next/dist/client/image-component.js,
// node_modules/next/dist/shared/lib/get-img-props.js: die generierte
// <link rel="preload">-Ressource enthaelt keinerlei "media"-Feld). Da alle
// vier Breakpoint-Varianten gleichzeitig serverseitig gerendert werden
// (nur CSS blendet die inaktiven aus), lud der Browser bisher alle 6
// automatischen Preloads bei jedem Seitenaufruf, unabhaengig vom
// tatsaechlichen Viewport (siehe Diagnosebericht).
//
// Ersatz hier: eigene, media-gebundene
// <link rel="preload" as="image" media=... imageSrcSet=... imageSizes=...>
// -Elemente -- ein Link pro vormals eager geladener Kachelposition, mit
// derselben Bildquelle/denselben Groessen wie die zugehoerige <Image>-
// Kachel (ueber next/images `getImageProps`, damit garantiert dasselbe
// srcSet/dieselbe URL entsteht -- kein zweiter, abweichender Download).
// Nur in diesem isolierten Experiment-Worktree.

// Media-Query-Grenzen aus den tatsaechlichen Tailwind-v4-Breakpoints
// (node_modules/tailwindcss/theme.css: --breakpoint-md:48rem=768px,
// --breakpoint-lg:64rem=1024px, --breakpoint-xl:80rem=1280px) und den
// BREAKPOINT_WRAPPER_CLASS-Sichtbarkeitsklassen in HeroWall.tsx
// abgeleitet (mobile:'flex md:hidden', tablet:'hidden md:flex lg:hidden',
// tabletWide:'hidden lg:flex xl:hidden', desktop:'hidden xl:flex') --
// exklusiv und lueckenlos ueber alle Viewportbreiten.
export const HERO_WALL_PRELOAD_MEDIA: Record<HeroWallBreakpoint, string> = {
  mobile: '(max-width: 767.98px)',
  tablet: '(min-width: 768px) and (max-width: 1023.98px)',
  tabletWide: '(min-width: 1024px) and (max-width: 1279.98px)',
  desktop: '(min-width: 1280px)',
}

// Poolplatz-Indizes der vormals eager geladenen Kacheln je Breakpoint --
// dieselbe Positions-Logik wie zuvor in TrackSet (t<2 && p===0), hier
// vorab in Poolindizes uebersetzt ("Bildplatz n = Poolbild n", siehe
// heroWallComposition.ts: index = t*perTrack+p). Fuer Mobile: die
// tatsaechlich LCP-relevante Kachel (Track 1, Position 1) -- in allen
// bisherigen Messungen dieses Pools durchgehend `psyco-dad/hero.webp` bei
// `w=384`, siehe Abschlussbericht "Hero-Wall-Preloads pro Breakpoint
// pruefen". Nur EIN mobiler Preload -- keine Messung begruendet eine
// zweite mobile Kachel.
const EAGER_POOL_INDICES: Record<HeroWallBreakpoint, number[]> = {
  mobile: [1 * HERO_WALL_IMAGES_PER_TRACK.mobile + 1],
  tablet: [0 * HERO_WALL_IMAGES_PER_TRACK.tablet + 0, 1 * HERO_WALL_IMAGES_PER_TRACK.tablet + 0],
  tabletWide: [0 * HERO_WALL_IMAGES_PER_TRACK.tabletWide + 0, 1 * HERO_WALL_IMAGES_PER_TRACK.tabletWide + 0],
  desktop: [0 * HERO_WALL_IMAGES_PER_TRACK.desktop + 0, 1 * HERO_WALL_IMAGES_PER_TRACK.desktop + 0],
}

export type HeroWallPreloadDescriptor = {
  key: string
  media: string
  imageSrcSet: string
  imageSizes: string
}

// `sizesByBreakpoint` muss fuer jeden Breakpoint denselben sizes-String
// liefern, den die zugehoerige <Image>-Kachel an Position p=0 tatsaechlich
// verwendet (siehe HeroWall.tsx, PRELOAD_SIZES_BY_BREAKPOINT) -- Aufrufer-
// Verantwortung, damit hier keine zweite, abweichende sizes-Berechnung
// entsteht.
export function buildHeroWallPreloadDescriptors(
  images: HeroWallImage[],
  sizesByBreakpoint: Record<HeroWallBreakpoint, string>
): HeroWallPreloadDescriptor[] {
  const descriptors: HeroWallPreloadDescriptor[] = []
  for (const breakpoint of Object.keys(EAGER_POOL_INDICES) as HeroWallBreakpoint[]) {
    for (const poolIndex of EAGER_POOL_INDICES[breakpoint]) {
      const image = images[poolIndex]
      if (!image) continue
      const { props } = getImageProps({
        src: image.url,
        alt: '',
        fill: true,
        sizes: sizesByBreakpoint[breakpoint],
      })
      if (!props.srcSet) continue
      descriptors.push({
        key: `${breakpoint}-${poolIndex}`,
        media: HERO_WALL_PRELOAD_MEDIA[breakpoint],
        imageSrcSet: props.srcSet,
        imageSizes: props.sizes ?? sizesByBreakpoint[breakpoint],
      })
    }
  }
  return descriptors
}
