import Link from 'next/link';
import Image from 'next/image';
import type { Band } from '@/lib/types/band';

type BandCardProps = { band: Band };

export default function BandCard({ band }: BandCardProps) {
  const image = band.thumbnailImage ?? band.heroImage;
  const alt = image?.alt ?? `Livefoto von ${band.name}`;

  return (
    <Link
      href={`/band/${band.slug}`}
      className="group block bg-pl-card rounded-lg overflow-hidden motion-safe:transition-colors motion-safe:duration-150 hover:bg-pl-card-hover"
    >
      <div className="relative aspect-[3/2] w-full bg-pl-surface">
        {image ? (
          <Image
            src={image.url}
            alt={alt}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-pl-text-muted text-sm">Kein Foto</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-pl-text font-semibold text-lg leading-snug mb-1">
          {band.name}
        </h3>
        {band.shortDescription && (
          <p className="text-pl-text-muted text-sm line-clamp-1 mb-2">
            {band.shortDescription}
          </p>
        )}
        {band.location.city && (
          <p className="text-pl-text-muted text-xs">{band.location.city}</p>
        )}
      </div>
    </Link>
  );
}
