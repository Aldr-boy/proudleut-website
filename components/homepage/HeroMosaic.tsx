'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type FramingImage = {
  src: string;
  alt: string;
  style: React.CSSProperties;
  rotateDeg: number;
  duration: string;
  delay: string;
};

// Desktop-Bildrahmung: mehrere unterschiedlich grosse, echte Livebilder am
// Rand, zentrale Flaeche bleibt frei fuer Text/CTA. Groessen/Rotation/
// Zuordnung uebernehmen die freigegebene Claude-Design-Komposition;
// Bildquellen sind die bereits im Repo vorhandenen
// public/images/hero/hero-mosaic-01..12.webp (kein neues Asset). rotateDeg
// separat statt in `style.transform` gefuehrt, da die Drag-Verschiebung
// (siehe unten) denselben transform-String um translate3d() ergaenzen muss.
//
// Positionen (Nachschaerfung): die urspruengliche Komposition verankerte
// mehrere Bilder mit festen negativen Pixelwerten an den absoluten
// Rand (z. B. `left: -40px`) bzw. per `max(-24px, calc(50% - 720px))`
// direkt am Viewport-Rand -- auf sehr breiten Desktop-Bildschirmen blieben
// diese Bilder dadurch buchstaeblich am Bildschirmrand kleben, unabhaengig
// von der Fensterbreite ("Mitte = Text, Rand = Bilder"). Jetzt durchgehend
// prozentual verankert (skaliert mit der Containerbreite, bleibt also auf
// jeder Breite proportional naeher am zentralen Content) und bewusst
// unregelmaessig: die vier vormals staerksten Randlaeufer (mosaic-04/12/02/09)
// ruecken am deutlichsten ein, andere (mosaic-07/01/06/08) nur moderat,
// die ohnehin schon zentrumsnahen (mosaic-10/05) kaum. Bleeding ueber den
// oberen/unteren Rand bleibt bewusst erhalten (Collage-Charakter), nur
// weniger extrem.
const FRAMING_IMAGES: FramingImage[] = [
  { src: '/images/hero/hero-mosaic-04.webp', alt: '', style: { left: '3%', top: '13%', width: '215px', height: '150px' }, rotateDeg: -2, duration: '9s', delay: '0s' },
  { src: '/images/hero/hero-mosaic-11.webp', alt: '', style: { left: '7%', top: '37%', width: '145px', height: '185px' }, rotateDeg: 1.5, duration: '11s', delay: '1.2s' },
  { src: '/images/hero/hero-mosaic-12.webp', alt: '', style: { left: '5%', top: '65%', width: '195px', height: '160px' }, rotateDeg: -1, duration: '10s', delay: '2.4s' },
  { src: '/images/hero/hero-mosaic-02.webp', alt: '', style: { right: '4%', top: '12%', width: '255px', height: '168px' }, rotateDeg: 2, duration: '12s', delay: '0.8s' },
  { src: '/images/hero/hero-mosaic-03.webp', alt: '', style: { right: '8%', top: '39%', width: '165px', height: '116px' }, rotateDeg: -1.5, duration: '9.5s', delay: '2s' },
  { src: '/images/hero/hero-mosaic-09.webp', alt: '', style: { right: '6%', top: '59%', width: '165px', height: '210px' }, rotateDeg: 1, duration: '10.5s', delay: '3s' },
  { src: '/images/hero/hero-mosaic-07.webp', alt: '', style: { left: '20%', top: '-14px', width: '185px', height: '130px' }, rotateDeg: 1.5, duration: '11.5s', delay: '1.6s' },
  { src: '/images/hero/hero-mosaic-01.webp', alt: '', style: { right: '20%', top: '-12px', width: '176px', height: '125px' }, rotateDeg: 2, duration: '9s', delay: '2.8s' },
  { src: '/images/hero/hero-mosaic-06.webp', alt: '', style: { left: '22%', bottom: '-20px', width: '170px', height: '162px' }, rotateDeg: -2, duration: '10s', delay: '0.4s' },
  { src: '/images/hero/hero-mosaic-10.webp', alt: '', style: { left: '45%', bottom: '-14px', width: '194px', height: '130px' }, rotateDeg: 1, duration: '12s', delay: '2.2s' },
  { src: '/images/hero/hero-mosaic-08.webp', alt: '', style: { right: '22%', bottom: '-18px', width: '215px', height: '148px' }, rotateDeg: -1.5, duration: '10.5s', delay: '1s' },
  { src: '/images/hero/hero-mosaic-05.webp', alt: '', style: { left: '43%', top: '-24px', width: '165px', height: '116px' }, rotateDeg: -1, duration: '9.5s', delay: '3.4s' },
];

// Mobil: keine gerahmte freie Streuung wie am Desktop (Kollisionsrisiko mit
// H1/Buttons auf schmalen Breiten, kein Drag hier -- eigener, komplett
// separater Baum), aber auch keine zwei starren, gleich hohen Bildreihen
// mehr. Dieselben acht zuvor sichtbaren Bilder (4 oben, 4 unten) sind jetzt
// als 3+3 unterschiedlich grosse, leicht wechselnd ausgerichtete Reihen
// plus 2 seitliche Collage-Bilder verteilt, die in die bisher leeren
// Flaechen links/rechts neben dem schmalen "Hochzeit"-Pill hineinreichen --
// dort entsteht bei zentriertem, unterschiedlich breitem Content am meisten
// ungenutzter Raum. Absolut positioniert mit fixem Pixel-Versatz vom
// Wrapper-Rand (Copy ist fix, daher unproblematisch) und niedrigerer Ebene
// als der Content (z-10 vs. z-20 bei HeroContent), damit sie Text/Buttons
// nie ueberdecken koennen.
type MobileStripImage = { src: string; flexGrow: number; height: number; rotateDeg: number };

const MOBILE_TOP_STRIP: MobileStripImage[] = [
  { src: '/images/hero/hero-mosaic-07.webp', flexGrow: 1.15, height: 76, rotateDeg: -1 },
  { src: '/images/hero/hero-mosaic-04.webp', flexGrow: 1, height: 58, rotateDeg: 1 },
  { src: '/images/hero/hero-mosaic-02.webp', flexGrow: 1.3, height: 92, rotateDeg: -1 },
];
const MOBILE_BOTTOM_STRIP: MobileStripImage[] = [
  { src: '/images/hero/hero-mosaic-08.webp', flexGrow: 1.2, height: 88, rotateDeg: 1 },
  { src: '/images/hero/hero-mosaic-10.webp', flexGrow: 1, height: 60, rotateDeg: -1 },
  { src: '/images/hero/hero-mosaic-12.webp', flexGrow: 1.15, height: 80, rotateDeg: 1 },
];
const MOBILE_SIDE_IMAGES: { src: string; side: 'left' | 'right'; top: number; width: number; height: number; rotateDeg: number }[] = [
  { src: '/images/hero/hero-mosaic-11.webp', side: 'left', top: 400, width: 70, height: 78, rotateDeg: -6 },
  { src: '/images/hero/hero-mosaic-01.webp', side: 'right', top: 418, width: 66, height: 72, rotateDeg: 6 },
];

const ANLASS_PILLS: { label: string; href: string }[] = [
  { label: 'Hochzeit', href: '/veranstaltung/hochzeit' },
  { label: 'Firmenfeier & Business Event', href: '/veranstaltung/firmenfeier' },
  { label: 'Festzelt', href: '/veranstaltung/festzelt' },
];

// Der gesamte Hero ist die Bewegungsflaeche -- die Ausgangsposition ist nur
// der Startpunkt, keine eigene Bewegungszone. Einzige raeumliche Grenze ist
// der Hero-Container selbst; die Ausgangsposition FLIESST NICHT in die
// Begrenzung ein (kein dragConstraints um die jeweilige Startposition).
// OVERFLOW_RATIO erlaubt, dass ein Foto bis zur Haelfte ueber den Hero-Rand
// hinausragt (wie in der Ausgangskomposition bereits an mehreren Raendern
// der Fall) statt komplett innerhalb bleiben zu muessen.
const OVERFLOW_RATIO = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type Offset = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };
type DragState = {
  index: number;
  startClientX: number;
  startClientY: number;
  startOffset: Offset;
  // Laufend aktualisiertes Live-Ziel waehrend des Ziehens -- bewusst NICHT
  // in React-State, siehe handlePointerMove.
  latestOffset: Offset;
  rafId: number | null;
};

function offsetToTransform(offset: Offset, rotateDeg: number): string {
  return `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotateDeg}deg)`;
}

export default function HeroMosaic() {
  const [offsets, setOffsets] = useState<Offset[]>(() => FRAMING_IMAGES.map(() => ({ x: 0, y: 0 })));
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Ausgangs-Rechtecke (Position/Groesse ohne jede Drag-Verschiebung),
  // relativ zum Hero-Container, einmalig nach dem ersten Paint gemessen --
  // dient als Referenzpunkt, um aus einem Pointer-Delta eine absolute,
  // gegen den Container geclampte Zielposition zu berechnen.
  const baseRectsRef = useRef<Rect[] | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    baseRectsRef.current = imageRefs.current.map((el) => {
      if (!el) return { left: 0, top: 0, width: 0, height: 0 };
      const r = el.getBoundingClientRect();
      return { left: r.left - containerRect.left, top: r.top - containerRect.top, width: r.width, height: r.height };
    });
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, index: number) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startOffset = offsets[index];
    dragRef.current = {
      index,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffset,
      latestOffset: startOffset,
      rafId: null,
    };
    setDraggingIndex(index);
    // will-change nur waehrend der aktiven Geste setzen (nicht dauerhaft im
    // Stylesheet) -- Browser-Hinweis, das Foto vorab auf eine eigene
    // Compositor-Ebene zu heben, ohne die zwoelf Fotos permanent im Speicher
    // zu haltende Layer zu verwandeln.
    const el = imageRefs.current[index];
    if (el) el.style.willChange = 'transform';
  }

  // Kernstueck der Fluessigkeit: pointermove kann deutlich haeufiger feuern
  // als der Bildschirm neu zeichnet. Vorher loeste jedes pointermove ein
  // setOffsets() und damit einen React-Re-Render von HeroMosaic (12 Fotos +
  // Hero-Content) aus -- das war das eigentliche Ruckeln. Jetzt wird waehrend
  // des Ziehens ueberhaupt kein React-State mehr aktualisiert: das Ziel wird
  // in einer Ref gehalten und hoechstens einmal pro Animationsframe direkt
  // per ref auf das DOM-Element geschrieben (kein Reconciliation-Overhead).
  // Erst nach dem Loslassen (endDrag) wird die finale Position genau einmal
  // in den React-State uebernommen.
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;
    const base = baseRectsRef.current?.[drag?.index ?? -1];
    if (!drag || !container || !base) return;

    const containerRect = container.getBoundingClientRect();
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;

    // Zielposition (Bild-Ecke oben links, relativ zum Container) aus dem
    // Ausgangsrechteck plus bisherigem Offset plus Pointer-Delta -- frei im
    // gesamten Container, nicht auf einen Radius um base begrenzt.
    const targetLeft = base.left + drag.startOffset.x + dx;
    const targetTop = base.top + drag.startOffset.y + dy;

    const minLeft = -base.width * OVERFLOW_RATIO;
    const maxLeft = containerRect.width - base.width * (1 - OVERFLOW_RATIO);
    const minTop = -base.height * OVERFLOW_RATIO;
    const maxTop = containerRect.height - base.height * (1 - OVERFLOW_RATIO);

    drag.latestOffset = {
      x: clamp(targetLeft, minLeft, maxLeft) - base.left,
      y: clamp(targetTop, minTop, maxTop) - base.top,
    };

    if (drag.rafId === null) {
      drag.rafId = requestAnimationFrame(() => {
        const current = dragRef.current;
        if (!current) return;
        current.rafId = null;
        const el = imageRefs.current[current.index];
        if (!el) return;
        el.style.transform = offsetToTransform(current.latestOffset, FRAMING_IMAGES[current.index].rotateDeg);
      });
    }
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (drag) {
      if (drag.rafId !== null) cancelAnimationFrame(drag.rafId);
      const el = imageRefs.current[drag.index];
      if (el) el.style.willChange = '';
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      // Finale Position genau einmal in React-State uebernehmen -- danach
      // ist `offsets` wieder die alleinige Quelle der Wahrheit fuer die
      // (ruhende) Position dieses Fotos.
      const finalOffset = drag.latestOffset;
      const index = drag.index;
      setOffsets((prev) => {
        const copy = [...prev];
        copy[index] = finalOffset;
        return copy;
      });
    }
    dragRef.current = null;
    setDraggingIndex(null);
  }

  return (
    <section className="relative overflow-hidden bg-pl-gradient-stage">
      {/* Desktop: gerahmte Bildwelt am Rand, Mitte bleibt frei. Fotos lassen
          sich frei im gesamten Hero verschieben (Pointer-Events, Position
          bleibt bis zum Reload erhalten). Ebenen: 1 Hero-Hintergrund (diese
          Section), 2 Fotos (z-10, gezogenes Foto z-20), 3 Hero-Content
          (z-30), 4 Navigation (eigene, feste Komponente, z-50 -- immer
          oben). Ein Foto laeuft dadurch beim Ziehen ueber Headline/Chips
          optisch dahinter durch, verdeckt sie nie. */}
      <div ref={containerRef} className="hidden md:block relative h-[max(660px,85svh)] max-h-[900px]">
        {FRAMING_IMAGES.map((img, i) => {
          const offset = offsets[i];
          const isDragging = draggingIndex === i;
          return (
            <div
              key={img.src}
              ref={(el) => {
                imageRefs.current[i] = el;
              }}
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={`pl-hero-float absolute overflow-hidden rounded-[10px] select-none motion-safe:transition-shadow motion-safe:duration-200 ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                ...img.style,
                transform: offsetToTransform(offset, img.rotateDeg),
                animationPlayState: isDragging ? 'paused' : 'running',
                animationDuration: img.duration,
                animationDelay: img.delay,
                zIndex: isDragging ? 20 : 10,
                boxShadow: isDragging ? '0 18px 40px rgba(0,0,0,0.45)' : '0 12px 32px rgba(0,0,0,0.35)',
                touchAction: 'none',
              }}
            >
              <div className="relative w-full h-full" style={{ filter: 'brightness(0.85) saturate(0.95)' }}>
                <Image src={img.src} alt={img.alt} fill className="object-cover pointer-events-none" sizes="260px" priority={i < 4} quality={75} draggable={false} />
              </div>
            </div>
          );
        })}

        <HeroContent className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none" />
      </div>

      {/* Mobil: Bildstreifen ueber/unter dem Text bewusst unterschiedlich
          gross und nicht auf gleicher Hoehe (items-end/items-start statt
          items-stretch) fuer Collage- statt Grid-Charakter, plus zwei
          seitliche Bilder in den zuvor leeren Randflaechen. Inhalt
          (HeroContent) bestimmt weiterhin seine Hoehe selbst im normalen
          Fluss (kein absolute inset-0) -- kein Risiko einer Ueberlagerung
          der schwebenden Pill-Navigation und kein Abschneiden bei
          umbrechenden Anlass-Buttons. Kein Drag mobil. */}
      <div className="md:hidden relative pt-24 pb-10 px-4">
        <div className="flex items-end gap-2 -mx-4">
          {MOBILE_TOP_STRIP.map((img, i) => (
            <div
              key={img.src}
              className="relative overflow-hidden rounded-[10px]"
              style={{ flexGrow: img.flexGrow, flexBasis: 0, height: `${img.height}px`, transform: `rotate(${img.rotateDeg}deg)` }}
            >
              <div className="relative w-full h-full" style={{ filter: 'brightness(0.85)' }}>
                <Image src={img.src} alt="" fill className="object-cover" sizes="30vw" priority={i < 2} quality={75} />
              </div>
            </div>
          ))}
        </div>

        {MOBILE_SIDE_IMAGES.map((img) => (
          <div
            key={img.src}
            className="absolute z-10 overflow-hidden rounded-[10px] shadow-lg"
            style={{
              [img.side]: 0,
              top: `${img.top}px`,
              width: `${img.width}px`,
              height: `${img.height}px`,
              transform: `rotate(${img.rotateDeg}deg)`,
            }}
          >
            <div className="relative w-full h-full" style={{ filter: 'brightness(0.85)' }}>
              <Image src={img.src} alt="" fill className="object-cover" sizes="20vw" quality={75} />
            </div>
          </div>
        ))}

        <HeroContent className="relative z-20 mt-8" />

        <div className="flex items-start gap-2 -mx-4 mt-8">
          {MOBILE_BOTTOM_STRIP.map((img) => (
            <div
              key={img.src}
              className="relative overflow-hidden rounded-[10px]"
              style={{ flexGrow: img.flexGrow, flexBasis: 0, height: `${img.height}px`, transform: `rotate(${img.rotateDeg}deg)` }}
            >
              <div className="relative w-full h-full" style={{ filter: 'brightness(0.85)' }}>
                <Image src={img.src} alt="" fill className="object-cover" sizes="30vw" quality={75} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroContent({ className }: { className: string }) {
  return (
    <div className={className}>
      <div className="text-center max-w-2xl px-4 pointer-events-auto">
        <p className="font-mono text-xs tracking-[0.14em] uppercase text-pl-accent-light">
          In und um Bayern
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-pl-on-stage">
          Livebands für dein Event.
        </h1>
        <p className="mt-4 text-base md:text-lg leading-relaxed text-pl-on-stage-muted max-w-md mx-auto">
          Echte Bands, echte Abende.
          <br />
          Von der Trauung bis zum vollen Festzelt.
        </p>

        <p className="mt-9 font-mono text-[11px] tracking-[0.14em] uppercase text-pl-on-stage-muted">
          Was hast du vor?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-3.5">
          {ANLASS_PILLS.map((pill) => (
            <Link
              key={pill.href}
              href={pill.href}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full border border-pl-accent-light/30 bg-pl-stage-elevated/60 text-pl-on-stage text-[15px] font-semibold whitespace-nowrap
                         hover:border-pl-accent-light hover:bg-pl-accent-on-stage/15 hover:text-pl-elevated motion-safe:transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light/70 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-stage"
            >
              {pill.label}
              <span aria-hidden="true" className="text-pl-accent-light">→</span>
            </Link>
          ))}
        </div>

        <Link
          href="/bands"
          className="inline-block mt-6 font-mono text-xs tracking-[0.08em] text-pl-on-stage-muted hover:text-pl-on-stage motion-safe:transition-colors"
        >
          Alle Bands ansehen →
        </Link>
      </div>
    </div>
  );
}
