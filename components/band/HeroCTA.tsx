'use client';

import { useState } from 'react';
import { AnfrageModal } from './AnfrageModal';
import { BandMerkHeart } from './BandMerkHeart';
import { Button } from '@/components/ui/Button';
import type { BandAnfrageEventType } from '@/lib/types/band';

type Props = {
  name: string;
  slug: string;
  anfrageEventTypes: BandAnfrageEventType[];
};

// Id des Hero-Anfrage-Buttons: BandFloatingCta beobachtet ihn per
// IntersectionObserver und blendet die Leisten erst ein, wenn er aus dem
// Bild gescrollt ist.
export const HERO_ANFRAGE_BUTTON_ID = 'hero-anfrage-btn';

// Anfrage-Button + Merken-Herz im Hero-Bild. Die Video-Pille steht separat
// (HeroVideoPill, Position je Breakpoint in BandHero).
export function HeroCTA({ name, slug, anfrageEventTypes }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <Button
        id={HERO_ANFRAGE_BUTTON_ID}
        onClick={() => setModalOpen(true)}
        aria-label={`${name} anfragen`}
        className="inline-flex flex-1 md:flex-none items-center justify-center h-[52px] md:h-[54px] px-[30px] rounded-full
                   text-base md:text-[17px] font-extrabold bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover"
      >
        Unverbindlich anfragen
      </Button>

      <BandMerkHeart
        name={name}
        slug={slug}
        anfrageEventTypes={anfrageEventTypes}
        tone="image"
        className="w-[52px] h-[52px] md:w-[54px] md:h-[54px]"
      />

      <AnfrageModal
        bands={[{ slug, name, anfrageEventTypes }]}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        allowBandRemoval={false}
      />
    </div>
  );
}
