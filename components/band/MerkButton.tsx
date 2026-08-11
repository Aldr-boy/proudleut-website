'use client';

import { useAnfrageStore } from '@/stores/anfrageStore';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
};

export function MerkButton({ name, slug, anfrageEventTypes }: Props) {
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

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={selected}
        className={[
          'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full',
          'text-sm font-semibold motion-safe:transition-colors',
          selected
            ? 'bg-[var(--pl-accent-subtle)] border border-[var(--pl-accent)] text-[var(--pl-accent-deep)]'
            : 'border border-[var(--pl-border-medium)] text-[var(--pl-text-muted)] hover:border-[var(--pl-accent)] hover:text-[var(--pl-accent-deep)]',
        ].join(' ')}
      >
        {selected ? '✓ Gemerkt' : '♡ Band merken'}
      </button>

      {selected && otherCount >= 1 && (
        <p className="text-xs" style={{ color: 'var(--pl-text-hint)' }}>
          Schon {otherCount} {otherCount === 1 ? 'andere Band' : 'andere Bands'} gemerkt.
          Stell eine Sammelanfrage, wenn du bereit bist.
        </p>
      )}
    </div>
  );
}
