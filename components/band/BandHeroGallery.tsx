'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ImageAsset } from '@/lib/types/image';
import { MOBILE_HERO_OBJECT_POSITION, MOBILE_HERO_RATIO } from '@/lib/bands/heroImagePresentation';
import { GalleryLightbox } from './GalleryLightbox';

type Props = { images: ImageAsset[] };

// Handy-Galerie im Bandprofil-Header (nur unter md, siehe BandHero.tsx):
// Hauptbild zuerst, danach die Buehnenfotos. Alle Folien nach derselben Regel
// (Seitenverhaeltnis MOBILE_HERO_RATIO, Foto fuellt den Bereich, Ausschnitt
// MOBILE_HERO_OBJECT_POSITION). Wischbar per Scroll-Snap; Zaehler unten rechts
// nur bei mehreren Folien. Antippen oeffnet die Vergroesserung (GalleryLightbox).
// Die untersten 28 px liegen unter der Aubergine-Flaeche (BandHero.tsx), der
// Zaehler sitzt deshalb darueber.
export function BandHeroGallery({ images }: Props) {
  const [index, setIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const multi = images.length > 1;

  return (
    <div
      className="relative md:hidden aspect-(--hero-ar) overflow-hidden"
      style={{ '--hero-ar': MOBILE_HERO_RATIO } as React.CSSProperties}
    >
      <div
        className={`flex h-full ${multi ? 'overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : ''}`}
        onScroll={
          multi
            ? (e) => {
                const el = e.currentTarget;
                const i = Math.round(el.scrollLeft / el.clientWidth);
                if (i !== index) setIndex(i);
              }
            : undefined
        }
      >
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`Bild vergrößern: ${img.alt}`}
            className="relative h-full basis-full shrink-0 snap-start cursor-zoom-in"
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              priority={i === 0}
              className="object-cover"
              style={{ objectPosition: MOBILE_HERO_OBJECT_POSITION }}
              sizes="100vw"
            />
          </button>
        ))}
      </div>

      {multi && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 bottom-10 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-white"
        >
          {index + 1} / {images.length}
        </span>
      )}

      <GalleryLightbox
        images={images}
        openIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  );
}
