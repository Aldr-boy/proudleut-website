'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState, type KeyboardEvent } from 'react';
import type { FeaturedSliderSlide } from '@/lib/types/featuredSlider';
import { featuredSliderImageUrl } from '@/sanity/lib/featuredSliderImage';

type Props = {
  slides?: FeaturedSliderSlide[] | null;
};

const FALLBACK = {
  label: 'Bands auf proudleut',
  headline: 'Livebands entdecken',
  text: 'Stöbere durch Bands und Live-Acts für Hochzeiten, Feste, Firmenfeiern und besondere Events.',
} as const;

const HERO_MIN_H =
  'min-h-[420px] md:min-h-[560px] lg:min-h-[620px] lg:max-h-[680px]';

function HeroOverlay() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(18,16,26,0.9) 0%, rgba(18,16,26,0.55) 38%, rgba(18,16,26,0.2) 62%, transparent 78%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(18,16,26,0.88) 0%, rgba(18,16,26,0.35) 42%, transparent 72%)',
        }}
      />
      <div className="absolute inset-0 bg-pl-gradient-spotlight pointer-events-none opacity-50" />
    </>
  );
}

function StaticFallbackHero() {
  return (
    <section
      className={`relative bg-pl-stage px-4 sm:px-6 ${HERO_MIN_H} flex items-end`}
      aria-labelledby="bands-hero-heading"
    >
      <div className="relative z-10 w-full max-w-[1140px] mx-auto pb-12 md:pb-16 pt-8">
        <p className="text-pl-accent-light text-sm font-medium tracking-wider uppercase mb-4">
          {FALLBACK.label}
        </p>
        <h1
          id="bands-hero-heading"
          className="text-3xl md:text-4xl font-bold text-pl-on-stage mb-4 leading-tight"
        >
          {FALLBACK.headline}
        </h1>
        <p className="text-base md:text-lg text-pl-on-stage-muted leading-relaxed max-w-[640px]">
          {FALLBACK.text}
        </p>
      </div>
    </section>
  );
}

function SlideNavigation({
  slides,
  activeIndex,
  onSelect,
  tabId,
  panelId,
}: {
  slides: FeaturedSliderSlide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  tabId: (index: number) => string;
  panelId: string;
}) {
  const slideCount = slides.length;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onSelect((activeIndex + 1) % slideCount);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onSelect((activeIndex - 1 + slideCount) % slideCount);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Weitere ausgewählte Livebands"
      onKeyDown={handleKeyDown}
      className="mt-10 flex flex-wrap gap-1.5 self-start max-w-2xl"
    >
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={`${slide.bandSlug}-${index}`}
            type="button"
            role="tab"
            id={tabId(index)}
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            aria-label={`Slide ${index + 1} von ${slideCount}: ${slide.headline}`}
            onClick={() => onSelect(index)}
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium motion-safe:transition-colors ${
              isActive
                ? 'bg-pl-accent text-pl-on-accent'
                : 'text-pl-on-stage/90 hover:text-pl-on-stage bg-pl-stage/40 hover:bg-pl-stage/55 ring-1 ring-inset ring-pl-stage'
            }`}
          >
            {slide.headline}
          </button>
        );
      })}
    </div>
  );
}

function SanitySlideHero({ slides }: { slides: FeaturedSliderSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex] ?? slides[0];

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  if (!activeSlide) {
    return <StaticFallbackHero />;
  }

  const imageSrc = featuredSliderImageUrl(activeSlide.image, 1920, 1080);
  const tabId = (index: number) => `bands-hero-tab-${index}`;
  const panelId = 'bands-hero-panel';
  const showNavigation = slides.length > 1;

  return (
    <section
      className={`relative bg-pl-stage ${HERO_MIN_H}`}
      aria-labelledby="bands-hero-heading"
    >
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <Image
          key={activeSlide.bandSlug}
          src={imageSrc}
          alt={activeSlide.imageAlt ?? activeSlide.headline}
          fill
          priority={activeIndex === 0}
          className="object-cover"
          sizes="100vw"
        />
        <HeroOverlay />
      </div>

      <div
        className={`relative z-10 flex flex-col justify-end px-4 sm:px-6 ${HERO_MIN_H}`}
      >
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby="bands-hero-slide-heading"
          className="w-full max-w-[1140px] mx-auto flex flex-col items-start pt-8 pb-12 md:pb-16"
        >
          <h1 id="bands-hero-heading" className="sr-only">
            Livebands entdecken
          </h1>
          <h2
            id="bands-hero-slide-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-pl-on-stage mb-3 leading-tight max-w-2xl"
          >
            {activeSlide.headline}
          </h2>
          <p className="text-base md:text-lg text-pl-on-stage leading-relaxed max-w-xl mb-6 line-clamp-3 md:line-clamp-4">
            {activeSlide.text}
          </p>
          <Link
            href={activeSlide.ctaHref}
            className="inline-flex items-center px-6 py-3 rounded-full bg-pl-accent text-pl-on-accent text-sm font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
          >
            {activeSlide.ctaLabel}
          </Link>

          {showNavigation && (
            <SlideNavigation
              slides={slides}
              activeIndex={activeIndex}
              onSelect={goTo}
              tabId={tabId}
              panelId={panelId}
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default function BandsHero({ slides }: Props) {
  if (slides && slides.length > 0) {
    return <SanitySlideHero slides={slides} />;
  }
  return <StaticFallbackHero />;
}
