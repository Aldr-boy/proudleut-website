'use client';

import { useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
};

export function HeroCTA({ name, slug, anfrageEventTypes }: Props) {
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
    <div className="bg-[var(--pl-bg-stage)] py-5 px-4 sm:px-6">
      <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label={`${name} anfragen`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full
                     text-sm font-semibold bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                     hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                     focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-[var(--pl-accent)] w-full sm:w-auto"
        >
          <span className="hidden sm:inline">{name}&nbsp;anfragen</span>
          <span className="sm:hidden">Band anfragen</span>
        </button>

        <button
          type="button"
          onClick={handleMerken}
          aria-label={
            isGemerkt
              ? `${name} aus Anfrage entfernen`
              : `${name} für Anfrage merken`
          }
          className="inline-flex items-center justify-center px-6 py-3 rounded-full
                     text-sm font-semibold border
                     border-[var(--pl-text-on-stage-muted)] text-[var(--pl-text-on-stage)]
                     hover:border-[var(--pl-text-on-stage)] motion-safe:transition-colors
                     focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-[var(--pl-accent)] w-full sm:w-auto"
        >
          {isGemerkt ? '✓ Gemerkt' : 'Für Anfrage merken'}
        </button>
      </div>

      <AnfrageModal
        bands={[{ slug, name, anfrageEventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        allowBandRemoval={false}
      />
    </div>
  );
}
