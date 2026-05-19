'use client';

import { useState, useEffect } from 'react';
import BandCard from '@/components/BandCard';
import type { Band } from '@/lib/types/band';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function BandGrid({ bands, limit }: { bands: Band[]; limit?: number }) {
  const [displayed, setDisplayed] = useState<Band[]>(() =>
    limit != null ? bands.slice(0, limit) : bands
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const shuffled = shuffle(bands);
    setDisplayed(limit != null ? shuffled.slice(0, limit) : shuffled);
    setVisible(true);
  }, [bands, limit]);

  return (
    <div className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayed.map((band) => (
          <BandCard key={band.slug} band={band} />
        ))}
      </div>
    </div>
  );
}
