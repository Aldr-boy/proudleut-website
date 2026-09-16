import { MarkdownText } from '@/components/MarkdownText';
import type { Band } from '@/lib/types/band';

type Props = {
  band: Band;
};

// "01 Wer steht hier auf der Bühne?" (Auftrag Abschnitt 8). Die kompakte,
// gut lesbare Einleitung ist bereits die shortDescription im Hero
// (BandHero.tsx) -- sie hier nochmal woertlich als Zitat zu wiederholen,
// wirkte beim Scrollen wie eine unbeabsichtigte Dopplung (live an Donnaweda
// geprueft) und ist ausserdem kein zweites, eigenstaendiges Bandzitat
// (das darf laut Auftrag nicht erfunden werden). "01" traegt deshalb direkt
// den vollen Langtext, servergerendert in <details>, damit nichts erst beim
// Aufklappen nachgeladen wird.
export function BandDescription({ band }: Props) {
  if (!band.description) return null;

  return (
    <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">01</p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-6">
          Wer steht hier auf der Bühne?
        </h2>

        <div className="max-w-[720px]">
          <details className="group">
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
                text={band.description}
                className="text-pl-text leading-8 space-y-5 text-base md:text-[1.05rem]"
              />
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
