'use client';

import { useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  hasVideo: boolean;
};

// Aktionsreihe direkt im Hero (Auftrag Abschnitt 5: "bereits im Einstieg
// erreichbar"), kein eigener Balken mit eigenem Hintergrund mehr -- sitzt
// jetzt unmittelbar auf dem Hero-Bild. "Live ansehen" ist ein einfacher
// Anker-Link zur bestehenden Video-Section (kein neuer Scroll-Mechanismus,
// keine zweite Video-Instanz) und erscheint nur, wenn ueberhaupt ein Video
// vorhanden ist.
export function HeroCTA({ name, slug, anfrageEventTypes, hasVideo }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { isSelected, addBand, removeBand } = useAnfrageStore();
  const isGemerkt = isSelected(slug);

  const handleMerken = () => {
    if (isGemerkt) {
      removeBand(slug);
    } else {
      addBand({ slug, name, anfrageEventTypes });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {hasVideo && (
        <a
          href="#live"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full
                     text-sm font-semibold bg-white/10 text-pl-on-stage border border-white/25
                     backdrop-blur-sm hover:bg-white/15 motion-safe:transition-colors
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Live ansehen
        </a>
      )}

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        aria-label={`${name} anfragen`}
        className="inline-flex items-center justify-center px-6 py-3 rounded-full
                   text-sm font-semibold bg-pl-accent text-pl-on-accent
                   hover:bg-pl-accent-hover motion-safe:transition-colors active:scale-95 motion-safe:transition-transform
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
      >
        <span className="hidden sm:inline">{name}&nbsp;anfragen</span>
        <span className="sm:hidden">Unverbindlich anfragen</span>
      </button>

      <button
        type="button"
        onClick={handleMerken}
        aria-pressed={isGemerkt}
        aria-label={
          isGemerkt
            ? `${name} aus Anfrage entfernen`
            : `${name} für Anfrage merken`
        }
        className="inline-flex items-center justify-center w-11 h-11 rounded-full border
                   border-pl-on-stage-muted text-pl-on-stage
                   hover:border-pl-on-stage motion-safe:transition-colors
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
      >
        <span aria-hidden="true">{isGemerkt ? '✓' : '♡'}</span>
      </button>

      {/* Sentinel für BandFloatingCta: markiert das Ende des Hero-CTA-Bereichs,
          damit der Sticky-CTA per IntersectionObserver weiss, wann er einblenden darf. */}
      <div id="hero-cta-sentinel" aria-hidden="true" className="h-px w-full" />

      <AnfrageModal
        bands={[{ slug, name, anfrageEventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        allowBandRemoval={false}
      />
    </div>
  );
}
