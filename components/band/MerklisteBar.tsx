'use client';

import { useEffect, useRef, useState } from 'react';
import { useAnfrageStore } from '@/stores/anfrageStore';
import { MerklisteFlow } from './MerklisteFlow';

export function MerklisteBar() {
  const bands = useAnfrageStore((s) => s.bands);
  const [modalOpen, setModalOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const hasBands = bands.length > 0;

  // Platzhalter im normalen Dokumentenfluss reserviert exakt so viel Platz,
  // wie die fixe Leiste am unteren Viewport-Rand tatsaechlich einnimmt (inkl.
  // Safe-Area-Padding) -- dadurch verdeckt sie am Seitenende nicht mehr die
  // Footer-Rechtszeile, ohne layout.tsx oder Footer.tsx anzufassen: Die Leiste
  // wird bereits heute nach dem Footer gerendert (app/layout.tsx), der
  // Platzhalter steht direkt daneben und verlaengert damit einfach die
  // Gesamthoehe der Seite um genau die Leistenhoehe (Fix "fest positionierte
  // Leisten ueberdecken den Footer", Option A). Hoehe wird live per
  // ResizeObserver gemessen, da sie inhaltsabhaengig variiert (z. B. Umbruch
  // bei langen Bandnamen). Nur wirksam, wenn die Leiste tatsaechlich sichtbar
  // ist (hasBands) -- ohne gemerkte Band bleibt kein Platzhalter stehen.
  useEffect(() => {
    const el = barRef.current;
    if (!el) {
      setPlaceholderHeight(0);
      return;
    }
    const ro = new ResizeObserver(() => setPlaceholderHeight(el.offsetHeight));
    ro.observe(el);
    setPlaceholderHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [hasBands]);

  if (!hasBands) return null;

  const shown = bands.slice(0, 3);
  const extra = bands.length - shown.length;
  const displayNames = shown.map((b) => b.name).join(', ');

  return (
    <>
      <div
        ref={barRef}
        id="merkliste-bar"
        className="fixed bottom-0 left-0 right-0 z-40 border-t motion-safe:animate-[slideUp_0.2s_ease] pb-[env(safe-area-inset-bottom)]"
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
            Merkliste ansehen
          </button>
        </div>
      </div>
      <div aria-hidden="true" style={{ height: placeholderHeight }} />

      <MerklisteFlow isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
