'use client';

import { useState } from 'react';
import { AnfrageModal } from './AnfrageModal';

type Props = {
  name: string;
  slug: string;
  eventTypes: string[];
};

export function AnfrageButton({ name, slug, eventTypes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center justify-center px-6 py-3 rounded-full
                   text-sm font-semibold bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                   hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors"
      >
        Band über proudleut anfragen
      </button>

      <AnfrageModal
        bands={[{ slug, name, eventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
