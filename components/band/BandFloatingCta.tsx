'use client';

import { useEffect, useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  heroSentinelId: string;
  finalSentinelId: string;
  hasVideo: boolean;
};

// Auftrag 4.6 + UX-Feintuning (Sticky-CTA-Ueberschneidung) + Fix "fest
// positionierte Leisten ueberdecken den Footer":
// Desktop -- dezenter schwebender Anfrage-Pill unten rechts.
// Mobile -- Sticky Bottom CTA, ebenfalls nur im Zwischenbereich sichtbar
// (nicht mehr durchgaengig), damit er sich am ersten Screen nicht mit dem
// Hero-CTA ueberschneidet und am Ende nicht mit dem finalen Anfragebereich
// konkurriert.
//
//   heroPassed   -- der Hero-Sentinel liegt bereits oberhalb der Observer-Grenze
//   finalReached -- der Final-Sentinel liegt innerhalb oder oberhalb des Viewports
//   stickyVisible = heroPassed && !finalReached
//
// heroPassed bleibt unveraendert ueber einen IntersectionObserver bestimmt.
// finalReached wird bewusst NICHT mehr ueber einen IntersectionObserver
// bestimmt: Ein Observer feuert nur, wenn ein tatsaechlich beobachteter
// Frame eine Grenzueberquerung zeigt. Ein grosser, unstetiger Scroll-Sprung
// (Scrollbar-Klick/-Drag, Pos1/Ende-Taste, interner Sprunglink, schnelles
// Trackpad-Fling) kann den 1px-Sentinel in einem einzigen Frame ueberspringen
// -- in beide Richtungen --, wodurch der Callback nie feuert und finalReached
// auf einem veralteten Wert haengen bleibt (siehe Analysebericht "Fix fest
// positionierte Leisten"). Stattdessen wird die tatsaechliche Geometrie bei
// jedem Scroll/Resize (per requestAnimationFrame gedrosselt, kein Layout-
// Thrashing) direkt ausgewertet: erreicht, sobald
// sentinel.getBoundingClientRect().top < window.innerHeight gilt -- das
// entspricht immer dem echten Zustand, unabhaengig vom Scroll-Pfad.
export function BandFloatingCta({ name, slug, anfrageEventTypes, heroSentinelId, finalSentinelId, hasVideo }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const [finalReached, setFinalReached] = useState(false);
  const [merklisteBarHeight, setMerklisteBarHeight] = useState(0);
  const isGemerkt = useAnfrageStore((s) => s.isSelected(slug));
  const addBand = useAnfrageStore((s) => s.addBand);
  const removeBand = useAnfrageStore((s) => s.removeBand);
  const merklisteBandsCount = useAnfrageStore((s) => s.bands.length);

  // Echte Kollisionsloesung statt eines hoeheren z-index (Auftrag
  // "Bandseiten-Finalisierung": "Ein hoeherer z-index allein loest die
  // Kollision nicht") -- die globale Merkliste-Leiste (MerklisteBar.tsx,
  // ebenfalls "fixed bottom-0") bekommt per id="merkliste-bar" eine feste
  // Referenz, deren tatsaechlich gerenderte Hoehe hier gemessen und als
  // bottom-Offset uebernommen wird. Beide Leisten bleiben so gleichzeitig
  // sichtbar und gestapelt statt sich zu verdecken; merklisteBandsCount
  // triggert die Neumessung, wenn die Merkliste ein-/ausgeblendet wird
  // oder ihr Inhalt (und damit ihre Hoehe) sich aendert.
  useEffect(() => {
    const el = document.getElementById('merkliste-bar');
    setMerklisteBarHeight(el?.offsetHeight ?? 0);
  }, [merklisteBandsCount]);

  const handleMerken = () => {
    if (isGemerkt) {
      removeBand(slug);
    } else {
      addBand({ slug, name, anfrageEventTypes });
    }
  };

  useEffect(() => {
    const heroSentinel = document.getElementById(heroSentinelId);
    const finalSentinel = document.getElementById(finalSentinelId);
    if (!heroSentinel || !finalSentinel) return;

    // rootMargin '-8px 0px 0px 0px' gilt ausschliesslich fuer den Hero-Observer --
    // bewusst kein pixelgenauer Nachbau der Navigationshoehe, nur eine kleine
    // deterministische Toleranz. Unveraendert gegenueber dem bisherigen Stand.
    const heroObserver = new IntersectionObserver(([entry]) => {
      const boundary = entry.rootBounds ? entry.rootBounds.top : 8;
      const isAboveBoundary = entry.boundingClientRect.top < boundary;
      setHeroPassed(!entry.isIntersecting && isAboveBoundary);
    }, { rootMargin: '-8px 0px 0px 0px' });
    heroObserver.observe(heroSentinel);

    // finalReached: deterministische Geometrie-Pruefung statt Observer-
    // Crossing-Erkennung (siehe Kommentar oben) -- bei jedem Scroll/Resize
    // per requestAnimationFrame gedrosselt neu ausgewertet, zusaetzlich
    // einmal sofort nach dem Mount (z. B. Reload waehrend die Seite bereits
    // bis ans Ende gescrollt ist).
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
      heroObserver.disconnect();
      window.removeEventListener('scroll', scheduleEvaluateFinalSentinel);
      window.removeEventListener('resize', scheduleEvaluateFinalSentinel);
    };
  }, [heroSentinelId, finalSentinelId]);

  const stickyVisible = heroPassed && !finalReached;
  const hiddenInertProps = stickyVisible ? {} : { inert: true };

  return (
    <>
      {/* Desktop: schwebender Anfrage-Pill -- bottom-Offset weicht der
          Merkliste-Leiste aus (siehe Kommentar am merklisteBarHeight-Effekt
          oben), statt sie per z-index zu verdecken. */}
      <div
        className={`hidden md:block fixed right-6 z-40 motion-safe:transition-all motion-safe:duration-300 ${
          stickyVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        style={{ bottom: `${24 + merklisteBarHeight}px` }}
        aria-hidden={!stickyVisible}
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          tabIndex={stickyVisible ? 0 : -1}
          aria-label={`${name} unverbindlich anfragen`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold
                     bg-pl-accent text-pl-on-accent shadow-lg hover:bg-pl-accent-hover
                     motion-safe:transition-colors focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
        >
          Unverbindlich anfragen
        </button>
      </div>

      {/* Mobile: Sticky Bottom CTA -- nur zwischen Hero-CTA und finalem Anfragebereich sichtbar.
          Bei aktiver globaler Merkliste (MerklisteBar.tsx, ebenfalls "fixed bottom-0") rueckt
          diese Leiste per bottom-Offset (merklisteBarHeight) nach oben, statt sie zu verdecken --
          ein hoeherer z-index allein wuerde die Kollision nicht loesen, da beide Leisten dieselbe
          volle Breite beanspruchen. Der Zugang zur Mehrband-Anfrage (Merkliste ansehen) bleibt so
          in jedem Fall sichtbar und erreichbar. */}
      <div
        {...hiddenInertProps}
        aria-hidden={!stickyVisible}
        className={`md:hidden fixed inset-x-0 z-40 bg-pl-elevated/95 backdrop-blur-sm border-t
                    border-pl-soft px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                    transition-[opacity,transform,bottom] duration-[220ms] ease-out ${
          stickyVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 motion-safe:translate-y-2 pointer-events-none'
        }`}
        style={{ bottom: `${merklisteBarHeight}px` }}
      >
        <div className="flex items-center gap-2">
          {hasVideo && (
            <a
              href="#live"
              className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full border border-pl-soft text-pl-text
                         hover:border-pl-medium motion-safe:transition-colors
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
              aria-label="Live-Video ansehen"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </a>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`${name} unverbindlich anfragen`}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold
                       bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover motion-safe:transition-colors
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
          >
            Unverbindlich anfragen
          </button>
          <button
            type="button"
            onClick={handleMerken}
            aria-pressed={isGemerkt}
            aria-label={isGemerkt ? `${name} aus Anfrage entfernen` : `${name} für Anfrage merken`}
            className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full border border-pl-soft text-pl-text
                       hover:border-pl-medium motion-safe:transition-colors
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
          >
            <span aria-hidden="true">{isGemerkt ? '✓' : '♡'}</span>
          </button>
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
