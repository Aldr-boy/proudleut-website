import { MarkdownText } from '@/components/MarkdownText';
import type { Band } from '@/lib/types/band';
import { formatLocation } from '@/lib/utils/formatLocation';

type Props = {
  band: Band;
};

// "01 Wer steht hier auf der Bühne?" (Auftrag "Bandseiten-Finalisierung":
// kurze Beschreibungen vollstaendig sichtbar, bei langen Texten einen
// sinnvollen Einstieg sichtbar lassen und nur den Rest einklappen --
// vollstaendiger Text bleibt servergerendert im DOM). Absatz 1 steht immer
// offen da; weitere Absaetze (falls vorhanden) liegen in <details>, ohne
// Toggle-Button, wenn es nur einen einzigen Absatz gibt. Rechte Spalte:
// Bandart/Herkunft/Besetzung (finaler Entwurf, sec-wer: band.facts neben
// der Beschreibung statt in "03").
export function BandDescription({ band }: Props) {
  const paragraphs = band.description ? band.description.trim().split(/\n\n+/) : [];
  const [firstParagraph, ...restParagraphs] = paragraphs;
  const hasMore = restParagraphs.length > 0;

  const besetzung = band.weddingInfo?.bandSize || band.weddingInfo?.constellation;
  const locationText = formatLocation(band.location);
  const facts = (
    [
      band.category ? { label: 'Bandart', value: band.category } : null,
      locationText ? { label: 'Herkunft', value: locationText } : null,
      besetzung ? { label: 'Besetzung', value: besetzung } : null,
    ] as ({ label: string; value: string } | null)[]
  ).filter((f): f is { label: string; value: string } => f !== null);

  if (!firstParagraph && facts.length === 0) return null;

  return (
    <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">01</p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-6">
          Wer steht hier auf der Bühne?
        </h2>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {firstParagraph && (
            <div className="flex-[1.6] min-w-0 max-w-[720px]">
              <MarkdownText
                text={firstParagraph}
                className="text-pl-text leading-8 text-base md:text-[1.05rem]"
              />

              {hasMore && (
                <details className="group mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-pl-accent-deep hover:text-pl-accent motion-safe:transition-colors list-none inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent rounded-sm">
                    <span className="group-open:hidden">Mehr über {band.name}</span>
                    <span className="hidden group-open:inline">Weniger anzeigen</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-open:rotate-180 motion-safe:transition-transform"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="mt-5">
                    <MarkdownText
                      text={restParagraphs.join('\n\n')}
                      className="text-pl-text leading-8 space-y-5 text-base md:text-[1.05rem]"
                    />
                  </div>
                </details>
              )}
            </div>
          )}

          {facts.length > 0 && (
            <div className="flex-1 min-w-0 lg:max-w-[280px] lg:self-start">
              {facts.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5 py-3.5 border-b border-pl-soft">
                  <span className="text-[11px] font-semibold text-pl-text-hint uppercase tracking-wider">
                    {label}
                  </span>
                  <span className="text-[15px] font-bold text-pl-text">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
