'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnfrageModal } from './AnfrageModal';
import { BandMerkHeart } from './BandMerkHeart';
import { Button } from '@/components/ui/Button';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';
import type { BandFact } from '@/lib/bands/bandFacts';
import { computeBarVisible } from '@/lib/bands/barVisibility';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  facts: BandFact[];
  // Id des Anfrage-Buttons im Hero (siehe HeroCTA.tsx). Existiert er nicht
  // (Band ohne Bandbild -> kurzer Kopf), sind die Leisten von Anfang an
  // sichtbar und tragen den einzigen Anfrage-Button der Seite.
  heroButtonId: string;
  hasHeroButton: boolean;
  // Id des Wrappers um den Anfrage-Button der CTA-Karte (BandCtaSection.tsx).
  ctaButtonId: string;
};

// Faktenleiste (Desktop) und untere Anfrageleiste (Handy), Variante E.
//
// Die Entscheidung "Leiste sichtbar" faellt in lib/bands/barVisibility.ts (reine
// Funktion, dort die Regeln und die Wertetabelle im Test): sichtbar, wenn der
// Hero-Button nicht mehr benutzbar ist (< 50 % sichtbar bzw. von der Header-
// Pill verdeckt, oberhalb) und der Button der CTA-Karte noch nicht benutzbar
// ist (unterhalb). So steht zu jedem Scrollstand hoechstens EIN benutzbarer
// "Unverbindlich anfragen"-Button, und zwischen Hero-Button und CTA-Karte gibt
// es keine Luecke.
//
// Auswertung rein ueber Geometrie bei Scroll, Resize und Layoutaenderungen
// (ResizeObserver auf body), per requestAnimationFrame gedrosselt: erst lesen
// (Rects inkl. Header-Pille, Hoehe der MerklisteBar), dann ein einziger
// Schreibvorgang. Anders als ein Observer liefert sie nach jedem
// Scroll-Sprung (Scrollbar-Drag, Pos1/Ende, interner Sprunglink, Reload mitten
// im Text) den echten Zustand statt eines veralteten.
//
// Kein Layout-Sprung: beide Leisten sind position:fixed (aus dem Fluss). Die
// Mobil-Fakten stehen statisch im Seitenfluss (BandHero.tsx). Ausgeblendet:
// visibility:hidden + inert -- nichts darin ist fokussierbar; der Fokus wird
// beim Einblenden nicht verschoben.
//
// Ausblenden ist sofort (transition-none, Opacity 0, visibility hidden und
// inert im selben Frame; der Zustand wird per flushSync noch im rAF-Callback
// committed, bevor der Frame gezeichnet wird). Nur das Einblenden laeuft mit
// der 220-ms-Transition (bei reduzierter Bewegung ohne Slide, siehe
// motion-safe:), damit die Leiste nie mit Opacity > 0 neben einem benutzbaren
// Button steht.
export function BandFloatingCta({
  name,
  slug,
  anfrageEventTypes,
  facts,
  heroButtonId,
  hasHeroButton,
  ctaButtonId,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  // Start-Zustand wie bisher: bei Bands mit Hero-Button zunaechst ausgeblendet
  // (nichts blitzt beim Laden auf), ohne Hero-Button von Anfang an sichtbar.
  const [barVisible, setBarVisible] = useState(!hasHeroButton);
  const barVisibleRef = useRef(!hasHeroButton);
  const [merklisteBarHeight, setMerklisteBarHeight] = useState(0);
  const merklisteBandsCount = useAnfrageStore((s) => s.bands.length);

  // Echte Kollisionsloesung statt eines hoeheren z-index: die globale
  // Merkliste-Leiste (MerklisteBar.tsx, ebenfalls "fixed bottom-0") hat per
  // id="merkliste-bar" eine feste Referenz, deren gerenderte Hoehe hier
  // gemessen und als bottom-Offset der mobilen Leiste uebernommen wird.
  // merklisteBandsCount triggert die Neumessung, wenn die Merkliste ein-/
  // ausgeblendet wird oder ihre Hoehe sich aendert.
  useEffect(() => {
    const el = document.getElementById('merkliste-bar');
    setMerklisteBarHeight(el?.offsetHeight ?? 0);
  }, [merklisteBandsCount]);

  useEffect(() => {
    let rafScheduled = false;

    const evaluate = () => {
      rafScheduled = false;

      // --- nur lesen ---
      const viewportHeight = window.innerHeight;
      const merklisteHeight = document.getElementById('merkliste-bar')?.offsetHeight ?? 0;
      const heroEl = hasHeroButton ? document.getElementById(heroButtonId) : null;
      const ctaEl = document.getElementById(ctaButtonId);
      const heroRect = heroEl?.getBoundingClientRect() ?? null;
      const ctaRect = ctaEl?.getBoundingClientRect() ?? null;

      // Verdeckung des Hero-Buttons durch die Header-Pill: rein geometrisch gegen
      // das Rechteck des Elements mit data-nav-footprint (Header.tsx, immer die
      // normale Pille), siehe isCoveredByPill in lib/bands/barVisibility.ts.
      // Keine Abhaengigkeit von Leiste, Dialogen oder der angezeigten Pillenform.
      // Gibt es das Element nicht, gilt der Hero-Button als nicht verdeckt.
      const pillRect = document.querySelector('[data-nav-footprint]')?.getBoundingClientRect() ?? null;

      const next = computeBarVisible({
        hasHeroButton,
        hero: heroRect,
        pill: pillRect,
        cta: ctaRect,
        viewportHeight,
        merklisteHeight,
      });

      // --- ein einziger Schreibvorgang, noch vor dem Zeichnen dieses Frames ---
      if (next !== barVisibleRef.current) {
        barVisibleRef.current = next;
        flushSync(() => setBarVisible(next));
      }
    };

    const scheduleEvaluate = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(evaluate);
    };

    scheduleEvaluate();
    window.addEventListener('scroll', scheduleEvaluate, { passive: true });
    window.addEventListener('resize', scheduleEvaluate);
    // Layoutaenderungen ohne Scroll (Bilder, aufgeklappte Texte, "+N weitere").
    const resizeObserver = new ResizeObserver(scheduleEvaluate);
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleEvaluate);
      window.removeEventListener('resize', scheduleEvaluate);
    };
  }, [heroButtonId, ctaButtonId, hasHeroButton, merklisteBandsCount]);

  const visible = barVisible;

  // Einblenden: 220-ms-Transition (Opacity/Slide); Ausblenden: sofort
  // (transition-none steht nur im ausgeblendeten Zustand, die Transition-
  // Eigenschaften des Zielzustands gelten).
  const visibleClasses = 'visible opacity-100 translate-y-0 pointer-events-auto';
  const hiddenClasses = 'transition-none invisible opacity-0 pointer-events-none';

  return (
    <>
      {/* Desktop: Faktenleiste, klebt unter dem Header. fixed statt sticky,
          damit sie nie Platz im Seitenfluss belegt. */}
      <div
        inert={!visible}
        className={`hidden md:block fixed inset-x-0 z-40 bg-pl-canvas/95 backdrop-blur-sm border-y border-pl-soft
                    ${
                      visible
                        ? `transition-[opacity,transform] duration-[220ms] ease-out ${visibleClasses}`
                        : `motion-safe:-translate-y-2 ${hiddenClasses}`
                    }`}
        style={{ top: 'var(--pl-nav-height)' }}
      >
        <div className="pl-container-shell px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Prioritaet bei knappem Platz, rein ueber CSS: Besetzung und Stil
              schrumpfen nie (shrink-0). Die Herkunft darf mit "…" kuerzen (volle
              Fassung im title), ab ihrer Untergrenze (flex-basis) bricht der
              Stil in eine zweite Zeile um. Die Zeilenhoehe ist fest (h-11) und
              der Zeilenabstand (gap-y-4) groesser als der Rest der Hoehe, damit
              von der zweiten Zeile nie ein Rest sichtbar bleibt -- ein Wert
              weniger statt eines abgeschnittenen. Trennlinien stehen
              fuehrend (border-l), damit nach einem entfallenen Stil keine
              Linie uebrig bleibt. Die Leistenhoehe (74 px) aendert sich nicht
              (Buttons 48 px), sie steckt in scroll-margin-top der Video-Section. */}
          <dl className="flex flex-wrap content-start gap-y-4 flex-1 min-w-0 h-11 overflow-hidden">
            {facts.map((f, i) => {
              const isHerkunft = f.label === 'Herkunft';
              return (
                <div
                  key={f.label}
                  className={`flex flex-col gap-0.5 ${isHerkunft ? 'flex-[1_1_10rem] min-w-0 max-w-max' : 'shrink-0'} ${
                    i > 0 ? 'ml-7 pl-7 border-l border-pl-soft' : ''
                  }`}
                >
                  <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-pl-text-muted">{f.label}</dt>
                  <dd
                    title={isHerkunft ? f.value : undefined}
                    className={`text-base font-bold text-pl-text ${isHerkunft ? 'truncate' : 'whitespace-nowrap'}`}
                  >
                    {f.value}
                  </dd>
                </div>
              );
            })}
          </dl>
          <BandMerkHeart
            name={name}
            slug={slug}
            anfrageEventTypes={anfrageEventTypes}
            tone="light"
            className="w-12 h-12"
          />
          <Button
            onClick={() => setModalOpen(true)}
            aria-label={`${name} unverbindlich anfragen`}
            className="inline-flex items-center justify-center h-12 px-[26px] rounded-full text-base font-bold
                       bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover"
          >
            Unverbindlich anfragen
          </Button>
        </div>
      </div>

      {/* Handy: untere Anfrageleiste (Anfrage + Herz). Bei aktiver globaler
          Merkliste (MerklisteBar.tsx, ebenfalls "fixed bottom-0") rueckt sie per
          bottom-Offset (merklisteBarHeight) nach oben, statt sie zu verdecken --
          ein hoeherer z-index allein loest die Kollision nicht, beide Leisten
          beanspruchen die volle Breite. */}
      <div
        inert={!visible}
        className={`md:hidden fixed inset-x-0 z-40 bg-pl-elevated/95 backdrop-blur-sm border-t
                    border-pl-soft px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                    ${
                      visible
                        ? `transition-[opacity,transform,bottom] duration-[220ms] ease-out ${visibleClasses}`
                        : `motion-safe:translate-y-2 ${hiddenClasses}`
                    }`}
        style={{ bottom: `${merklisteBarHeight}px` }}
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setModalOpen(true)}
            aria-label={`${name} unverbindlich anfragen`}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold
                       bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover"
          >
            Unverbindlich anfragen
          </Button>
          <BandMerkHeart
            name={name}
            slug={slug}
            anfrageEventTypes={anfrageEventTypes}
            tone="light"
            className="w-12 h-12"
          />
        </div>
      </div>

      <AnfrageModal
        bands={[{ slug, name, anfrageEventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        allowBandRemoval={false}
      />
    </>
  );
}
