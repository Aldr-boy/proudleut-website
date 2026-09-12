'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ReactNode } from 'react'
import {
  buildHeroWallTracks,
  HERO_WALL_TRACK_COUNT,
  type HeroWallBreakpoint,
  type HeroWallSlot,
} from '@/lib/heroWall/heroWallComposition'
import { resolveHeroFocus } from '@/lib/heroWall/resolveHeroFocus'

// Startseiten-Hero-Redesign, Nachgang "Komposition & weiche Übergänge":
// Text und Bildwelt sind keine zwei nebeneinander liegenden Flex-Spalten
// mit hartem Rand mehr, sondern zwei sich überlappende, absolut
// positionierte Ebenen in EINEM gemeinsamen Szenencontainer (ab md) --
// eine dazwischenliegende, ungedrehte Verlaufsebene blendet den
// Übergang weich. Auf Mobile bleibt die bisherige, einfache
// Stapel-Anordnung (Text zuerst, Bilder im Fluss darunter) erhalten --
// dort gibt es keine seitliche Schnittkante, siehe Auftrag Abschnitt 3.
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
  preload,
  sizes,
}: {
  slot: HeroWallSlot<HeroWallImage>
  aspectClass: string
  preload: boolean
  sizes: string
}) {
  if (!slot.image) return <PlaceholderTile aspectClass={aspectClass} />
  const focus = resolveHeroFocus(slot.image.heroFocus)
  const objectPositionClass =
    focus === 'top' ? 'object-top' : focus === 'bottom' ? 'object-bottom' : 'object-center'
  return (
    <div className={`relative ${aspectClass} rounded-md overflow-hidden bg-pl-stage-elevated`}>
      <Image
        src={slot.image.url}
        alt=""
        fill
        className={`object-cover ${objectPositionClass}`}
        sizes={sizes}
        preload={preload}
        loading={preload ? undefined : 'lazy'}
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

function TrackSet({ images, breakpoint }: { images: HeroWallImage[]; breakpoint: HeroWallBreakpoint }) {
  const tracks = buildHeroWallTracks(images, breakpoint)
  const offsets = TRACK_OFFSET_PX[breakpoint]
  const sizes = BREAKPOINT_SIZES[breakpoint]
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
              // Reale LCP-Messung (PerformanceObserver, siehe
              // Abschlussbericht) zeigt: auf Mobile gewinnt die H1 das
              // LCP-Rennen (kein Bild-Preload noetig), ab Tablet (>=768px)
              // ist durchgehend eine Bildkachel das tatsaechliche
              // LCP-Element -- daher hier gezielt das erste Bild der
              // ersten beiden Tracks fuer jeden Nicht-Mobile-Breakpoint.
              preload={breakpoint !== 'mobile' && t < 2 && p === 0}
              sizes={sizes}
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

// Verlaufsebene (Auftrag Abschnitt 1+2A): EINE ungedrehte Ebene über der
// gesamten Szene (z-10, zwischen Bildwelt z-0 und Text z-20), blendet
// den Übergang zur Textfläche weich aus statt ihn hart zu clippen.
// Prozentangaben sind relativ zur GESAMTEN Szenenbreite/-höhe (wie im
// Studio-Original) -- nicht zur Bildwelt-Box selbst. Farbstufen aus dem
// vorhandenen --pl-bg-stage (rgb(18,16,26)) abgeleitet, NICHT die
// Studio-Originalfarbe #281e2c übernommen. Nur ab md aktiv: auf Mobile
// gibt es keine seitliche Schnittkante zu kaschieren, und eine feste
// Desktop-Verlaufsebene wuerde dort die gesamte Bildwelt verdecken
// (Auftrag Abschnitt 3). pointer-events-none, damit die Ebene keine
// Klicks abfaengt.
function GradientOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 hidden md:block"
      style={{
        background: [
          'linear-gradient(90deg,' +
            'rgba(18,16,26,1) 0%,' +
            'rgba(18,16,26,1) 39%,' +
            'rgba(18,16,26,0.96) 44%,' +
            'rgba(18,16,26,0.61) 50%,' +
            'rgba(18,16,26,0) 61%)',
          'linear-gradient(0deg,' +
            'rgba(18,16,26,1) 0%,' +
            'rgba(18,16,26,0.5) 8%,' +
            'rgba(18,16,26,0) 25%,' +
            'rgba(18,16,26,0) 88%,' +
            'rgba(18,16,26,0.55) 100%)',
        ].join(', '),
      }}
    />
  )
}

// Mobiler Übergang zwischen Text-/CTA-Bereich und Bildwelt (Nachbesserung
// "Komposition & weiche Übergänge", Abschnitt 1). Ursache der zuvor
// sichtbaren harten Kante: diese Ebene lag als GESCHWISTER des gesamten
// Szenencontainers (Text + Bilder zusammen) und ihre Prozent-Stops
// bezogen sich deshalb auf die GESAMTE Container-Höhe -- die eigentliche
// Naht zwischen Text und Bildern liegt aber irgendwo in der Mitte dieser
// Höhe, weit entfernt von den 0%/100%-Rändern des Verlaufs. Der Verlauf
// berührte die Naht dadurch nie.
//
// Fix: diese Ebene ist jetzt ein KIND der Bilderwelt-Spalte selbst
// (gerendert direkt darin, siehe HeroWall), ihr inset-0 bezieht sich
// dadurch nur noch auf die Bildspalte. Der obere Übergang (die eigentliche
// Naht zum Text) nutzt einen FESTEN Pixelwert (~96px, im geforderten
// Rahmen 80-120px) statt einer Prozentangabe, damit die Übergangstiefe
// unabhängig von der tatsächlichen Spaltenhöhe funktioniert -- die
// obersten Bildpixel sind dadurch vollständig deckend (identische Farbe
// wie die Textfläche darüber) und blenden über ~96px zur ersten
// erkennbaren Bildkante aus. Der untere Übergang (Auslaufen Richtung
// LogoStrip) bleibt als kleinerer, prozentualer Fade erhalten. Kein
// filter:blur() -- reine Farbüberlagerung.
function MobileEdgeFade() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 md:hidden"
      style={{
        background:
          'linear-gradient(0deg,' +
          'rgba(18,16,26,0.85) 0px,' +
          'rgba(18,16,26,0) 56px,' +
          'rgba(18,16,26,0) calc(100% - 96px),' +
          'rgba(18,16,26,1) 100%)',
      }}
    />
  )
}

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

export function HeroWall({ images, children }: { images: HeroWallImage[]; children?: ReactNode }) {
  const [paused, setPaused] = useState(false)

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
          vorbehalten. */}
      <div
        className="relative flex flex-col md:block md:min-h-[68svh] lg:min-h-[80svh] xl:min-h-[100svh]"
        data-hero-wall-paused={paused}
      >
        {/* Textfläche: auf Mobile normaler Flow-Block (zuerst, vor der
            Bildwelt). Ab md eine eigene absolute Ebene links, vertikal
            zentriert innerhalb der Container-Hoehe -- Breite bewusst
            unabhaengig von der Bildwelt-Position, da deren Ueberlappung
            jetzt ueber die Verlaufsebene geloest wird, nicht mehr ueber
            eine harte Spaltengrenze. */}
        <div className="relative z-20 w-full md:absolute md:inset-y-0 md:left-0 md:w-[46%] lg:w-[44%] xl:w-[42%] flex items-center px-4 sm:px-6 md:pl-8 lg:pl-12 xl:pl-16 pt-28 pb-10 md:py-0">
          <div className="w-full max-w-xl md:max-w-none mx-auto md:mx-0">{children}</div>
        </div>

        {/* Bilderwelt: auf Mobile ein normaler Flow-Block mit eigener
            Mindesthöhe (folgt der Texthöhe, keine feste Position). Ab md
            absolute, ueberlappt bewusst in die Textzone hinein (verifizierte
            Studio-Referenz: left 47%/width 60% Basis, 48%/58% ab 1700px --
            hier anteilig auf unsere Breakpoints uebertragen). */}
        <div className="relative w-full min-h-[42svh] sm:min-h-[48svh] overflow-hidden md:absolute md:inset-y-0 md:z-0 md:min-h-0 md:overflow-visible md:left-[44%] md:w-[64%] lg:left-[46%] lg:w-[62%] xl:left-[48%] xl:w-[58%]">
          <HeroImageWall images={images} />
          {/* Kind DIESER Spalte (nicht des gesamten Szenencontainers) --
              siehe MobileEdgeFade-Kommentar: nur so bezieht sich die
              Übergangstiefe auf die tatsächliche Bildspalten-Höhe. */}
          <MobileEdgeFade />
        </div>

        <GradientOverlay />

        {/* Pause-Button: eine gemeinsame Instanz fuer alle Breakpoints,
            am aeusseren Szenencontainer verankert (nicht mehr innerhalb
            der jetzt ueberlappenden Bildwelt-Ebene), steuert ueber
            data-hero-wall-paused (siehe app/globals.css) alle Tracks
            gleichzeitig, unabhaengig davon, welches Breakpoint-TrackSet
            gerade sichtbar ist. */}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? 'Bewegung der Bildwand fortsetzen' : 'Bewegung der Bildwand pausieren'}
          className="absolute bottom-4 right-4 z-30 inline-flex items-center justify-center w-9 h-9 rounded-full
                     bg-pl-stage-elevated/80 text-pl-on-stage border border-pl-border-stage backdrop-blur-sm
                     hover:bg-pl-stage-elevated motion-safe:transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-pl-stage"
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
      </div>
    </section>
  )
}

export { HERO_WALL_TRACK_COUNT }
