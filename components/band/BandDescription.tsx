import { MarkdownText } from '@/components/MarkdownText';
import type { Band } from '@/lib/types/band';

type Props = {
  band: Band;
};

export function BandDescription({ band }: Props) {
  if (!band.description) return null;

  // Spacing-Rhythmus "small" Richtung Video (falls vorhanden -- dessen
  // eigenes pb ist ebenfalls reduziert, siehe BandVideoSection). Ohne Video
  // bleibt der Abstand zur vorherigen Section (Tags) dank deren eigenem
  // Bottom-Padding weiterhin ausreichend, kein Loch. Generoeser Ausstieg
  // nach unten vor der naechsten Section.
  return (
    <section className="bg-pl-canvas pt-8 md:pt-10 pb-16 md:pb-20 px-4 sm:px-6">
      <div className="max-w-[820px] mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-6">
          Über {band.name}
        </h2>
        <MarkdownText
          text={band.description}
          className="text-pl-text leading-8 space-y-5 text-base md:text-[1.05rem]"
        />
      </div>
    </section>
  );
}
