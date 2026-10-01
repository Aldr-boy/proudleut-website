'use client';

import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  // 'image': auf dem Hero-Bild (heller Rand, dunkle Glasflaeche);
  // 'light': auf den hellen Leisten.
  tone: 'image' | 'light';
  className?: string;
};

// Merken-Herz (bestehende Funktion: useAnfrageStore, nur im Speicher) --
// gemeinsam genutzt von Hero und Leisten, nur die Position unterscheidet sich.
export function BandMerkHeart({ name, slug, anfrageEventTypes, tone, className = '' }: Props) {
  const isGemerkt = useAnfrageStore((s) => s.isSelected(slug));
  const addBand = useAnfrageStore((s) => s.addBand);
  const removeBand = useAnfrageStore((s) => s.removeBand);

  const handleMerken = () => {
    if (isGemerkt) {
      removeBand(slug);
    } else {
      addBand({ slug, name, anfrageEventTypes });
    }
  };

  const toneClasses =
    tone === 'image'
      ? 'border-white/60 bg-pl-stage/50 text-pl-on-stage hover:border-pl-on-stage focus-visible:outline-pl-accent-light'
      : 'border-pl-text/60 text-pl-text hover:border-pl-text focus-visible:outline-pl-accent';

  return (
    <button
      type="button"
      onClick={handleMerken}
      aria-pressed={isGemerkt}
      aria-label={isGemerkt ? `${name} aus Anfrage entfernen` : `${name} für Anfrage merken`}
      className={`shrink-0 inline-flex items-center justify-center rounded-full border-[1.5px]
                  motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2
                  ${toneClasses} ${className}`}
    >
      <span aria-hidden="true">{isGemerkt ? '✓' : '♡'}</span>
    </button>
  );
}
