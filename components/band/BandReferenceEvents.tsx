import type { Band } from '@/lib/types/band';
import { referenceEventsVariant } from '@/lib/bands/bandReferenceEventsLayout';
import { referenceEventSublines } from '@/lib/bands/bandReferenceEventSubline';

type Props = { band: Band };

// 0 -> entfaellt. 1 -> kompakt, neutrale Mikrocopy (NICHT "Zuletzt live
// erlebt" -- eine einzelne, ggf. aeltere Referenz darf keine Inaktivitaet
// suggerieren). 2+ -> ruhige, helle Liste, alle sichtbar, keine "Alle
// anzeigen"-Pagination, untereinander (kein internes Zwei-Spalten-Raster
// mehr -- die Komponente lebt jetzt selbst in einer Spalte neben der
// Hochzeitskarte, siehe BandTagsSection.tsx "03 Die Band fuer euer
// Event?"). Kein eigener Section-Wrapper/Rand -- die umgebende Section
// steuert Abstand und Trennlinien zwischen ihren Ebenen.
export function BandReferenceEvents({ band }: Props) {
  const events = band.referenceEvents;
  const variant = referenceEventsVariant(events.length);
  if (variant === 'none') return null;

  if (variant === 'compact-light') {
    const ev = events[0];
    const sublines = referenceEventSublines(ev);
    return (
      <div>
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
    <div>
      <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
        Referenz-Events · Bühnen, Feste und Abende mit dieser Band
      </p>

      <div className="flex flex-col">
        {events.map((ev, i) => (
          <div key={i} className={`py-3.5 ${i > 0 ? 'border-t border-pl-soft' : ''}`}>
            <p className="text-sm font-semibold text-pl-text">{ev.eventName}</p>
            {referenceEventSublines(ev).map((line, idx) => (
              <p key={idx} className="mt-0.5 text-xs text-pl-text-muted">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
