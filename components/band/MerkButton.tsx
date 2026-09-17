'use client';

import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
  // Optional, Default 'light' -- bestehendes Verhalten fuer alle
  // bisherigen Aufrufstellen (BandCard, BandExplorer) unveraendert. 'dark'
  // wird ausschliesslich von der neuen dunklen CTA-Karte in
  // BandContactSection.tsx genutzt (Bandseiten-Redesign).
  variant?: 'light' | 'dark';
};

export function MerkButton({ name, slug, anfrageEventTypes, variant = 'light' }: Props) {
  const selected = useAnfrageStore((s) => s.isSelected(slug));
  const otherCount = useAnfrageStore(
    (s) => s.bands.filter((b) => b.slug !== slug).length
  );
  const addBand = useAnfrageStore((s) => s.addBand);
  const removeBand = useAnfrageStore((s) => s.removeBand);

  function toggle() {
    if (selected) {
      removeBand(slug);
    } else {
      addBand({ slug, name, anfrageEventTypes });
    }
  }

  const isDark = variant === 'dark';

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={selected}
        className={[
          'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full',
          'text-sm font-semibold motion-safe:transition-colors',
          isDark
            ? selected
              ? 'bg-white/10 border border-pl-accent-light text-pl-on-stage'
              : 'border border-pl-on-stage-muted text-pl-on-stage hover:border-pl-on-stage'
            : selected
              ? 'bg-[var(--pl-accent-subtle)] border border-[var(--pl-accent)] text-[var(--pl-accent-deep)]'
              : 'border border-[var(--pl-border-medium)] text-[var(--pl-text-muted)] hover:border-[var(--pl-accent)] hover:text-[var(--pl-accent-deep)]',
        ].join(' ')}
      >
        {selected ? '✓ Gemerkt' : '♡ Für Anfrage merken'}
      </button>

      {selected && otherCount >= 1 && (
        <p className={isDark ? 'text-xs text-pl-on-stage-muted' : 'text-xs'} style={isDark ? undefined : { color: 'var(--pl-text-hint)' }}>
          Schon {otherCount} {otherCount === 1 ? 'andere Band' : 'andere Bands'} gemerkt.
          Stell eine Sammelanfrage, wenn du bereit bist.
        </p>
      )}
    </div>
  );
}
