import { MarkdownText } from '@/components/MarkdownText';
import type { Band } from '@/lib/types/band';

type Props = {
  band: Band;
};

export function BandDescription({ band }: Props) {
  if (!band.description) return null;

  return (
    <section className="bg-pl-canvas py-12 md:py-16">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6">
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
