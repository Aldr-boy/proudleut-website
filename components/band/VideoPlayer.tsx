'use client';

import Image from 'next/image';
import type { ImageAsset } from '@/lib/types/image';
import { useVideoModal } from './VideoModalProvider';

type Props = {
  bandName: string;
  poster?: ImageAsset;
};

// Poster-Tile in "02 Wie klingt die Band live?": reiner Trigger fuer das
// Video-Modal (siehe VideoModalProvider.tsx -- dort liegt der gesamte
// Dialog-/Click-to-load-Ablauf). Zeigt weiter ein lokales Bandbild, nie ein
// YouTube-Vorschaubild.
export function VideoPlayer({ bandName, poster }: Props) {
  const { openVideo } = useVideoModal();

  return (
    <button
      type="button"
      onClick={(e) => openVideo(e.currentTarget)}
      aria-haspopup="dialog"
      aria-label={`${bandName} Video ansehen`}
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
      <span className="absolute inset-0 flex items-center justify-center">
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
