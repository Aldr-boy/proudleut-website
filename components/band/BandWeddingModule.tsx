import type { Band } from '@/lib/types/band';

type Props = { band: Band };

function hasWeddingContent(band: Band): boolean {
  return band.eventTypes.some((et) => et.trim().toLowerCase().includes('hochzeit'));
}

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

  const hasText = !!info?.weddingDescription;
  const hasCards = decisionCards.length > 0;

  return (
    <section className="bg-pl-paper py-12 md:py-16 border-t border-pl-soft">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
          Hochzeit
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-2">
          Wenn diese Band eure Hochzeit begleitet
        </h2>
        <p className="text-sm text-pl-text-muted mb-10">
          Für Paare, die Live-Musik als Teil des Tages verstehen.
        </p>

        <div
          className={
            hasText && hasCards
              ? 'md:grid md:grid-cols-[1fr_1fr] gap-10 md:gap-14'
              : ''
          }
        >
          {hasText && (
            <div className="mb-8 md:mb-0">
              <p className="text-pl-text leading-relaxed whitespace-pre-line">
                {info!.weddingDescription}
              </p>
            </div>
          )}

          {hasCards && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {decisionCards.map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-pl-elevated border border-pl-soft rounded-xl p-5"
                >
                  <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
                    {label}
                  </p>
                  <p className="text-sm font-medium text-pl-text">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
