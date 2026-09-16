import type { Band } from '@/lib/types/band';
import { referenceEventsVariant } from '@/lib/bands/bandReferenceEventsLayout';
import { referenceEventSublines } from '@/lib/bands/bandReferenceEventSubline';

type Props = { band: Band };

// 0 -> Section entfaellt. 1 -> kompakt, neutrale Mikrocopy (NICHT "Zuletzt
// live erlebt" -- eine einzelne, ggf. aeltere Referenz darf keine
// Inaktivitaet suggerieren). 2+ -> ruhige, helle Liste, alle sichtbar,
// keine "Alle anzeigen"-Pagination. Teil von "03 Passt sie zu eurem
// Anlass?" (siehe lib/bands/bandReferenceEventsLayout.ts fuer die
// Begruendung des Wechsels von der frueheren dunklen Buehnen-Insel).
export function BandReferenceEvents({ band }: Props) {
  const events = band.referenceEvents;
  const variant = referenceEventsVariant(events.length);
  if (variant === 'none') return null;

  if (variant === 'compact-light') {
    const ev = events[0];
    const sublines = referenceEventSublines(ev);
    return (
      <section className="bg-pl-canvas px-4 sm:px-6">
        <div className="pl-container-shell flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10 border-t border-pl-soft pt-8">
          <div className="shrink-0">
            <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-1">
              Referenz-Events
            </p>
            <p className="text-lg font-bold text-pl-text">Live erlebt bei</p>
          </div>
          <div className="bg-pl-elevated border border-pl-soft shadow-pl-photo rounded-xl px-6 py-4">
            <p className="text-base font-semibold text-pl-text">{ev.eventName}</p>
            {sublines.map((line, idx) => (
              <p key={idx} className="mt-1 text-sm text-pl-text-muted">
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-pl-canvas px-4 sm:px-6">
      <div className="pl-container-shell border-t border-pl-soft pt-8">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-1">
          Ausgewählte Referenzen
        </p>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">
          {events.map((ev, i) => (
            <div key={i}>
              <p className="text-sm md:text-base font-semibold text-pl-text">{ev.eventName}</p>
              {referenceEventSublines(ev).map((line, idx) => (
                <p key={idx} className="mt-0.5 text-xs text-pl-text-muted">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
