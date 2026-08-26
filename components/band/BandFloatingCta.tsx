'use client';

import { useEffect, useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  heroSentinelId: string;
  finalSentinelId: string;
};

// Auftrag 4.6 + UX-Feintuning (Sticky-CTA-Ueberschneidung):
// Desktop -- dezenter schwebender Anfrage-Pill unten rechts.
// Mobile -- Sticky Bottom CTA, ebenfalls nur im Zwischenbereich sichtbar
// (nicht mehr durchgaengig), damit er sich am ersten Screen nicht mit dem
// Hero-CTA ueberschneidet und am Ende nicht mit dem finalen Anfragebereich
// konkurriert.
//
// Sichtbarkeit wird ausschliesslich ueber zwei IntersectionObserver auf
// dedizierten 1px-Sentinels abgeleitet (kein Scroll-Listener):
//   heroPassed   -- der Hero-Sentinel liegt bereits oberhalb der Observer-Grenze
//   finalReached -- der Final-Sentinel ist sichtbar oder bereits passiert
//   stickyVisible = heroPassed && !finalReached
//
// Ein Sentinel mit isIntersecting === false kann entweder noch unterhalb des
// Viewports liegen oder bereits oberhalb passiert sein -- beide Faelle werden
// hier bewusst unterschieden (ueber rootBounds.top bzw. den dokumentierten
// Fallback), statt naiv "!isIntersecting" gleichzusetzen.
export function BandFloatingCta({ name, slug, anfrageEventTypes, heroSentinelId, finalSentinelId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [heroPassed, setHeroPassed] = useState(false);
  const [finalReached, setFinalReached] = useState(false);

  useEffect(() => {
    const heroSentinel = document.getElementById(heroSentinelId);
    const finalSentinel = document.getElementById(finalSentinelId);
    if (!heroSentinel || !finalSentinel) return;

    // rootMargin '-8px 0px 0px 0px' gilt ausschliesslich fuer den Hero-Observer --
    // bewusst kein pixelgenauer Nachbau der Navigationshoehe, nur eine kleine
    // deterministische Toleranz.
    const heroObserver = new IntersectionObserver(([entry]) => {
      const boundary = entry.rootBounds ? entry.rootBounds.top : 8;
      const isAboveBoundary = entry.boundingClientRect.top < boundary;
      setHeroPassed(!entry.isIntersecting && isAboveBoundary);
    }, { rootMargin: '-8px 0px 0px 0px' });

    // Final-Observer nutzt den Default-rootMargin.
    const finalObserver = new IntersectionObserver(([entry]) => {
      const boundary = entry.rootBounds ? entry.rootBounds.top : 0;
      const isAboveBoundary = entry.boundingClientRect.top < boundary;
      setFinalReached(entry.isIntersecting || isAboveBoundary);
    });

    heroObserver.observe(heroSentinel);
    finalObserver.observe(finalSentinel);

    return () => {
      heroObserver.disconnect();
      finalObserver.disconnect();
    };
  }, [heroSentinelId, finalSentinelId]);

  const stickyVisible = heroPassed && !finalReached;
  const hiddenInertProps = stickyVisible ? {} : { inert: true };

  return (
    <>
      {/* Desktop: schwebender Anfrage-Pill */}
      <div
        className={`hidden md:block fixed bottom-6 right-6 z-40 motion-safe:transition-all motion-safe:duration-300 ${
          stickyVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
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

      {/* Mobile: Sticky Bottom CTA -- nur zwischen Hero-CTA und finalem Anfragebereich sichtbar */}
      <div
        {...hiddenInertProps}
        aria-hidden={!stickyVisible}
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-pl-elevated/95 backdrop-blur-sm border-t
                    border-pl-soft px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]
                    transition-[opacity,transform] duration-[220ms] ease-out ${
          stickyVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 motion-safe:translate-y-2 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={`${name} unverbindlich anfragen`}
          className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold
                     bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover motion-safe:transition-colors
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
        >
          Unverbindlich anfragen
        </button>
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
