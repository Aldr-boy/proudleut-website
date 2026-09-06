import Image from 'next/image'
import type { ReactNode } from 'react'
import { buildHeroWallSlots, splitIntoColumns } from '@/lib/heroWall/simulateHeroWallSlots'
import { resolveHeroFocus } from '@/lib/heroWall/resolveHeroFocus'

// Echte Hero-Bildwand-Komponente nach docs/spezifikation-hero-bildwand.md
// (eingefroren, Squash-Merge 03a46f7 in main; Nachtrag "Paternoster-
// Animation" nach realer Webflow-Vermessung). Wird EXAKT EINMAL gebaut
// und danach identisch auf der Homepage (Paket 2, Schritt 2D) und in der
// Admin-Live-Vorschau (Schritt 2B) verwendet -- keine zweite,
// abweichende Implementierung.
//
// Geometrie 1:1 aus Abschnitt 5 der Spec uebernommen (Referenzcode dort
// vollstaendig vorgegeben, hier nicht neu interpretiert oder
// "optimiert"):
//   - Section: position:relative, min-h-[100svh], overflow-hidden,
//     KEINE feste vh-Hoehe.
//   - Bildwand-Container: absolute inset-0 z-0 overflow-hidden.
//   - Overlay: absolute inset-0 z-10, flache Flaeche
//     rgba(32,32,32,0.66), KEIN Verlauf.
//   - Content: relative z-20, max-w-[80rem], px-4, py-28 (7rem).
//   - Grid: grid-cols-2 md:grid-cols-3 xl:grid-cols-5, gap-4, px-4.
//   - Alle FUENF Spalten-Divs werden immer im JSX gerendert (siehe
//     COLUMN_META) -- Sichtbarkeit ausschliesslich per CSS (`display`),
//     keine viewportabhaengige JSX-Bedingung, keine serverseitige
//     Breitenermittlung. display:none nimmt eine Spalte aus der
//     Grid-Track-Belegung (siehe Spec Abschnitt 5).
//   - Spalten-Divs sind DIREKTE Kinder des Grids (kein Wrapper --
//     sonst aendert sich der Containing Block der Prozent-Offsets aus
//     Abschnitt 3 und die Geometrie bricht).
//   - Offsets in Kachelhoehen (−20% / −50% / 0% / −30% / −20%),
//     wirken nur korrekt, weil die Spalte gleichzeitig Grid-Item UND
//     Flex-Container ist (eigenes display:flex aendert den Containing
//     Block nicht).
//
// Paternoster-Animation (Nachtrag, reale Webflow-Vermessung):
//   - Jede Spalte (8 Slot-Bilder) ist strukturell in zwei gleich hohe
//     4er-Listen geteilt (List A = erste 4 Slots, List B = zweite 4
//     Slots derselben Spalte) -- keine Klone, nur eine Aufteilung
//     desselben 8-Kacheln-Inhalts. Beide Listen zusammen ergeben exakt
//     dieselbe Gesamthoehe wie vorher die flache 8er-Liste (gleiche
//     Kachelzahl, gleiche gap-4-Abstaende).
//   - Die Animation (CSS-Klasse pl-paternoster-up / pl-paternoster-down,
//     siehe app/globals.css) wirkt ausschliesslich auf die Spalte selbst
//     -- niemals auf Grid, Bilder, List A/B, Content oder Overlay.
//     translate3d(0,0%,0) <-> translate3d(0,-50%,0), 50s linear infinite,
//     harter Reset (keine Seamless-Loop-Umdeutung). -50% bezieht sich auf
//     die eigene Border-Box-Hoehe der Spalte (List A + gap-4 + List B) --
//     bei zwei exakt gleich hohen Listen landet das automatisch korrekt,
//     ohne zusaetzliche Pixel-/Prozentrechnung hier im Code.
//   - Reduced-motion deaktiviert die Bewegung vollstaendig (siehe
//     globals.css) und stellt fuer beide Richtungen einheitlich den
//     unanimierten Ausgangszustand wieder her (keine dauerhaft bei -50%
//     stehende DOWN-Spalte).
const COLUMN_META: { offset: string; display: string; animationClass: string }[] = [
  { offset: '-mt-[20%]', display: 'flex', animationClass: 'pl-paternoster-up' },
  { offset: '-mt-[50%]', display: 'flex', animationClass: 'pl-paternoster-down' },
  { offset: 'mt-0', display: 'hidden md:flex', animationClass: 'pl-paternoster-up' },
  { offset: '-mt-[30%]', display: 'hidden xl:flex', animationClass: 'pl-paternoster-down' },
  { offset: '-mt-[20%]', display: 'hidden xl:flex', animationClass: 'pl-paternoster-up' },
]

const FOCUS_TO_OBJECT_POSITION_CLASS: Record<'top' | 'center' | 'bottom', string> = {
  top: 'object-top',
  center: 'object-center',
  bottom: 'object-bottom',
}

export type HeroWallImage = {
  id: string
  url: string
  heroFocus: string | null
}

function Tile({
  img,
  priority,
  eager,
}: {
  img: HeroWallImage
  priority: boolean
  // Nachtrag Paternoster-Animation: laesst next/image den Ladeaufschub
  // erzwingen (loading="eager"), ohne die Preload-/fetchPriority-Wirkung
  // von `priority`. Nur fuer Spalten gesetzt, die auf JEDEM Breakpoint
  // sichtbar sind (i<2) -- reale Messung zeigte, dass natives
  // loading="lazy" die letzte Kachel einer per Transform animierten,
  // aber statisch weit unten liegenden Spalte auch nach 15s nicht
  // laedt. Bei Spalten, die auf kleinen Breakpoints display:none sind,
  // bleibt loading="lazy" bewusst bestehen -- eager wuerde dort auch bei
  // ausgeblendeter Spalte einen Request ausloesen und die bestehende
  // Mobile/Tablet-Kein-Request-Regel brechen.
  eager: boolean
}) {
  return (
    <div className="relative aspect-[5/6]">
      <Image
        src={img.url}
        alt=""
        fill
        className={`object-cover ${FOCUS_TO_OBJECT_POSITION_CLASS[resolveHeroFocus(img.heroFocus)]}`}
        sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 20vw"
        priority={priority}
        loading={priority ? undefined : eager ? 'eager' : 'lazy'}
      />
    </div>
  )
}

export function HeroWall({
  images,
  children,
}: {
  // Bereits kuratierter, nach hero_wall_position sortierter Pool
  // (Laenge N) -- siehe lib/heroWall/fetchHeroWallPool.ts. Die
  // Slot-Belegung (40 Slots, slot[s] = pool[s mod N]) und die
  // Spaltenaufteilung (Slots i*8..i*8+7 -> Spalte i) verwenden
  // ausschliesslich die bestehende, gemeinsame Paket-1-Logik aus
  // lib/heroWall/simulateHeroWallSlots.ts -- keine zweite
  // Slot-Implementierung. Deterministisch, kein Shuffle, keine
  // clientseitige Zufalls-/Zustandslogik (Spec Abschnitt 6).
  images: HeroWallImage[]
  children?: ReactNode
}) {
  const slots = buildHeroWallSlots(images)
  const columns = splitIntoColumns(slots)

  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      {/* Content */}
      <div className="relative z-20 mx-auto w-full max-w-[80rem] px-4 py-28">{children}</div>

      {/* Bildwand */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 z-10 bg-[rgba(32,32,32,0.66)]" />

        <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMN_META.map((col, i) => {
            const listA = columns[i].slice(0, 4)
            const listB = columns[i].slice(4, 8)
            return (
              <div
                key={i}
                className={`${col.display} ${col.offset} ${col.animationClass} min-w-0 flex-col gap-4`}
              >
                <div className="flex flex-col gap-4">
                  {listA.map((img, j) => (
                    <Tile key={`${i}-a-${j}`} img={img} priority={i < 2 && j < 2} eager={i < 2} />
                  ))}
                </div>
                <div className="flex flex-col gap-4">
                  {listB.map((img, j) => (
                    <Tile key={`${i}-b-${j}`} img={img} priority={false} eager={i < 2} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
