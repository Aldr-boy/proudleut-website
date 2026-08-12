import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import type { ImageAsset } from '@/lib/types/image';
import { chunkMobilePairs, desktopGalleryComposition, quadrantSplit } from '@/lib/bands/bandGalleryLayout';

type Props = { band: Band };

// Geschlossenes Editorial-Raster je Bildanzahl (Design-Soll 2d, Auftrag 4.2).
// 0 Bilder: Section entfaellt (siehe BandGallery-Rueckgabe unten).
// 1 Bild: einzelnes dominantes Editorial-Bild, keine kuenstliche Rasterkomposition.
// 2/3/4: feste Kompositionen exakt nach 2d, kein CSS-Auto-Placement (das wuerde
// bei 3 oder 4 Bildern sichtbare Luecken im 3-spaltigen Raster hinterlassen).
// 5+: Leitbild + 2x2-Quadrant aus den ersten 5 Bildern; ab Bild 6 ein
// einfaches Fortsetzungsraster darunter -- kein "+N mehr"-Overlay, das
// Bildinhalt verdecken wuerde, da ab Auftrag 4.2 kein vorhandener Content
// abgeschnitten werden darf.
export function BandGallery({ band }: Props) {
  const images = band.gallery;
  if (images.length === 0) return null;

  return (
    <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
          Bühnenmomente
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-8">
          Ein Eindruck von der Bühne
        </h2>

        <MobileGallery images={images} />
        <DesktopGallery images={images} />
      </div>
    </section>
  );
}

// Mobile: eigene Komposition (Auftrag 4.2 -- "nicht das Desktop-Raster
// verkleinern"), entsprechend 2b. Leitbild volle Breite oben, danach die
// restlichen Bilder in 2er-Zeilen; ein uebrig bleibendes ungerades Bild
// bekommt am Ende die volle Breite. Skaliert ohne Sonderfall auf jede
// Bildanzahl (bei genau 1 Bild bleibt "rest" leer -- nur das Leitbild).
function MobileGallery({ images }: { images: ImageAsset[] }) {
  const [leitbild, ...rest] = images;
  const pairs = chunkMobilePairs(rest);

  return (
    <div className="md:hidden space-y-4">
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden">
        <Image src={leitbild.url} alt={leitbild.alt} fill className="object-cover" sizes="100vw" />
      </div>
      {pairs.map((pair, i) =>
        pair.length === 2 ? (
          <div key={i} className="grid grid-cols-2 gap-4">
            {pair.map((img, j) => (
              <div key={j} className="relative aspect-[3/2] rounded-lg overflow-hidden">
                <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="50vw" />
              </div>
            ))}
          </div>
        ) : (
          <div key={i} className="relative w-full aspect-[16/9] rounded-lg overflow-hidden">
            <Image src={pair[0].url} alt={pair[0].alt} fill className="object-cover" sizes="100vw" />
          </div>
        )
      )}
    </div>
  );
}

function DesktopGallery({ images }: { images: ImageAsset[] }) {
  const composition = desktopGalleryComposition(images.length);
  const leitbild = images[0];

  if (composition === 'single') {
    return (
      <div className="hidden md:block relative w-full aspect-[21/9] rounded-xl overflow-hidden">
        <Image
          src={leitbild.url}
          alt={leitbild.alt}
          fill
          className="object-cover"
          sizes="(min-width: 1140px) 1140px, 100vw"
        />
      </div>
    );
  }

  if (composition === 'pair') {
    return (
      <div className="hidden md:grid md:grid-cols-[2fr_1fr] gap-4 md:h-[320px]">
        <GalleryLeitbild img={leitbild} spanRows={false} sizes="(min-width: 1140px) 740px, 66vw" />
        <GalleryCell img={images[1]} sizes="(min-width: 1140px) 360px, 33vw" />
      </div>
    );
  }

  if (composition === 'leitbild-column') {
    return (
      <div className="hidden md:grid md:grid-cols-[2fr_1fr] md:grid-rows-2 gap-4 md:h-[440px]">
        <GalleryLeitbild img={leitbild} spanRows sizes="(min-width: 1140px) 740px, 66vw" />
        <GalleryCell img={images[1]} sizes="(min-width: 1140px) 360px, 33vw" />
        <GalleryCell img={images[2]} sizes="(min-width: 1140px) 360px, 33vw" />
      </div>
    );
  }

  if (composition === 'leitbild-row') {
    return (
      <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 gap-4 md:h-[440px]">
        <GalleryLeitbild img={leitbild} spanRows sizes="(min-width: 1140px) 570px, 50vw" />
        <GalleryCell img={images[1]} sizes="(min-width: 1140px) 285px, 25vw" />
        <GalleryCell img={images[2]} sizes="(min-width: 1140px) 285px, 25vw" />
        <div className="col-span-2 relative rounded-lg overflow-hidden">
          <Image
            src={images[3].url}
            alt={images[3].alt}
            fill
            className="object-cover"
            sizes="(min-width: 1140px) 570px, 50vw"
          />
        </div>
      </div>
    );
  }

  // composition === 'quadrant' (5+ Bilder)
  const { quadrant, continuation } = quadrantSplit(images);

  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-4 h-[440px]">
        <GalleryLeitbild img={leitbild} spanRows sizes="(min-width: 1140px) 570px, 50vw" />
        {quadrant.map((img, i) => (
          <GalleryCell key={i} img={img} sizes="(min-width: 1140px) 285px, 25vw" />
        ))}
      </div>

      {continuation.length > 0 && (
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {continuation.map((img, i) => (
            <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src={img.url}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="(min-width: 1140px) 25vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryLeitbild({
  img,
  spanRows,
  sizes,
}: {
  img: ImageAsset;
  spanRows: boolean;
  sizes: string;
}) {
  return (
    <div className={`${spanRows ? 'row-span-2 ' : ''}relative rounded-xl overflow-hidden`}>
      <Image src={img.url} alt={img.alt} fill className="object-cover" sizes={sizes} />
    </div>
  );
}

function GalleryCell({ img, sizes }: { img: ImageAsset; sizes: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden">
      <Image src={img.url} alt={img.alt} fill className="object-cover" sizes={sizes} />
    </div>
  );
}
