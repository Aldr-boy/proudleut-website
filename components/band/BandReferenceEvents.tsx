import type { Band } from '@/lib/types/band';
import { referenceEventsVariant } from '@/lib/bands/bandReferenceEventsLayout';
import { referenceEventSublines } from '@/lib/bands/bandReferenceEventSubline';

type Props = { band: Band; compactBottom?: boolean };

// Auftrag 4.3: 0 -> Section entfaellt. 1 -> kompakt auf hellem Grund, kein
// grosser dunkler Block, neutrale Mikrocopy (NICHT "Zuletzt live erlebt" --
// eine einzelne, ggf. aeltere Referenz darf keine Inaktivitaet suggerieren).
// 2+ -> eigene dunkle Buehnen-Insel entsprechend 2d, alle sichtbar, keine
// "Alle anzeigen"-Pagination mehr (vorheriges Verhalten entfernt).
export function BandReferenceEvents({ band, compactBottom }: Props) {
  const events = band.referenceEvents;
  const variant = referenceEventsVariant(events.length);
  if (variant === 'none') return null;

  if (variant === 'compact-light') {
    const ev = events[0];
    const sublines = referenceEventSublines(ev);
    return (
      <section className="bg-pl-canvas border-b border-pl-soft py-12 md:py-16 px-4 sm:px-6">
        <div className="pl-container-shell flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
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
    <div className={`${compactBottom ? 'pt-16 md:pt-20 pb-8' : 'py-16 md:py-20'} px-4 sm:px-6`}>
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-2">
          Referenz-Events
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-on-stage mb-8">
          Bühnen, Feste und Abende mit dieser Band
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {events.map((ev, i) => (
            <div key={i} className="bg-pl-stage-elevated border border-pl-stage rounded-xl p-5">
              <p className="text-base md:text-lg font-semibold text-pl-on-stage">{ev.eventName}</p>
              {referenceEventSublines(ev).map((line, idx) => (
                <p key={idx} className="mt-1 text-sm text-pl-on-stage-muted">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
