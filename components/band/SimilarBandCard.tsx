import Image from 'next/image';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import { BandartPill } from '@/components/band/BandartPill';
import { MerkHeartButton } from '@/components/band/MerkHeartButton';

type Props = {
  band: Band;
};

// Ruhige Karte fuer "Aehnliche Bands" auf der Banddetailseite (Prototyp E):
// Bild, Name, Ort -- ohne Teaser-Text und ohne Chips. Wie in der Bandübersicht
// (BandCard) liegen die Bandart-Plakette oben links und das Merk-Herz oben
// rechts auf dem Foto (gleiche Komponenten). Der Profil-Link ist ein
// gestreckter eigener Link (wie in BandCard), damit der Merk-Button nicht
// innerhalb eines <a> liegt. Das Bild ist dekorativ (alt=""), weil der Name
// daneben steht. Server-Komponente; nur MerkHeartButton ist Client-Code.
export function SimilarBandCard({ band }: Props) {
  const image = band.thumbnailImage ?? band.heroImage;
  const city = band.location?.city?.trim();

  return (
    <div
      className="group relative flex flex-col rounded-[20px] overflow-hidden bg-pl-elevated border border-pl-soft
                 hover:border-pl-medium motion-safe:transition-colors"
    >
      <div className="relative h-[200px] w-full bg-pl-canvas">
        {image ? (
          <Image
            src={image.url}
            alt=""
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-pl-text-hint/30 select-none" aria-hidden="true">
              {band.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <BandartPill name={band.primaryBandart} />
        <MerkHeartButton
          name={band.name}
          slug={band.slug}
          anfrageEventTypes={band.anfrageEventTypes ?? []}
        />
      </div>

      <div className="flex flex-col gap-0.5 px-5 pt-[18px] pb-[22px]">
        <h3 className="text-xl font-extrabold tracking-[-0.01em] text-pl-text leading-snug">{band.name}</h3>
        {city && <p className="text-sm text-pl-text-muted">{city}</p>}
      </div>

      <Link
        href={`/band/${band.slug}`}
        aria-label={`Zum Bandprofil: ${band.name}`}
        className="absolute inset-0 z-0 focus:outline-none focus-visible:outline-2
                   focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pl-accent)]"
      />
    </div>
  );
}
