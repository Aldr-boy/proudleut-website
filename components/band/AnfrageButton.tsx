'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AnfrageModal } from './AnfrageModal';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
};

export function AnfrageButton({ name, slug, anfrageEventTypes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center justify-center px-6 py-3 rounded-full
                   text-sm font-semibold bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                   hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors"
      >
        Unverbindlich anfragen
      </Button>

      <AnfrageModal
        bands={[{ slug, name, anfrageEventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
