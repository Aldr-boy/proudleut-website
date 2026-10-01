'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  // Anzahl der mobil verborgenen Pills (= Pills mit der Klasse aus
  // BandEventTypesPills, die bei data-expanded="false" ausgeblendet ist).
  hiddenCount: number;
};

// Mobil gekuerzte Pill-Liste (Prototyp E: "+N weitere"). Die Pills werden
// serverseitig gerendert und stehen alle im HTML (Kategorie-Links bleiben fuer
// Suchmaschinen vorhanden); mobil blendet die Klasse
// max-md:group-data-[expanded=false]:hidden (display: none, damit auch nicht
// per Tab erreichbar) die Pills ab dem Limit aus. Dieser Wrapper haelt nur
// den Zustand und schaltet data-expanded um. Ab md gibt es keinen Knopf, alle
// Pills sind sichtbar. Der Knopf behaelt beim Umschalten seinen DOM-Knoten --
// der Fokus springt nicht.
export function CollapsiblePills({ children, hiddenCount }: Props) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  return (
    <div data-expanded={expanded} className="group flex flex-wrap gap-2">
      <div id={listId} className="contents">
        {children}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((value) => !value)}
        className="md:hidden inline-flex items-center rounded-full border border-pl-soft px-3.5 py-1.5 text-sm font-semibold text-pl-accent-deep
                   hover:border-pl-accent motion-safe:transition-colors
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
      >
        {expanded ? 'weniger anzeigen' : `+${hiddenCount} weitere`}
      </button>
    </div>
  );
}
