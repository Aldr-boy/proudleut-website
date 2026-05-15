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

export default function BandGrid({ bands }: { bands: Band[] }) {
  const [displayed, setDisplayed] = useState<Band[]>(() => bands.slice(0, 9));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setDisplayed(shuffle(bands).slice(0, 9));
    setVisible(true);
  }, [bands]);

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
