import { MarkdownText } from '@/components/MarkdownText';
import type { Band } from '@/lib/types/band';
import { hasParagraphBreak, splitParagraphs } from '@/lib/bands/bandTextParagraphs';
import { BandChapterHeading } from './BandChapterHeading';

type Props = {
  band: Band;
};

// "Wer steht hier auf der Bühne?" (Prototyp E, ohne Kapitelnummer): links "Klingt nach" in
// grosser Typografie (22 px mobil, 28 px ab lg) mit Linien, rechts der Bandtext als Zweispalter; mobil
// steht "Klingt nach" als Liste ueber dem Text. Absatz 1 steht immer offen
// da; weitere Absaetze (falls vorhanden) liegen in <details> ("Mehr ueber X",
// vollstaendiger Text bleibt servergerendert im DOM), ohne Toggle, wenn es nur
// einen einzigen Absatz gibt. Bandart/Herkunft/Besetzung stehen nicht mehr
// hier: Bandart im Hero-Kicker, Herkunft und Besetzung in der Faktenleiste
// (siehe BandHero.tsx, lib/bands/bandFacts.ts). Ohne "Klingt nach" entfaellt
// die linke Spalte komplett, der Text rueckt an den linken Containerrand
// (max. 680 px, wie in E).
export function BandDescription({ band }: Props) {
  // Echte Absaetze (Leerzeile, auch als \r\n\r\n) bestimmen die Einklapp-Grenze.
  // Hat der Text keine, werden einfache Umbrueche als Zeilenabstand gerendert
  // (lineBreaks="spaced"), die Einklapp-Logik bleibt davon unberuehrt.
  const paragraphs = band.description ? splitParagraphs(band.description) : [];
  const lineBreaks = band.description && !hasParagraphBreak(band.description) ? 'spaced' : 'break';
  const [firstParagraph, ...restParagraphs] = paragraphs;
  const hasMore = restParagraphs.length > 0;
  const klingtNach = band.klingtNach;

  if (!firstParagraph && klingtNach.length === 0) return null;

  return (
    <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6">
      <div className="pl-container-shell">
        <BandChapterHeading title="Wer steht hier auf der Bühne?" divider={false} />

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-[72px]">
          {klingtNach.length > 0 ? (
            <div className="lg:w-[400px] lg:shrink-0">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-pl-accent-deep pb-3">
                Klingt nach
              </p>
              <ul>
                {klingtNach.map((tag) => (
                  <li
                    key={tag}
                    className="py-[10px] lg:py-3 border-t border-pl-soft text-[22px] lg:text-[28px] leading-[1.12] tracking-[-0.025em] font-extrabold text-pl-text"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {firstParagraph && (
            <div className="flex-1 min-w-0 max-w-[680px]">
              <MarkdownText
                text={firstParagraph}
                lineBreaks={lineBreaks}
                className="text-pl-text leading-[1.6] lg:leading-[1.65] text-[17px] lg:text-lg"
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
                      lineBreaks={lineBreaks}
                      className="text-pl-text leading-[1.6] lg:leading-[1.65] space-y-5 text-[17px] lg:text-lg"
                    />
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
