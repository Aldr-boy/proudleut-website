import type { Band } from '@/lib/types/band';
import { referenceEventsVariant } from '@/lib/bands/bandReferenceEventsLayout';
import { referenceEventSublines } from '@/lib/bands/bandReferenceEventSubline';
import { BandRow } from './BandRow';

type Props = { band: Band };

// Zeile "Referenz-Events" im Zeilenraster von BandTagsSection.tsx (Prototyp E):
// zweispaltiges Raster, alle Eintraege sichtbar, keine "Alle anzeigen"-
// Pagination. 0 -> entfaellt. Ein einzelner Eintrag steht ohne Kartenrahmen
// in derselben Rasterzelle (neutrale Mikrocopy, NICHT "Zuletzt live erlebt" --
// eine einzelne, ggf. aeltere Referenz darf keine Inaktivitaet suggerieren).
export function BandReferenceEvents({ band }: Props) {
  const events = band.referenceEvents;
  if (referenceEventsVariant(events.length) === 'none') return null;

  return (
    <BandRow label="Referenz-Events">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
        {events.map((ev, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <p className="text-lg font-bold text-pl-text">{ev.eventName}</p>
            {referenceEventSublines(ev).map((line, idx) => (
              <p key={idx} className="text-sm text-pl-text-muted">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    </BandRow>
  );
}
