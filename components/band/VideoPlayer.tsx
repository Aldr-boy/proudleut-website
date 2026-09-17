'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ImageAsset } from '@/lib/types/image';

type Props = {
  embedUrl: string;
  bandName: string;
  poster?: ImageAsset;
};

// Klick-zum-Laden: der youtube-nocookie.com-Embed (und damit jede
// YouTube-Ressource) wird erst nach einer bewussten Nutzeraktion
// angefordert -- vorher steht nur ein Button mit einem bereits vorhandenen
// lokalen Bandbild als Vorschau im DOM, kein iframe, kein YouTube-
// Vorschaubild von i.ytimg.com. Kein Autoplay mit Ton ausserhalb dieser
// Aktion; nach dem Klick ist Autoplay im Rahmen der bewussten Nutzeraktion
// selbst zulaessig (der Nutzer hat gerade "abspielen" gewaehlt).
export function VideoPlayer({ embedUrl, bandName, poster }: Props) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={`${embedUrl}?autoplay=1`}
        title={`${bandName} Video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      aria-label={`${bandName} Video abspielen`}
      className="group absolute inset-0 w-full h-full focus:outline-none"
    >
      {poster && (
        <Image
          src={poster.url}
          alt=""
          aria-hidden="true"
          fill
          className="object-cover"
          sizes="(min-width: 768px) 700px, 100vw"
        />
      )}
      <span className="absolute inset-0 bg-black/25 group-hover:bg-black/35 motion-safe:transition-colors" />
      <span
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 text-pl-stage
                     shadow-lg group-hover:scale-105 motion-safe:transition-transform
                     group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-white"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
