'use client';

import Link from 'next/link';
import { useState } from 'react';

export type InspirationBand = { slug: string; name: string; place?: string };

export type InspirationGroup = {
  label: string;
  bands: InspirationBand[];
  // Nur gesetzt, wenn der Reiter nach Region gruppiert wird; enthaelt dann
  // dieselben Bands wie `bands`, jede genau einmal.
  sections?: { label: string; bands: InspirationBand[] }[];
};

function BandList({ bands }: { bands: InspirationBand[] }) {
  return (
    <ul className="columns-1 sm:columns-2 lg:columns-3 gap-6">
      {bands.map((b) => (
        <li key={b.slug} className="mb-4 break-inside-avoid">
          <Link
            href={`/band/${b.slug}`}
            className="block text-sm font-semibold text-pl-text hover:text-pl-accent-deep"
          >
            {b.name}
          </Link>
          {b.place && <span className="block text-xs text-pl-text-muted">{b.place}</span>}
        </li>
      ))}
    </ul>
  );
}

// Alle Gruppen werden immer gerendert (auch serverseitig im HTML);
// inaktive Reiter sind nur per `hidden` ausgeblendet.
export default function BandInspirationen({ groups }: { groups: InspirationGroup[] }) {
  const [active, setActive] = useState(0);

  return (
    <section aria-labelledby="inspirationen-titel" className="pl-container-shell px-4 sm:px-6 mt-16">
      <h2 id="inspirationen-titel" className="text-xl font-semibold text-pl-text mb-4">
        Inspirationen für dein Event
      </h2>
      <div
        role="tablist"
        aria-label="Bandarten"
        className="flex flex-nowrap gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {groups.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            id={`insp-tab-${i}`}
            aria-selected={active === i}
            aria-controls={`insp-panel-${i}`}
            onClick={() => setActive(i)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border
                        motion-safe:transition-colors focus:outline-none focus-visible:outline-2
                        focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)] ${
                          active === i
                            ? 'bg-pl-accent-subtle border-pl-accent text-pl-accent-deep'
                            : 'border-pl-soft text-pl-text-muted hover:border-pl-accent'
                        }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {groups.map((g, i) => (
        <div
          key={g.label}
          role="tabpanel"
          id={`insp-panel-${i}`}
          aria-labelledby={`insp-tab-${i}`}
          hidden={active !== i}
        >
          {g.sections ? (
            g.sections.map((sec) => (
              <div key={sec.label} className="mb-6">
                <h3 className="text-sm font-semibold text-pl-text mb-3">{sec.label}</h3>
                <BandList bands={sec.bands} />
              </div>
            ))
          ) : (
            <BandList bands={g.bands} />
          )}
        </div>
      ))}
    </section>
  );
}
