import Image from 'next/image';
import type { Band } from '@/lib/types/band';

type Props = { band: Band };

export function BandGallery({ band }: Props) {
  if (band.gallery.length === 0) return null;

  const displayed = band.gallery.slice(0, 5);
  const sideImages = displayed.slice(1);
  const extraCount = band.gallery.length - 5;
  const showOverlay = extraCount > 0;

  return (
    <section className="bg-pl-canvas py-12 md:py-16 px-4 sm:px-6">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
          Bühnenmomente
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-8">
          Ein Eindruck von der Bühne
        </h2>

        {/* Mobile: erstes Bild oben, Rest 2-col */}
        <div className="md:hidden space-y-4">
          <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
            <Image
              src={displayed[0].url}
              alt={displayed[0].alt}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
          {sideImages.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {sideImages.map((img, i) => {
                const isLast = i === sideImages.length - 1;
                return (
                  <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      className="object-cover"
                      sizes="50vw"
                    />
                    {isLast && showOverlay && (
                      <div className="absolute inset-0 bg-pl-stage/70 flex items-center justify-center">
                        <span className="text-pl-on-stage text-base font-semibold">
                          +{extraCount} mehr
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop: editorial grid */}
        <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 gap-4 md:h-[440px]">
          {/* Großes Bild links, überspannt beide Zeilen */}
          <div className="row-span-2 relative rounded-xl overflow-hidden">
            <Image
              src={displayed[0].url}
              alt={displayed[0].alt}
              fill
              className="object-cover"
              sizes="(min-width: 1140px) 570px, 50vw"
            />
          </div>

          {/* Vier kleinere Bilder rechts */}
          {sideImages.map((img, i) => {
            const isLast = i === sideImages.length - 1;
            return (
              <div key={i} className="relative rounded-lg overflow-hidden">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1140px) 285px, 25vw"
                />
                {isLast && showOverlay && (
                  <div className="absolute inset-0 bg-pl-stage/70 flex items-center justify-center">
                    <span className="text-pl-on-stage text-base font-semibold">
                      +{extraCount} mehr
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
