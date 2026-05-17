'use client';

import { useState } from 'react';
import { useAnfrageStore } from '@/stores/anfrageStore';
import { AnfrageModal } from './AnfrageModal';

export function MerklisteBar() {
  const bands = useAnfrageStore((s) => s.bands);
  const clearBands = useAnfrageStore((s) => s.clearBands);
  const removeBand = useAnfrageStore((s) => s.removeBand);
  const [modalOpen, setModalOpen] = useState(false);

  if (bands.length === 0) return null;

  const shown = bands.slice(0, 3);
  const extra = bands.length - shown.length;
  const displayNames = shown.map((b) => b.name).join(', ');

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t motion-safe:animate-[slideUp_0.2s_ease]"
        style={{
          background: 'var(--pl-bg-stage)',
          borderColor: 'rgba(196,168,216,0.15)',
        }}
      >
        <div className="max-w-[1140px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <p
            className="text-sm flex-1 truncate"
            style={{ color: 'var(--pl-text-on-stage)' }}
          >
            <span className="mr-1.5" aria-hidden="true">🎵</span>
            {bands.length === 1 ? '1 Band gemerkt' : `${bands.length} Bands gemerkt`}
            {': '}
            <span style={{ color: 'var(--pl-accent-on-stage)' }}>
              {displayNames}
              {extra > 0 && ` +${extra} weitere`}
            </span>
          </p>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 inline-flex items-center justify-center px-5 py-2 rounded-full
                       text-sm font-semibold motion-safe:transition-colors"
            style={{
              background: 'var(--pl-accent)',
              color: 'var(--pl-text-on-accent)',
            }}
          >
            Auswahl anfragen
          </button>
        </div>
      </div>

      <AnfrageModal
        bands={bands}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={clearBands}
        allowBandRemoval={true}
        onRemoveBand={removeBand}
      />
    </>
  );
}
