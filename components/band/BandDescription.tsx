import { MarkdownText } from '@/components/MarkdownText';
import type { Band } from '@/lib/types/band';

type Props = {
  band: Band;
  embedUrl: string | null;
};

export function BandDescription({ band, embedUrl }: Props) {
  if (!band.description && !embedUrl) return null;

  return (
    <section className="bg-pl-canvas py-12 md:py-16">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6 space-y-10">
        {band.description && (
          <MarkdownText
            text={band.description}
            className="text-pl-text leading-8 space-y-5 text-base md:text-[1.05rem]"
          />
        )}

        {embedUrl && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-pl-stage">
            <iframe
              src={embedUrl}
              title={`Video von ${band.name}`}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        )}
      </div>
    </section>
  );
}
