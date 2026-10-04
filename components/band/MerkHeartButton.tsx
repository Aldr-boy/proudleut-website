'use client';

import type { MouseEvent } from 'react';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
};

// Merk-Herz oben rechts im Kartenbild (BandCard, AuswahlBandCard). Nutzt den
// bestehenden globalen Store (stores/anfrageStore.ts), identisches Muster wie
// components/band/HeroCTA.tsx::handleMerken. Muss in einem Container mit
// position: relative liegen.
export function MerkHeartButton({ name, slug, anfrageEventTypes }: Props) {
  // Wert abonnieren (nicht die stabile Funktion isSelected), sonst rendert das
  // Herz nach einem Klick nicht neu, wenn der Eltern-Container nicht neu rendert.
  const isGemerkt = useAnfrageStore((s) => s.isSelected(slug));
  const addBand = useAnfrageStore((s) => s.addBand);
  const removeBand = useAnfrageStore((s) => s.removeBand);

  function handleMerken(e: MouseEvent) {
    // Herz und Bandprofil-Link muessen unabhaengig voneinander bedienbar
    // sein (Auftrag Abschnitt 8) -- der Button liegt dafuer NICHT mehr
    // ineinander mit dem Profil-Link (der jetzt als eigener, gestreckter
    // Link am Kartenende liegt), preventDefault/stopPropagation bleiben
    // trotzdem als zusaetzliche Absicherung bestehen.
    e.preventDefault();
    e.stopPropagation();
    if (isGemerkt) {
      removeBand(slug);
    } else {
      addBand({ slug, name, anfrageEventTypes });
    }
  }

  return (
    <button
      type="button"
      onClick={handleMerken}
      aria-pressed={isGemerkt}
      aria-label={isGemerkt ? `${name} aus Merkliste entfernen` : `${name} merken`}
      className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-pl-elevated/90
                 flex items-center justify-center motion-safe:transition-transform
                 hover:scale-[1.06] focus:outline-none focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={isGemerkt ? 'var(--pl-accent)' : 'none'}
          stroke={isGemerkt ? 'var(--pl-accent)' : 'var(--pl-text-main)'}
          strokeWidth={1.8}
        />
      </svg>
    </button>
  );
}
