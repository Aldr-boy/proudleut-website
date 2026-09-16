import type { Band } from '@/lib/types/band';
import { referenceEventsVariant } from '@/lib/bands/bandReferenceEventsLayout';
import { referenceEventSublines } from '@/lib/bands/bandReferenceEventSubline';

type Props = { band: Band };

// 0 -> entfaellt. 1 -> kompakt, neutrale Mikrocopy (NICHT "Zuletzt live
// erlebt" -- eine einzelne, ggf. aeltere Referenz darf keine Inaktivitaet
// suggerieren). 2+ -> ruhige, helle Liste, alle sichtbar, keine "Alle
// anzeigen"-Pagination. Eingebettet in die linke Spalte von "03 Die Band
// fuer euer Event?" (siehe BandTagsSection.tsx), kein eigener
// Section-Wrapper mehr -- die dunkle Buehnen-Insel-Variante wurde bereits
// verworfen (siehe lib/bands/bandReferenceEventsLayout.ts).
export function BandReferenceEvents({ band }: Props) {
  const events = band.referenceEvents;
  const variant = referenceEventsVariant(events.length);
  if (variant === 'none') return null;

  if (variant === 'compact-light') {
    const ev = events[0];
    const sublines = referenceEventSublines(ev);
    return (
      <div className="border-t border-pl-soft pt-6">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
          Referenz-Events
        </p>
        <div className="bg-pl-elevated border border-pl-soft shadow-pl-photo rounded-xl px-5 py-4">
          <p className="text-base font-semibold text-pl-text">{ev.eventName}</p>
          {sublines.map((line, idx) => (
            <p key={idx} className="mt-1 text-sm text-pl-text-muted">
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-pl-soft pt-6">
      <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
        Referenz-Events · Bühnen, Feste und Abende mit dieser Band
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        {events.map((ev, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 py-2.5 border-b border-pl-soft">
            <span className="text-sm font-semibold text-pl-text">{ev.eventName}</span>
            {referenceEventSublines(ev).map((line, idx) => (
              <span key={idx} className="shrink-0 text-xs text-pl-text-muted whitespace-nowrap">
                {line}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
