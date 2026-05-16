import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import { formatLocation } from '@/lib/utils/formatLocation';

type Props = { band: Band };

export function BandHero({ band }: Props) {
  const locationText = formatLocation(band.location);

  return (
    <div className="relative w-full min-h-[55vh] md:min-h-[65vh] bg-pl-stage overflow-hidden">
      {band.heroImage && (
        <Image
          src={band.heroImage.url}
          alt={band.heroImage.alt}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      )}

      {/* Gradient overlay: dunkelt von unten, lässt oben transparent */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(18,16,26,0.93) 0%, rgba(18,16,26,0.45) 45%, rgba(18,16,26,0.1) 72%, transparent 100%)',
        }}
      />

      {/* Content – bündig unten links */}
      <div className="relative z-10 flex items-end h-full min-h-[55vh] md:min-h-[65vh]">
        <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-6 pb-10 md:pb-14">
          {band.logo && (
            <div className="mb-4">
              <Image
                src={band.logo.url}
                alt={band.logo.alt}
                width={200}
                height={80}
                className="object-contain object-left"
                style={{ width: 'auto', maxWidth: '160px', maxHeight: '56px', height: 'auto' }}
              />
            </div>
          )}

          {band.category && (
            <span className="inline-block px-3 py-1 mb-3 rounded-full text-xs font-semibold bg-pl-accent-subtle text-pl-accent-deep">
              {band.category}
            </span>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-pl-on-stage leading-tight mb-3">
            {band.name}
          </h1>

          {band.shortDescription && (
            <p className="text-base md:text-lg text-pl-on-stage-muted max-w-2xl mb-4 leading-relaxed">
              {band.shortDescription}
            </p>
          )}

          {locationText && (
            <div className="flex items-center gap-1.5 text-sm text-pl-on-stage-muted">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{locationText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
