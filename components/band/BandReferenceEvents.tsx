'use client';

import { useState } from 'react';
import type { Band } from '@/lib/types/band';

const INITIAL_COUNT = 4;

type Props = { band: Band };

export function BandReferenceEvents({ band }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (band.referenceEvents.length === 0) return null;

  const visible = expanded
    ? band.referenceEvents
    : band.referenceEvents.slice(0, INITIAL_COUNT);
  const hasMore = band.referenceEvents.length > INITIAL_COUNT;

  return (
    <section className="bg-pl-stage py-12 md:py-16">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-2">
          Referenz-Events
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-on-stage mb-8">
          Bühnen, Feste und Abende mit dieser Band
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visible.map((ev, i) => (
            <div
              key={i}
              className="bg-pl-stage-elevated border border-pl-stage rounded-xl px-5 py-4"
            >
              <p className="text-sm font-semibold text-pl-on-stage leading-snug">
                {ev.eventName}
              </p>
              {(ev.city || ev.year) && (
                <p className="text-xs text-pl-on-stage-muted mt-1.5">
                  {[ev.city, ev.year].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-7 text-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold
                         border border-pl-on-stage-muted/30 text-pl-on-stage-muted
                         hover:border-pl-accent-light hover:text-pl-on-stage
                         motion-safe:transition-colors"
            >
              {expanded
                ? 'Weniger anzeigen'
                : `Alle ${band.referenceEvents.length} anzeigen`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
