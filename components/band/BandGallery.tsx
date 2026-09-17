'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import type { ImageAsset } from '@/lib/types/image';
import { chunkMobilePairs, desktopGalleryComposition, quadrantSplit } from '@/lib/bands/bandGalleryLayout';
import { GalleryLightbox } from './GalleryLightbox';

type Props = { band: Band };

// Geschlossenes Editorial-Raster je Bildanzahl (Design-Soll 2d). 0 Bilder:
// entfaellt (siehe Rueckgabe unten). 1 Bild: einzelnes dominantes
// Editorial-Bild, keine kuenstliche Rasterkomposition. 2/3/4: feste
// Kompositionen, kein CSS-Auto-Placement (das wuerde bei 3/4 Bildern
// sichtbare Luecken im 3-spaltigen Raster hinterlassen). 5+: Leitbild +
// 2x2-Quadrant aus den ersten 5 Bildern; ab Bild 6 ein einfaches
// Fortsetzungsraster darunter -- kein "+N mehr"-Overlay.
//
// Bandseiten-Finalisierung: eingebettet in die dunkle "02"-Flaeche (siehe
// BandVideoSection.tsx) statt einer eigenen hellen Section -- kein eigener
// Hintergrund/Container/Numerierung mehr, nur noch die Galerie-Ueberschrift
// und das Raster. Client Component, da jedes Bild per Klick die
// Vergroesserungsfunktion (GalleryLightbox) oeffnet.
export function BandGallery({ band }: Props) {
  const images = band.gallery;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h3 className="text-lg font-bold text-pl-on-stage">Ein Eindruck von der Bühne</h3>
        <span className="text-xs text-pl-on-stage-muted">
          {images.length} {images.length === 1 ? 'Foto' : 'Fotos'} · zum Vergrößern antippen
        </span>
      </div>

      <MobileGallery images={images} onOpen={setOpenIndex} />
      <DesktopGallery images={images} onOpen={setOpenIndex} />

      <GalleryLightbox
        images={images}
        openIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  );
}

type GalleryCellProps = {
  img: ImageAsset;
  index: number;
  onOpen: (index: number) => void;
};

// Mobile: eigene Komposition ("nicht das Desktop-Raster verkleinern").
// Leitbild volle Breite oben, danach die restlichen Bilder in 2er-Zeilen;
// ein uebrig bleibendes ungerades Bild bekommt am Ende die volle Breite.
// Skaliert ohne Sonderfall auf jede Bildanzahl (bei genau 1 Bild bleibt
// "rest" leer -- nur das Leitbild).
function MobileGallery({ images, onOpen }: { images: ImageAsset[]; onOpen: (index: number) => void }) {
  const [leitbild, ...rest] = images;
  const pairs = chunkMobilePairs(rest);

  return (
    <div className="md:hidden space-y-3">
      <GalleryTile img={leitbild} index={0} onOpen={onOpen} className="aspect-[16/10] w-full" />
      {pairs.map((pair, i) =>
        pair.length === 2 ? (
          <div key={i} className="grid grid-cols-2 gap-3">
            {pair.map((img, j) => (
              <GalleryTile key={j} img={img} index={1 + i * 2 + j} onOpen={onOpen} className="aspect-[3/2]" />
            ))}
          </div>
        ) : (
          <GalleryTile key={i} img={pair[0]} index={1 + i * 2} onOpen={onOpen} className="aspect-[16/9] w-full" />
        )
      )}
    </div>
  );
}

function DesktopGallery({ images, onOpen }: { images: ImageAsset[]; onOpen: (index: number) => void }) {
  const composition = desktopGalleryComposition(images.length);
  const leitbild = images[0];

  if (composition === 'single') {
    return (
      <div className="hidden md:block">
        <GalleryTile img={leitbild} index={0} onOpen={onOpen} className="aspect-[21/9] w-full" />
      </div>
    );
  }

  if (composition === 'pair') {
    return (
      <div className="hidden md:grid md:grid-cols-[2fr_1fr] gap-3 md:h-[280px]">
        <GalleryTile img={leitbild} index={0} onOpen={onOpen} className="h-full" fill />
        <GalleryTile img={images[1]} index={1} onOpen={onOpen} className="h-full" fill />
      </div>
    );
  }

  if (composition === 'leitbild-column') {
    return (
      <div className="hidden md:grid md:grid-cols-[2fr_1fr] md:grid-rows-2 gap-3 md:h-[380px]">
        <GalleryTile img={leitbild} index={0} onOpen={onOpen} className="row-span-2 h-full" fill />
        <GalleryTile img={images[1]} index={1} onOpen={onOpen} className="h-full" fill />
        <GalleryTile img={images[2]} index={2} onOpen={onOpen} className="h-full" fill />
      </div>
    );
  }

  if (composition === 'leitbild-row') {
    return (
      <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 gap-3 md:h-[380px]">
        <GalleryTile img={leitbild} index={0} onOpen={onOpen} className="row-span-2 h-full" fill />
        <GalleryTile img={images[1]} index={1} onOpen={onOpen} className="h-full" fill />
        <GalleryTile img={images[2]} index={2} onOpen={onOpen} className="h-full" fill />
        <GalleryTile img={images[3]} index={3} onOpen={onOpen} className="col-span-2 h-full" fill />
      </div>
    );
  }

  // composition === 'quadrant' (5+ Bilder)
  const { quadrant, continuation } = quadrantSplit(images);

  return (
    <div className="hidden md:block">
      <div className="grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-3 h-[380px]">
        <GalleryTile img={leitbild} index={0} onOpen={onOpen} className="row-span-2 h-full" fill />
        {quadrant.map((img, i) => (
          <GalleryTile key={i} img={img} index={1 + i} onOpen={onOpen} className="h-full" fill />
        ))}
      </div>

      {continuation.length > 0 && (
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
          {continuation.map((img, i) => (
            <GalleryTile key={i} img={img} index={5 + i} onOpen={onOpen} className="aspect-[4/3]" />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryTile({
  img,
  index,
  onOpen,
  className,
  fill: forceFill,
}: GalleryCellProps & { className: string; fill?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Bild vergrößern: ${img.alt}`}
      className={`relative rounded-lg overflow-hidden cursor-zoom-in group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light ${className}`}
    >
      <Image
        src={img.url}
        alt={img.alt}
        fill
        className="object-cover motion-safe:transition-transform motion-safe:group-hover:scale-105"
        sizes={forceFill ? '(min-width: 768px) 40vw, 50vw' : '(min-width: 768px) 25vw, 50vw'}
      />
    </button>
  );
}
