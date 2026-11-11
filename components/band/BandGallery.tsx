'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import type { ImageAsset } from '@/lib/types/image';
import { desktopGalleryComposition, quadrantSplit } from '@/lib/bands/bandGalleryLayout';
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
// Steht in einer eigenen hellen Section (BandGallerySection.tsx, Prototyp E):
// Galerie-Ueberschrift ("Ein Eindruck von der Buehne", <h2>) und Raster, kein
// eigener Hintergrund/Container. Client Component, da jedes Bild per Klick die
// Vergroesserungsfunktion (GalleryLightbox) oeffnet.
export function BandGallery({ band }: Props) {
  const images = band.gallery;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
        <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-pl-text">Ein Eindruck von der Bühne</h2>
        <span className="text-xs text-pl-text-muted">
          {images.length} {images.length === 1 ? 'Foto' : 'Fotos'} · zum Vergrößern antippen
        </span>
      </div>

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

function DesktopGallery({ images, onOpen }: { images: ImageAsset[]; onOpen: (index: number) => void }) {
  const composition = desktopGalleryComposition(images.length);
  const leitbild = images[0];

  if (composition === 'single') {
    return (
      <div className="hidden md:block">
        {/* Einzelbild fuellt die volle Containerbreite (max. 1140 px): die
            Bildgroesse muss dazu passen, sonst wird ein Viertelbreiten-Bild
            auf volle Breite gezogen (pixelig). */}
        <GalleryTile
          img={leitbild}
          index={0}
          onOpen={onOpen}
          className="aspect-[21/9] w-full"
          sizes="(min-width: 1140px) 1140px, 100vw"
        />
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
  sizes,
}: GalleryCellProps & { className: string; fill?: boolean; sizes?: string }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Bild vergrößern: ${img.alt}`}
      className={`relative rounded-lg overflow-hidden cursor-zoom-in group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent ${className}`}
    >
      <Image
        src={img.url}
        alt={img.alt}
        fill
        className="object-cover motion-safe:transition-transform motion-safe:group-hover:scale-105"
        sizes={sizes ?? (forceFill ? '(min-width: 768px) 40vw, 50vw' : '(min-width: 768px) 25vw, 50vw')}
      />
    </button>
  );
}
