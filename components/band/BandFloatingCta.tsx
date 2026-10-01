'use client';

import { useEffect, useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import { BandMerkHeart } from './BandMerkHeart';
import { Button } from '@/components/ui/Button';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';
import type { BandFact } from '@/lib/bands/bandFacts';

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
  finalSentinelId: string;
};

// Faktenleiste (Desktop) und untere Anfrageleiste (Handy), Variante E:
//
//   heroPassed   -- der Anfrage-Button im Hero ist aus dem Bild gescrollt
//                   (IntersectionObserver direkt auf diesen Button)
//   finalReached -- der Final-Sentinel liegt innerhalb oder oberhalb des Viewports
//   visible = heroPassed && !finalReached
//
// So stehen nie zwei "Unverbindlich anfragen"-Buttons gleichzeitig im Bild:
// weder Hero + Leiste noch Leiste + Anfragebereich am Seitenende.
//
// Kein Layout-Sprung: beide Leisten sind position:fixed (aus dem Fluss), das
// Ein-/Ausblenden aendert nur opacity/transform/visibility. Die Mobil-Fakten
// stehen statisch im Seitenfluss (BandHero.tsx) und haengen nicht an diesem
// Zustand. Ausgeblendet: visibility:hidden + inert -- nichts darin ist
// fokussierbar; der Fokus wird beim Einblenden nicht verschoben.
//
// finalReached wird bewusst NICHT ueber einen IntersectionObserver bestimmt:
// ein Observer feuert nur bei einer beobachteten Grenzueberquerung. Ein grosser,
// unstetiger Scroll-Sprung (Scrollbar-Drag, Pos1/Ende, interner Sprunglink,
// Trackpad-Fling) kann den 1px-Sentinel in einem Frame ueberspringen, finalReached
// bliebe veraltet (siehe Analysebericht "Fix fest positionierte Leisten").
// Stattdessen wird die Geometrie bei jedem Scroll/Resize (per
// requestAnimationFrame gedrosselt) ausgewertet: erreicht, sobald
// sentinel.getBoundingClientRect().top < window.innerHeight gilt.
export function BandFloatingCta({
  name,
  slug,
  anfrageEventTypes,
  facts,
  heroButtonId,
  hasHeroButton,
  finalSentinelId,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroPassed, setHeroPassed] = useState(!hasHeroButton);
  const [finalReached, setFinalReached] = useState(false);
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
    const finalSentinel = document.getElementById(finalSentinelId);
    if (!finalSentinel) return;

    // Die Faktenleiste klebt unter dem Header (--pl-nav-height). Der Observer
    // nutzt dieselbe Hoehe als oberen rootMargin: die Leiste erscheint genau,
    // wenn der Hero-Button vollstaendig oberhalb ihrer Unterkante liegt --
    // keine Ueberlappung, kein Moment mit zwei Buttons.
    let heroObserver: IntersectionObserver | undefined;
    if (hasHeroButton) {
      const heroButton = document.getElementById(heroButtonId);
      if (heroButton) {
        const navHeight =
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pl-nav-height')) || 88;
        heroObserver = new IntersectionObserver(([entry]) => {
          const boundary = entry.rootBounds ? entry.rootBounds.top : navHeight;
          setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.top < boundary);
        }, { rootMargin: `-${navHeight}px 0px 0px 0px` });
        heroObserver.observe(heroButton);
      }
    }

    let rafScheduled = false;
    const evaluateFinalSentinel = () => {
      rafScheduled = false;
      setFinalReached(finalSentinel.getBoundingClientRect().top < window.innerHeight);
    };
    const scheduleEvaluateFinalSentinel = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(evaluateFinalSentinel);
    };

    scheduleEvaluateFinalSentinel();
    window.addEventListener('scroll', scheduleEvaluateFinalSentinel, { passive: true });
    window.addEventListener('resize', scheduleEvaluateFinalSentinel);

    return () => {
      heroObserver?.disconnect();
      window.removeEventListener('scroll', scheduleEvaluateFinalSentinel);
      window.removeEventListener('resize', scheduleEvaluateFinalSentinel);
    };
  }, [heroButtonId, hasHeroButton, finalSentinelId]);

  const visible = heroPassed && !finalReached;

  const hiddenClasses = visible
    ? 'visible opacity-100 translate-y-0 pointer-events-auto'
    : 'invisible opacity-0 pointer-events-none';

  return (
    <>
      {/* Desktop: Faktenleiste, klebt unter dem Header. fixed statt sticky,
          damit sie nie Platz im Seitenfluss belegt. */}
      <div
        inert={!visible}
        className={`hidden md:block fixed inset-x-0 z-40 bg-pl-canvas/95 backdrop-blur-sm border-y border-pl-soft
                    transition-[opacity,transform,visibility] duration-[220ms] ease-out
                    ${visible ? '' : 'motion-safe:-translate-y-2'} ${hiddenClasses}`}
        style={{ top: 'var(--pl-nav-height)' }}
      >
        <div className="pl-container-shell px-4 sm:px-6 py-3 flex items-center gap-4">
          <dl className="flex flex-1 min-w-0 items-center">
            {facts.map((f) => (
              <div
                key={f.label}
                className="flex flex-col gap-0.5 min-w-0 pr-7 mr-7 border-r border-pl-soft last:border-r-0 last:mr-0 last:pr-0"
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-pl-text-muted">{f.label}</dt>
                <dd className="text-base font-bold text-pl-text truncate">{f.value}</dd>
              </div>
            ))}
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
                    transition-[opacity,transform,bottom,visibility] duration-[220ms] ease-out
                    ${visible ? '' : 'motion-safe:translate-y-2'} ${hiddenClasses}`}
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
