'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import {
  buildHeroWallTracks,
  HERO_WALL_TRACK_COUNT,
  type HeroWallBreakpoint,
  type HeroWallSlot,
} from '@/lib/heroWall/heroWallComposition'
import { resolveHeroFocus } from '@/lib/heroWall/resolveHeroFocus'
import { HeroLogoMarquee } from './HeroLogoMarquee'
import { buildHeroWallPreloadDescriptors } from './heroWallPreloadLinks'

// Startseiten-Hero-Redesign, Nachgang "Komposition & weiche Übergänge":
// Text und Bildwelt sind keine zwei nebeneinander liegenden Flex-Spalten
// mit hartem Rand mehr, sondern zwei sich überlappende, absolut
// positionierte Ebenen in EINEM gemeinsamen Szenencontainer (ab md) --
// eine dazwischenliegende, ungedrehte Verlaufsebene blendet den
// Übergang weich. Auf Mobile bleibt die einfache Stapel-Anordnung im
// Dokumentfluss erhalten (keine seitliche Schnittkante) -- visuell
// jetzt Bildwelt zuerst, Text darunter, Logozeile unten (Nachbesserung
// "Feinschliff Bandzeile", Abschnitt 2), technisch aber weiterhin per
// CSS `order` auf Basis von Text-vor-Bildern im JSX, siehe Kommentare an
// den beiden Spalten unten.
//
// children (HeroContent) wird weiterhin von einer Server-Component
// (app/page.tsx) hereingereicht -- dieselbe children-Slot-Technik wie
// zuvor, damit der reine Text-/Button-Inhalt serverseitig gerendert
// bleibt, obwohl HeroWall selbst wegen des Pause-Buttons 'use client'
// sein muss.
//
// Bildplatz-Zuordnung: siehe lib/heroWall/heroWallComposition.ts
// (Bildplatz n = Poolbild n, kein Wrap/Shuffle/Duplikat) -- unveraendert.
export type HeroWallImage = {
  id: string
  url: string
  heroFocus: string | null
}

// Reale Seitenverhaeltnisse aus dem Hero-Studio-Code (Abschnitt 1,
// Beispiele 1.18/0.70/0.93/0.79/1.05/1.00) -- sechs Werte statt vorher
// vier, fuer sichtbar mehr Formatvielfalt statt einer gleichfoermigen
// Kachel-Matrix (Auftrag Abschnitt D).
const ASPECT_BY_POSITION = [
  'aspect-[1.18/1]',
  'aspect-[0.7/1]',
  'aspect-[0.93/1]',
  'aspect-[0.79/1]',
  'aspect-[1.05/1]',
  'aspect-[1/1]',
]

// Vertikale Spaltenversätze je Track. Desktop übernimmt die verifizierten
// Studio-Referenzwerte (Abschnitt 1: 8/105/0/76/10px, Basislayout
// "Großzügig") direkt -- die anderen Breakpoints sind KEINE Studio-Werte
// (dort nicht verifiziert), sondern proportional abgeleitet für dieselbe
// unregelmäßige Wirkung bei weniger Spuren.
const TRACK_OFFSET_PX: Record<HeroWallBreakpoint, number[]> = {
  mobile: [6, 34, 0],
  tablet: [8, 46, 0],
  tabletWide: [10, 70, 0, 52],
  desktop: [8, 105, 0, 76, 10],
}

// Pendel-Bewegung (Nachbesserung "Bewegung behutsam deutlicher machen"):
// Dauer weiterhin ~17s je Richtung, ease-in-out, unveraendert. Der Weg
// (Gesamtstrecke zwischen den beiden Umkehrpunkten -- NICHT verdoppelt,
// die Keyframe pendelt direkt von 0 zu --pl-hero-float-distance und
// zurueck) ist jetzt je Breakpoint gestuft: Desktop deutlich groesser
// (30-40px) als Mobile (18-25px), Tablet/tabletWide dazwischen. Die
// bestehende pl-hero-float-Keyframe (app/globals.css) laeuft bereits
// 0% -> 50% -> 100% mit ease-in-out und ist strukturell bereits ein
// "alternate"-Pendeln (hin und zurueck in einem einzigen Zyklus) -- 34s
// Gesamtdauer ergibt exakt 17s je Richtung.
const DISTANCE_RANGE_PX: Record<HeroWallBreakpoint, [number, number]> = {
  mobile: [18, 25],
  tablet: [22, 29],
  tabletWide: [26, 34],
  desktop: [30, 40],
}

function trackAnimationStyle(trackIndex: number, breakpoint: HeroWallBreakpoint): React.CSSProperties {
  const [min, max] = DISTANCE_RANGE_PX[breakpoint]
  // Drei Stufen (0/half/max) ueber den bestehenden %3-Streuungs-Zyklus --
  // deckt den vorgegebenen Bereich gleichmaessig ab, bleibt aber dieselbe
  // Streuungslogik wie zuvor (Tracks 3/4 wiederholen das Muster von 0/1,
  // gewollt fuer die Desktop-5-Spuren-Komposition).
  const distance = min + (trackIndex % 3) * ((max - min) / 2)
  // Duration-Streuung bewusst knapper (+1s statt zuvor +2s je Track) --
  // Auftrag: Dauer bleibt "weiterhin ungefaehr 17 Sekunden je Richtung",
  // nicht wesentlich beschleunigen oder verlangsamen.
  const duration = 34 + trackIndex * 1
  const delay = -(trackIndex * 5) // negativer Delay: startet direkt versetzt, kein Sprung nach Ladeverzögerung
  return {
    ['--pl-hero-float-distance' as string]: `-${distance}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
  }
}

function PlaceholderTile({ aspectClass }: { aspectClass: string }) {
  return (
    <div
      className={`relative ${aspectClass} rounded-md border border-dashed border-pl-border-stage bg-pl-stage-elevated/60 flex items-center justify-center`}
    >
      <span className="text-[10px] font-mono uppercase tracking-wide text-pl-on-stage-muted px-1 text-center">
        Motiv fehlt
      </span>
    </div>
  )
}

function Tile({
  slot,
  aspectClass,
  sizes,
}: {
  slot: HeroWallSlot<HeroWallImage>
  aspectClass: string
  sizes: string
}) {
  if (!slot.image) return <PlaceholderTile aspectClass={aspectClass} />
  const focus = resolveHeroFocus(slot.image.heroFocus)
  const objectPositionClass =
    focus === 'top' ? 'object-top' : focus === 'bottom' ? 'object-bottom' : 'object-center'
  return (
    <div className={`relative ${aspectClass} rounded-md overflow-hidden bg-pl-stage-elevated`}>
      {/* EXPERIMENT Variante S: kein next/image-`preload`-Prop mehr auf
          irgendeiner Kachel -- alle Kacheln bleiben `loading="lazy"`
          (Vorgabe: kein Bild auf `loading="eager"` stellen). Das fruehe
          Laden der vormals eager gesetzten Kacheln uebernehmen jetzt
          ausschliesslich die media-gebundenen <link rel="preload">-
          Elemente aus heroWallPreloadLinks.ts (siehe HeroImageWall). */}
      <Image
        src={slot.image.url}
        alt=""
        fill
        className={`object-cover ${objectPositionClass}`}
        sizes={sizes}
        loading="lazy"
      />
    </div>
  )
}

const BREAKPOINT_WRAPPER_CLASS: Record<HeroWallBreakpoint, string> = {
  mobile: 'flex md:hidden',
  tablet: 'hidden md:flex lg:hidden',
  tabletWide: 'hidden lg:flex xl:hidden',
  desktop: 'hidden xl:flex',
}

const BREAKPOINT_SIZES: Record<HeroWallBreakpoint, string> = {
  mobile: '33vw',
  tablet: '20vw',
  tabletWide: '15vw',
  desktop: '12vw',
}

// EXPERIMENT Variante G ("sizes-Korrektur nur fuer Nicht-Mobil-
// Breakpoints"): uebernommen aus dem verworfenen Worktree
// fix/hero-wall-sizes (dort wurde auch der Mobile-Breakpoint
// vergroessert und verschlechterte dadurch den mobilen LCP-Median
// deutlich) -- hier bewusst nur fuer tablet/tabletWide/desktop
// angewendet. `mobile` bleibt exakt beim Baseline-Wert '33vw' (siehe
// BREAKPOINT_SIZES.mobile oben, unveraendert). Nur in diesem isolierten
// Worktree.
//
// Numerische Entsprechung zu den aspect-[X/Y]-Klassen in
// ASPECT_BY_POSITION -- muss exakt dazu passen (siehe
// HeroWall.test.ts, Test "ASPECT_RATIO_BY_POSITION..."). Parallele
// Arrays, weil Tailwind fuer die aspect-Klassen eine statische
// Literal-Liste braucht, sizes hier aber ein normales, berechenbares
// React-Attribut ist.
const ASPECT_RATIO_BY_POSITION = [1.18, 0.7, 0.93, 0.79, 1.05, 1.00]

// Real gemessene Slot-Basisbreite je Nicht-Mobil-Breakpoint (Playwright,
// offsetWidth -- NICHT getBoundingClientRect, da die -6deg-Rotation des
// Bildwelt-Containers die Bounding-Box vergroessert, ohne die
// tatsaechliche Layoutbreite zu aendern), uebernommen unveraendert aus
// fix/hero-wall-sizes. `mobile` bewusst NICHT hier drin -- Auftragsgrenze.
const MEASURED_BASE_VW: Record<'tablet' | 'tabletWide' | 'desktop', number> = {
  tablet: 25.2,
  tabletWide: 18.2,
  desktop: 13.5,
}

// object-cover-Bedarf (siehe fix/hero-wall-sizes fuer die volle
// Herleitung): requiredWidth = boxWidth * (sourceAspect / boxAspect).
// 1,7 ist der haeufigste real gemessene Seitenverhaeltnis-Wert der
// Bandfotos, nicht das beobachtete Maximum -- bewusster Kompromiss fuer
// den typischen Fall.
const REPRESENTATIVE_SOURCE_ASPECT = 1.7

function sizesForBreakpoint(baseVw: number): string[] {
  return ASPECT_RATIO_BY_POSITION.map((boxAspect) => {
    const coverMultiplier = Math.max(1, REPRESENTATIVE_SOURCE_ASPECT / boxAspect)
    return `${(baseVw * coverMultiplier).toFixed(1)}vw`
  })
}

const SIZES_BY_POSITION_NON_MOBILE: Record<'tablet' | 'tabletWide' | 'desktop', string[]> = {
  tablet: sizesForBreakpoint(MEASURED_BASE_VW.tablet),
  tabletWide: sizesForBreakpoint(MEASURED_BASE_VW.tabletWide),
  desktop: sizesForBreakpoint(MEASURED_BASE_VW.desktop),
}

// EXPERIMENT Variante S: `sizes`-Wert, den die vormals eager geladene
// Kachel an Position p=0 je Breakpoint tatsaechlich verwendet (siehe
// TrackSet unten) -- muss 1:1 dem entsprechen, was buildHeroWallPreloadDescriptors
// fuer die media-gebundenen <link rel="preload">-Elemente verwendet,
// sonst waeren srcSet von Preload und echter Kachel nicht identisch.
const PRELOAD_SIZES_BY_BREAKPOINT: Record<HeroWallBreakpoint, string> = {
  mobile: BREAKPOINT_SIZES.mobile,
  tablet: SIZES_BY_POSITION_NON_MOBILE.tablet[0],
  tabletWide: SIZES_BY_POSITION_NON_MOBILE.tabletWide[0],
  desktop: SIZES_BY_POSITION_NON_MOBILE.desktop[0],
}

function TrackSet({ images, breakpoint }: { images: HeroWallImage[]; breakpoint: HeroWallBreakpoint }) {
  const tracks = buildHeroWallTracks(images, breakpoint)
  const offsets = TRACK_OFFSET_PX[breakpoint]
  const isMobile = breakpoint === 'mobile'
  const flatSizes = BREAKPOINT_SIZES[breakpoint]
  const sizesByPosition = isMobile ? null : SIZES_BY_POSITION_NON_MOBILE[breakpoint]
  return (
    <div className={`${BREAKPOINT_WRAPPER_CLASS[breakpoint]} items-center h-full w-full gap-3 md:gap-4`}>
      {tracks.map((track, t) => (
        <div
          key={t}
          className="pl-hero-float flex flex-1 min-w-0 flex-col gap-3 md:gap-4"
          style={{ marginTop: offsets[t] ?? 0, ...trackAnimationStyle(t, breakpoint) }}
        >
          {track.map((slot, p) => (
            <Tile
              key={slot.index}
              slot={slot}
              aspectClass={ASPECT_BY_POSITION[p % ASPECT_BY_POSITION.length]}
              sizes={isMobile ? flatSizes : sizesByPosition![p % sizesByPosition!.length]}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v13a1 1 0 0 0 1.53.85l10.5-6.5a1 1 0 0 0 0-1.7l-10.5-6.5A1 1 0 0 0 7 5.5Z" />
    </svg>
  )
}

// Pause-Button als geteilte Render-Funktion (Nachbesserung "Feinschliff
// Bandzeile Runde 2", Abschnitt 2): Funktion/Label/Fokuszustand kommen
// dadurch garantiert aus EINER Quelle, nur `className` unterscheidet die
// beiden Instanzen (Mobile: auf dem Mosaik, ab md: unveraendert am
// Szenencontainer) -- keine zweite, abweichende Implementierung.
// `className` MUSS an jeder Aufrufstelle eine eigene display-Utility
// mitbringen (z.B. `flex md:hidden` / `hidden md:flex`) -- die
// Funktion selbst setzt bewusst KEIN unbedingtes `flex`/`inline-flex`
// mehr. Grund: ein unbedingtes `inline-flex` hier wuerde mit dem
// unbedingten `hidden` einer Aufrufstelle um dieselbe CSS-Eigenschaft
// (display) konkurrieren, mit von der Tailwind-internen Utility-
// Reihenfolge abhaengigem, nicht garantiertem Ausgang (beobachtet: die
// Desktop-Instanz blieb dadurch faelschlich auch auf Mobile sichtbar).
function PauseButton({
  paused,
  onToggle,
  className,
}: {
  paused: boolean
  onToggle: () => void
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? 'Bewegung der Bildwand und Logozeile fortsetzen' : 'Bewegung der Bildwand und Logozeile pausieren'}
      className={`items-center justify-center w-9 h-9 rounded-full
                  bg-pl-stage-elevated/80 text-pl-on-stage border border-pl-border-stage backdrop-blur-sm
                  hover:bg-pl-stage-elevated motion-safe:transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-pl-stage
                  ${className}`}
    >
      {paused ? <PlayIcon /> : <PauseIcon />}
    </button>
  )
}

// Verlaufsebene (Auftrag Abschnitt 1+2A): EINE ungedrehte Ebene über der
// gesamten Szene (z-10, zwischen Bildwelt z-0 und Text z-20), blendet
// den seitlichen Übergang zur Textfläche weich aus statt ihn hart zu
// clippen. Prozentangaben sind relativ zur GESAMTEN Szenenbreite (wie im
// Studio-Original) -- nicht zur Bildwelt-Box selbst. Farbstufen aus dem
// vorhandenen --pl-bg-stage (rgb(18,16,26)) abgeleitet, NICHT die
// Studio-Originalfarbe #281e2c übernommen. Nur ab md aktiv: auf Mobile
// gibt es keine seitliche Schnittkante zu kaschieren, und eine feste
// Desktop-Verlaufsebene wuerde dort die gesamte Bildwelt verdecken
// (Auftrag Abschnitt 3). pointer-events-none, damit die Ebene keine
// Klicks abfaengt.
//
// Der vormals hier enthaltene VERTIKALE (0deg) Verlauf ist entfernt
// (Nachbesserung "Feinschliff Bandzeile", Abschnitt 1): er bezog seine
// Prozent-Stops auf die GESAMTE Szenenhoehe (Text+Bild), wodurch die
// Bildspalte auf sehr breiten Screens am unteren Rand ungedaempft blieb.
// Der untere Bild-Auslauf sitzt jetzt in ImageBottomFade, als Geschwister-
// Ebene auf Szenenebene -- siehe dort.
function GradientOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 hidden md:block"
      style={{
        background:
          'linear-gradient(90deg,' +
          'rgba(18,16,26,1) 0%,' +
          'rgba(18,16,26,1) 39%,' +
          'rgba(18,16,26,0.96) 44%,' +
          'rgba(18,16,26,0.61) 50%,' +
          'rgba(18,16,26,0) 61%)',
      }}
    />
  )
}

// Unterer Mosaik-Auslauf auf Mobile (Nachbesserung "Feinschliff
// Bandzeile", Abschnitt 1+2): seit der Bandzeile steht das Mosaik auf
// Mobile jetzt ZUERST (per CSS `order`, siehe Bildwelt-Spalte unten),
// direkt unter dem Header -- eine obere Nahtblende zum Text (frueher
// hier notwendig, als der Text noch vor dem Mosaik stand) entfaellt
// dadurch. Es bleibt ein einziger unterer Verlauf: Prozent-Stops relativ
// zur eigenen Spaltenhoehe (dieselbe KIND-of-Spalte-Technik wie zuvor),
// dadurch automatisch proportional zur tatsaechlichen Mosaik-Hoehe.
// Beginnt bei ca. 40% der Mosaikhoehe (= 60%-Stop in dieser 0deg-Notation,
// 0% = unterer Spaltenrand) und blendet bis zum unteren Rand vollstaendig
// auf die Hero-Hintergrundfarbe ab -- die Logozeile darunter (siehe
// HeroLogoMarquee) steht dadurch auf durchgehend dunklem Grund, nicht auf
// dem Foto. Kein filter:blur() -- reine Farbüberlagerung.
function MobileEdgeFade() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 md:hidden"
      style={{
        background:
          'linear-gradient(0deg,' +
          'rgba(18,16,26,1) 0%,' +
          'rgba(18,16,26,0) 60%,' +
          'rgba(18,16,26,0) 100%)',
      }}
    />
  )
}

// Unterer Mosaik-Auslauf ab md (Nachbesserung "Feinschliff Bandzeile",
// Abschnitt 1): ersetzt den vormals in GradientOverlay enthaltenen
// vertikalen Verlauf, der sich auf die GESAMTE Szenenhoehe (Text+Bild)
// bezog -- auf sehr breiten Screens (ab ca. 1800px) blieb die Bildspalte
// dadurch am unteren Rand ungedaempft, die Logozeile lag direkt auf dem
// Foto. Werte aus der Entwurfsdatei (300px hoher Verlauf bei einer 810px
// hohen Referenz-Buehne: transparent bis 55%, ~82% Deckkraft, ab 82%
// voll deckend) auf Anteile umgerechnet: der 300px-Block beginnt bei ca.
// 63%, die 55%/82%-Marken darin liegen bei ca. 83%/93% der Gesamthoehe.
//
// Fix "harte senkrechte Kante hinter der Logozeile": urspruenglich als
// KIND der Bildspalte gerendert (Prozent-Stops relativ zur Spaltenhoehe,
// analog MobileEdgeFade). Die Bildspalte ist ab md aber schmaler als die
// Szene, und HeroImageWall hat bewusst md:overflow-visible, damit
// rotierte Kacheln optisch nach links ueber die Spaltengrenze hinaus in
// GradientOverlay's Zone reichen (siehe dortiger Kommentar). Als
// Spalten-Kind endete dieser Verlauf exakt an der -- senkrechten --
// Spaltengrenze: Kacheln, die optisch darueber hinausragen, bekamen am
// unteren Rand nur GradientOverlay's horizontalen Verlauf, nicht diese
// vertikale Bodenabdunkelung, sichtbar als harte Kante. Jetzt Geschwister
// von GradientOverlay auf Szenenebene (volle Szenenbreite). Die Prozent-
// Stops bleiben dabei unveraendert gueltig: ab md hat die Bildspalte
// durch md:inset-y-0 exakt dieselbe Hoehe wie die Szene, "Spaltenhoehe"
// und "Szenenhoehe" sind hier also identisch. Endfarbe rgba(18,16,26,1)
// entspricht exakt --pl-bg-stage/bg-pl-stage (Hero-Hintergrund) -- kein
// Farbsprung, genau wie GradientOverlay's eigene opake Stufe links.
//
// `className` steuert die Sichtbarkeit (siehe Aufrufstelle unten in
// HeroWall, auf Szenenebene neben GradientOverlay): hidden md:block, wie
// zuvor -- weiterhin nur ab md aktiv, auf Mobile unveraendert unsichtbar.
function ImageBottomFade({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 ${className}`}
      style={{
        background:
          'linear-gradient(180deg,' +
          'rgba(18,16,26,0) 0%,' +
          'rgba(18,16,26,0) 63%,' +
          'rgba(18,16,26,0.82) 83%,' +
          'rgba(18,16,26,1) 93%,' +
          'rgba(18,16,26,1) 100%)',
      }}
    />
  )
}

// EXPERIMENT Variante S: media-gebundene Preloads statt next/images
// nicht Media-Query-faehiger `preload`-Injektion (siehe heroWallPreloadLinks.ts).
// React 19 hebt <link> unabhaengig von der Baumposition in den <head>.
function HeroImageWall({ images }: { images: HeroWallImage[] }) {
  return (
    // absolute inset-0 statt h-full w-full: der direkte Elternteil (die
    // Bilderwelt-Spalte in HeroWall) bekommt ihre Hoehe auf Mobile
    // ausschliesslich ueber min-h-[...] (kein explizites height) -- ein
    // normales Flow-Kind mit height:100% wuerde dagegen auf 0 kollabieren
    // (CSS-Spezifikation: Prozent-Hoehe resolved nur bei "specified"
    // Hoehe, min-height zaehlt dafuer nicht -- AUSSER bei absolut
    // positionierten Elementen, fuer die genau diese Ausnahme gilt).
    // Kein eigenes overflow-hidden mehr ab md: die Bildwelt darf links
    // (in die Verlaufsebene) und rechts (ueber den Szenenrand) hinaus-
    // reichen -- geclippt wird ausschliesslich am aeusseren Szenen-
    // container (HeroWall-Section, overflow-hidden), nicht pro Spalte
    // und nicht global auf body/html (Auftrag Abschnitt 2A). Auf Mobile
    // bleibt overflow-hidden lokal bestehen, dort ist die Bildwelt ein
    // eigener, nicht ueberlappender Block im Dokumentfluss.
    <div className="absolute inset-0 overflow-hidden md:overflow-visible">
      {buildHeroWallPreloadDescriptors(images, PRELOAD_SIZES_BY_BREAKPOINT).map((d) => (
        <link key={d.key} rel="preload" as="image" media={d.media} imageSrcSet={d.imageSrcSet} imageSizes={d.imageSizes} fetchPriority="high" />
      ))}
      {/* Rotationscontainer: eigenes, ueberdimensioniertes Element (10-12%
          groesser als der sichtbare Bereich), damit nach der Rotation
          keine Luecken an den Raendern entstehen. Traegt AUSSCHLIESSLICH
          die Rotation -- die Pendel-Bewegung sitzt pro Track eine Ebene
          tiefer (siehe TrackSet), beide Transformationen bleiben getrennt.
          transform-origin 50% 60% -- verifizierter Studio-Referenzwert. */}
      <div
        className="absolute"
        style={{
          top: '-10%',
          bottom: '-10%',
          left: '-12%',
          right: '-12%',
          transform: 'rotate(-6deg)',
          transformOrigin: '50% 60%',
        }}
      >
        <TrackSet images={images} breakpoint="mobile" />
        <TrackSet images={images} breakpoint="tablet" />
        <TrackSet images={images} breakpoint="tabletWide" />
        <TrackSet images={images} breakpoint="desktop" />
      </div>
    </div>
  )
}

// Review-Fix #1 (PR #107, Codex "Let the desktop hero grow with its
// text"): Hoehe der Logozeile, die die Textflaeche ab md ueber
// `bottom-14` freihalten muss (siehe unten) -- als Konstante, damit sie
// nicht als magische Zahl an zwei Stellen (Klasse + JS-Messung)
// auseinanderlaeuft.
const LOGO_ROW_HEIGHT_PX = 56

export function HeroWall({ images, children }: { images: HeroWallImage[]; children?: ReactNode }) {
  const [paused, setPaused] = useState(false)
  // Review-Fix #1 (PR #107, Codex): auf kurzen md/lg/xl-Viewports (z.B.
  // 800x400) reichte die rein svh-basierte Mindesthoehe nicht aus --
  // Text/CTA wurden vom aeusseren overflow-hidden abgeschnitten und
  // ueberlagerten die Logozeile. Fix: der tatsaechlich benoetigte
  // Platz des Text-Inhalts wird per ResizeObserver gemessen (die innere
  // Wrapper-Div ist trotz absoluter, hoehenbegrenzter Eltern-Box selbst
  // NICHT hoehenbegrenzt -- align-items:center sizet sie auf ihre
  // intrinsische Hoehe) und als Mindesthoehe fuer den Szenencontainer
  // durchgereicht (`max(<svh-Wert>, <gemessene Hoehe> + Logozeile)`) --
  // der Hero waechst dadurch mit dem Inhalt, statt ihn abzuschneiden.
  // Bei 1440x900 (Auftrag: Komposition bleibt unveraendert) liegt die
  // gemessene Hoehe immer deutlich unter 100svh, `max()` greift dort
  // also nie ein.
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentMinHeightPx, setContentMinHeightPx] = useState<number | null>(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContentMinHeightPx(Math.ceil(entry.contentRect.height) + LOGO_ROW_HEIGHT_PX)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="relative overflow-hidden bg-pl-stage">
      {/* Gemeinsamer Szenencontainer (Auftrag Abschnitt 1): Text und
          Bildwelt sind ab md zwei sich ueberlappende absolute Ebenen
          in DIESEM einen position:relative-Container, keine zwei
          nebeneinander liegenden Flex-Spalten mit hartem Rand mehr.
          Hoehe bewusst gestuft (nicht pauschal 100svh ab md): die
          jeweilige Komposition (weniger Spuren auf Tablet) bekommt nur
          so viel Hoehe, wie sie tatsaechlich braucht (Auftrag Abschnitt
          3) -- volle Viewporthoehe bleibt dem eigentlichen Desktop (xl)
          vorbehalten. `max(<svh>, var(--pl-hero-content-min-h))` je
          Breakpoint (Review-Fix #1): waechst ueber den svh-Wert hinaus,
          wenn der gemessene Text-Inhalt mehr Platz braucht. */}
      <div
        className="relative flex flex-col md:block md:min-h-[max(68svh,var(--pl-hero-content-min-h,0px))] lg:min-h-[max(80svh,var(--pl-hero-content-min-h,0px))] xl:min-h-[max(100svh,var(--pl-hero-content-min-h,0px))]"
        data-hero-wall-paused={paused}
        style={contentMinHeightPx != null ? { ['--pl-hero-content-min-h' as string]: `${contentMinHeightPx}px` } : undefined}
      >
        {/* Textfläche: auf Mobile ein normaler Flow-Block, per CSS
            `order` NACH der Bildwelt (Nachbesserung "Feinschliff
            Bandzeile", Abschnitt 2: Mosaik oben, Text/CTA in der Mitte,
            Logozeile unten -- einheitlich fuer den gesamten
            Mobile-Bereich bis zum Tablet-Umbruch). Bewusst `order`
            statt vertauschtem JSX: die semantische/Vorlese-Reihenfolge
            (Text vor Bildern) bleibt dadurch unveraendert, nur die
            visuelle Reihenfolge dreht sich um -- ohne Fokus-/
            Tab-Reihenfolge-Aenderung (Bildkacheln sind ohnehin nicht
            fokussierbar). Ab md `order-none`: dort greift die absolute
            Positionierung, `order` waere wirkungslos. `pb-16` statt
            vormals `pb-10` auf Mobile: reserviert exakt die 56px hohe
            Logozeile (h-14) am Ende des Fliesstexts, damit sie CTA nicht
            ueberlagert (ab md wieder `md:py-0`, dort uebernimmt
            `md:bottom-14` diese Aufgabe). Ab md eine eigene absolute
            Ebene links, vertikal zentriert innerhalb der Container-Hoehe
            -- Breite bewusst unabhaengig von der Bildwelt-Position, da
            deren Ueberlappung jetzt ueber die Verlaufsebene geloest
            wird, nicht mehr ueber eine harte Spaltengrenze. Ab md
            bewusst `top-0 bottom-14` statt `inset-y-0` (Auftrag
            "Hero-Bandzeile"): die vertikale Zentrierung wirkt dadurch
            nur noch innerhalb der Hoehe OBERHALB der 56px hohen
            Logozeile (siehe HeroLogoMarquee, `h-14`) -- Text/CTA koennen
            sich dadurch unabhaengig vom Inhalt nie mit der Zeile
            ueberlagern, keine Kollisionspruefung zur Laufzeit noetig. */}
        <div className="relative z-20 order-2 md:order-none w-full md:absolute md:top-0 md:bottom-14 md:left-0 md:w-[46%] lg:w-[44%] xl:w-[42%] flex items-center px-4 sm:px-6 md:pl-8 lg:pl-12 xl:pl-16 pt-10 pb-16 md:pt-0 md:pb-0">
          {/* ref hier (nicht am aeusseren, hoehenbegrenzten Flex-Container):
              diese Div ist Kind eines `items-center`-Flex-Containers und
              deshalb NICHT auf dessen Hoehe gestreckt -- ihre eigene Hoehe
              bleibt intrinsisch (Inhaltshoehe), unabhaengig davon, ob sie
              gerade sichtbar Platz hat oder vom aeusseren overflow-hidden
              abgeschnitten wuerde. Genau diese ungestreckte Hoehe braucht
              der ResizeObserver oben. */}
          <div ref={contentRef} className="w-full max-w-xl md:max-w-none mx-auto md:mx-0">{children}</div>
        </div>

        {/* Bilderwelt: auf Mobile ein normaler Flow-Block mit eigener
            Mindesthöhe (folgt der Texthöhe, keine feste Position), per
            CSS `order` VOR der Textflaeche (siehe Kommentar dort). Ab md
            absolute, ueberlappt bewusst in die Textzone hinein (verifizierte
            Studio-Referenz: left 47%/width 60% Basis, 48%/58% ab 1700px --
            hier anteilig auf unsere Breakpoints uebertragen). */}
        <div className="relative order-1 md:order-none w-full min-h-[42svh] sm:min-h-[48svh] overflow-hidden md:absolute md:inset-y-0 md:z-0 md:min-h-0 md:overflow-visible md:left-[44%] md:w-[64%] lg:left-[46%] lg:w-[62%] xl:left-[48%] xl:w-[58%]">
          <HeroImageWall images={images} />
          {/* Kind DIESER Spalte (nicht des gesamten Szenencontainers) --
              nur so bezieht sich die Uebergangstiefe auf die tatsaechliche
              (auf Mobile variable) Bildspalten-Hoehe, siehe Funktions-
              kommentar. ImageBottomFade (der untere Auslauf ab md) rendert
              NICHT hier, sondern auf Szenenebene neben GradientOverlay --
              siehe dort. */}
          <MobileEdgeFade />
          {/* Pause-Button, Mobile-Position (Nachbesserung "Feinschliff
              Bandzeile Runde 2", Abschnitt 2): auf Mobile stand der
              Button bisher am Szenencontainer (bottom-20 right-4) direkt
              neben CTA/Logozeile und konkurrierte visuell mit dem CTA.
              Jetzt: Kind DIESER Bildspalte, `top-[32%]` -- ein Prozentwert
              relativ zur tatsaechlichen Spaltenhoehe (min-h-[42svh]/
              [48svh], keine feste Content-Hoehe sonst) und damit bewusst
              VOR dem bei 40% beginnenden dunklen Auslauf (MobileEdgeFade)
              positioniert: der Button sitzt dadurch klar auf dem
              Bildbereich, nicht im abgedunkelten Streifen. `md:hidden` --
              ab md uebernimmt die zweite, unveraenderte Instanz weiter
              unten am Szenencontainer (siehe dort). */}
          <PauseButton
            paused={paused}
            onToggle={() => setPaused((p) => !p)}
            className="absolute top-[32%] right-4 z-30 flex md:hidden"
          />
        </div>

        <GradientOverlay />
        {/* Aktive Instanz des unteren Mosaik-Auslaufs (siehe Funktions-
            kommentar oben): auf Szenenebene statt als Spalten-Kind, damit
            sie dieselbe volle Breite wie GradientOverlay abdeckt. */}
        <ImageBottomFade className="hidden md:block" />

        {/* Bodenlinie (Auftrag "Proudleut-Homepage-Hero Bandzeile"):
            letztes Kind DIESES Containers, nicht des aeusseren
            <section> -- nur so liegt sie innerhalb derselben
            data-hero-wall-paused-Ebene und wird vom bestehenden
            Pause-Button mitgesteuert (siehe [data-hero-wall-paused]
            .pl-logo-marquee in app/globals.css). */}
        <HeroLogoMarquee />

        {/* Pause-Button, ab md (Nachbesserung "Feinschliff Bandzeile
            Runde 2", Abschnitt 2: Position unveraendert gegenueber vorher --
            `hidden md:flex` statt vormals immer sichtbar, da auf
            Mobile jetzt die zweite Instanz auf dem Mosaik greift, siehe
            dort). Am aeusseren Szenencontainer verankert, steuert ueber
            data-hero-wall-paused (siehe app/globals.css) alle Tracks
            UND die Logozeile gleichzeitig, unabhaengig davon, welches
            Breakpoint-TrackSet gerade sichtbar ist. `bottom-20` statt
            `bottom-4`, damit der Button oberhalb der 56px hohen
            Logozeile schwebt statt sie zu ueberlagern. */}
        <PauseButton
          paused={paused}
          onToggle={() => setPaused((p) => !p)}
          className="absolute bottom-20 right-4 z-30 hidden md:flex"
        />
      </div>
    </section>
  )
}

export { HERO_WALL_TRACK_COUNT }
