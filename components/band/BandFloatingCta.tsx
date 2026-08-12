'use client';

import { useEffect, useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  heroCtaId: string;
  contactSectionId: string;
};

// Auftrag 4.6:
// Desktop -- dezenter schwebender Anfrage-Pill unten rechts. Erscheint,
// sobald der Hero-CTA den Viewport verlassen hat, verschwindet wieder,
// sobald der finale Contact-Bereich in den Viewport kommt (kein
// Scroll-Listener, ausschliesslich IntersectionObserver).
// Mobile -- Sticky Bottom CTA, durchgaengig erreichbar (kein IO-Toggle).
// Beide teilen sich eine einzige AnfrageModal-Instanz; da sie sich
// gegenseitig ausschliessen (Desktop-Pill nur ab md sichtbar, Mobile-Leiste
// nur darunter), gibt es dabei kein Doppel-Modal-Risiko.
export function BandFloatingCta({ name, slug, anfrageEventTypes, heroCtaId, contactSectionId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showFloatingPill, setShowFloatingPill] = useState(false);

  useEffect(() => {
    const heroCta = document.getElementById(heroCtaId);
    const contactSection = document.getElementById(contactSectionId);
    if (!heroCta || !contactSection) return;

    let heroCtaVisible = true;
    let contactVisible = false;

    const update = () => setShowFloatingPill(!heroCtaVisible && !contactVisible);

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroCtaVisible = entry.isIntersecting;
      update();
    });
    const contactObserver = new IntersectionObserver(([entry]) => {
      contactVisible = entry.isIntersecting;
      update();
    });

    heroObserver.observe(heroCta);
    contactObserver.observe(contactSection);

    return () => {
      heroObserver.disconnect();
      contactObserver.disconnect();
    };
  }, [heroCtaId, contactSectionId]);

  return (
    <>
      {/* Desktop: schwebender Anfrage-Pill */}
      <div
        className={`hidden md:block fixed bottom-6 right-6 z-40 motion-safe:transition-all motion-safe:duration-300 ${
          showFloatingPill
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        aria-hidden={!showFloatingPill}
      >
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          tabIndex={showFloatingPill ? 0 : -1}
          aria-label={`${name} unverbindlich anfragen`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold
                     bg-pl-accent text-pl-on-accent shadow-lg hover:bg-pl-accent-hover
                     motion-safe:transition-colors focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
        >
          Unverbindlich anfragen
        </button>
      </div>

      {/* Mobile: Sticky Bottom CTA */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-pl-elevated/95 backdrop-blur-sm border-t border-pl-soft px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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
