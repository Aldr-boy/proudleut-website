'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BandIntroModal } from './BandIntroModal';

type Props = {
  className: string;
  children: React.ReactNode;
};

// Desktop -> Modal, Mobile -> eigene Formularroute (Auftrag Abschnitt 16).
// Beide Varianten werden serverseitig stabil gerendert und ausschliesslich
// ueber die vorhandenen Tailwind-Breakpoints unterschieden (kein
// window.innerWidth, kein useEffect zur Viewport-Erkennung, kein
// User-Agent-Sniffing) -- exakt dasselbe Muster wie
// components/band/BandFloatingCta.tsx (hidden md:block / md:hidden), dort
// allerdings fuer zwei Varianten DESSELBEN Triggers. Hier schliessen sich
// Button (>= md) und Link (< md) gegenseitig aus, kein SSR-/
// Hydration-Mismatch moeglich.
export function BandIntroTrigger({ className, children }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setModalOpen(true)} className={`hidden md:inline-flex ${className}`}>
        {children}
      </button>

      <Link href="/fuer-bands/band-vorstellen" className={`md:hidden inline-flex ${className}`}>
        {children}
      </Link>

      <BandIntroModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
