import Link from 'next/link';
import Image from 'next/image';
import type { Band } from '@/lib/types/band';

type BandCardProps = { band: Band; priority?: boolean };

function buildChips(band: Band): string[] {
  const chips: string[] = [];
  const seen = new Set<string>();

  const tryAdd = (value: string | undefined): boolean => {
    const trimmed = value?.trim();
    if (!trimmed) return false;
    const key = trimmed.toLowerCase();
    if (seen.has(key) || chips.length >= 4) return false;
    seen.add(key);
    chips.push(trimmed);
    return true;
  };

  let fromEventTypes = 0;
  for (const et of band.eventTypes) {
    if (fromEventTypes >= 3 || chips.length >= 4) break;
    if (tryAdd(et)) fromEventTypes++;
  }
  tryAdd(band.category);
  tryAdd(band.location.administrativeRegion);

  return chips;
}

export default function BandCard({ band, priority }: BandCardProps) {
  const image = band.thumbnailImage ?? band.heroImage;
  const alt = image?.alt ?? `Livefoto von ${band.name}`;
  const subtitle = band.shortDescription?.trim();
  const city = band.location?.city?.trim() || band.location?.district?.trim();
  const chips = buildChips(band);

  return (
    <Link
      href={`/band/${band.slug}`}
      className="group block rounded-xl overflow-hidden bg-pl-elevated border border-pl-soft
                 shadow-pl-photo hover:border-pl-medium motion-safe:transition-colors"
    >
      {/* Bildbereich – dominiert die Karte */}
      <div className="relative aspect-[3/2] w-full bg-pl-elevated">
        {image ? (
          <Image
            src={image.url}
            alt={alt}
            fill
            priority={priority}
            className="object-cover motion-safe:transition-transform
                       motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-pl-canvas">
            <span className="text-5xl font-bold text-pl-text-hint/30 select-none" aria-hidden="true">
              {band.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Textbereich */}
      <div className="p-4">
        <h3 className="text-pl-text font-semibold text-lg leading-snug mb-1 line-clamp-1">
          {band.name}
        </h3>
        {subtitle && (
          <p className="text-pl-text-muted text-sm line-clamp-1 mb-2">{subtitle}</p>
        )}
        {city && (
          <p className="text-pl-text-muted text-xs">{city}</p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {chips.map((chip) => (
              <span
                key={chip}
                className="text-xs px-2 py-0.5 rounded-full bg-pl-accent-subtle text-pl-accent-deep"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
