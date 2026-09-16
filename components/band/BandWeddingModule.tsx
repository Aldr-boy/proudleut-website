import type { Band } from '@/lib/types/band';
import { hasWeddingContent } from '@/lib/bands/bandWeddingContent';

type Props = { band: Band };

// Hochzeitsinformationen, eingebettet als helle Karte in der rechten Spalte
// von "03 Die Band fuer euer Event?" (siehe BandTagsSection.tsx, finaler
// Entwurf: Hochzeitskarte unter der Festwirte-PDF-Karte). weddingDescription
// ist eine kurze, bestehende Stimmungszeile der Band (z. B. "aufregend -
// pfundig - bewegend") -- servergerendert, keine erfundene Ergaenzung.
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
    <div className="bg-pl-paper border border-pl-soft rounded-2xl p-5">
      <p className="text-xs font-semibold text-pl-accent-deep uppercase tracking-wider mb-1.5">
        Hochzeit
      </p>
      <h3 className="text-base font-bold text-pl-text mb-1">
        Wenn diese Band eure Hochzeit begleitet
      </h3>
      {info?.weddingDescription && (
        <p className="font-serif italic text-sm text-pl-text-muted mb-3">
          {info.weddingDescription}
        </p>
      )}

      {decisionCards.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between gap-3 py-2.5 text-sm border-t border-pl-soft">
          <span className="text-pl-text-muted">{label}</span>
          <strong className="text-pl-text">{value}</strong>
        </div>
      ))}
    </div>
  );
}
