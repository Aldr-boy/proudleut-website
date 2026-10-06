import type { Band } from '@/lib/types/band';
import { hasWeddingContent } from '@/lib/bands/bandWeddingContent';
import { getSoloFirstName } from '@/lib/bands/solo';
import { BandRow } from './BandRow';

type Props = { band: Band };

// Zeile "Hochzeit" im Zeilenraster von BandTagsSection.tsx (Prototyp E):
// Karte mit Titel und kurzer Stimmungszeile links, den Entscheidungswerten
// rechts (ab md zweispaltig). weddingDescription ist eine kurze, bestehende
// Stimmungszeile der Band (z. B. "aufregend - pfundig - bewegend") --
// servergerendert, keine erfundene Ergaenzung. Nur das vorhandene
// Hochzeitsmodell, keine generischen Anlass-Karten.
export function BandWeddingModule({ band }: Props) {
  if (!hasWeddingContent(band)) return null;

  const info = band.weddingInfo;

  const decisionCards = [
    info?.kidnappingBride != null
      ? { label: 'Brautentführung', value: info.kidnappingBride ? 'Ja' : 'Nein' }
      : null,
    info?.moderation != null
      ? { label: 'Moderation', value: info.moderation ? 'Ja' : 'Nein' }
      : null,
    info?.possiblePlaytimes
      ? { label: 'Mögliche Spieldauer', value: info.possiblePlaytimes }
      : null,
  ].filter((c): c is { label: string; value: string } => c !== null);

  return (
    <BandRow label="Hochzeit" tone="accent">
      <div className="bg-pl-elevated border border-pl-soft rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row md:items-start gap-5 md:gap-10">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl md:text-2xl font-extrabold leading-tight text-pl-text mb-2">
            Wenn {getSoloFirstName(band) ?? 'diese Band'} eure Hochzeit begleitet
          </h3>
          {info?.weddingDescription && (
            <p className="font-serif italic text-base text-pl-text-muted">
              {info.weddingDescription}
            </p>
          )}
        </div>

        {decisionCards.length > 0 && (
          <div className="md:w-80 md:shrink-0">
            {decisionCards.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 py-2.5 text-sm border-b border-pl-soft first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="text-pl-text-muted">{label}</span>
                <strong className="text-pl-text">{value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </BandRow>
  );
}
