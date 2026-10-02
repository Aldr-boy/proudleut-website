import Image from 'next/image';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';

type Props = {
  band: Band;
};

// Ruhige Karte fuer "Aehnliche Bands" auf der Banddetailseite (Prototyp E):
// Bild, Name, "Ort · Genre" -- ohne Teaser-Text, ohne Chips und ohne
// Merken-Herz (bewusste Abweichung von BandCard, die fuer /bands und die
// Startseite unveraendert bleibt). Die ganze Karte ist EIN Link auf das
// Bandprofil; das Bild ist dekorativ (alt=""), weil der Name direkt daneben im
// Linktext steht. Server-Komponente: kein Client-Code, kein Store.
export function SimilarBandCard({ band }: Props) {
  const image = band.thumbnailImage ?? band.heroImage;
  const city = band.location?.city?.trim();
  const genre = band.category?.trim();
  const meta = [city, genre].filter(Boolean).join(' · ');

  return (
    <Link
      href={`/band/${band.slug}`}
      className="group flex flex-col rounded-[20px] overflow-hidden bg-pl-elevated border border-pl-soft
                 hover:border-pl-medium motion-safe:transition-colors
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
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
      </div>

      <div className="flex flex-col gap-0.5 px-5 pt-[18px] pb-[22px]">
        <h3 className="text-xl font-extrabold tracking-[-0.01em] text-pl-text leading-snug">{band.name}</h3>
        {meta && <p className="text-sm text-pl-text-muted">{meta}</p>}
      </div>
    </Link>
  );
}
