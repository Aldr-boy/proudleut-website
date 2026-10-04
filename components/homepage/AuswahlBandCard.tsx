import Link from 'next/link';
import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import type { ImageAsset } from '@/lib/types/image';
import { BandartPill } from '@/components/band/BandartPill';
import { MerkHeartButton } from '@/components/band/MerkHeartButton';

// Schlankes Payload-Format fuer "01 -- Auswahl": traegt ausschliesslich die
// Felder, die diese Card tatsaechlich rendert (Nachfass-Paket "Kuratierte
// Klingt-nach-Filter", Schritt 4 -- Payload-Reduktion). Wird serverseitig
// (app/page.tsx) aus dem vollen Band gemappt, nachdem Anlass-/Mood-Filter
// und Rotation bereits auf den vollen Band-Objekten gelaufen sind.
export type AuswahlBandSummary = Pick<Band, 'slug' | 'name' | 'moods' | 'anfrageEventTypes' | 'primaryBandart'> & {
  shortDescription?: string;
  thumbnailImage?: ImageAsset;
  heroImage?: ImageAsset;
};

export function toAuswahlBandSummary(band: Band): AuswahlBandSummary {
  return {
    slug: band.slug,
    name: band.name,
    shortDescription: band.shortDescription,
    thumbnailImage: band.thumbnailImage,
    heroImage: band.heroImage,
    moods: band.moods,
    anfrageEventTypes: band.anfrageEventTypes,
    primaryBandart: band.primaryBandart,
  };
}

// Eigene, schlanke Card-Variante fuer die Startseiten-Section "01 --
// Auswahl": bewusst NICHT components/BandCard.tsx wiederverwendet, da
// dessen Chip-Logik auf Event-Types/Kategorie/Region basiert. Hier
// verlangt der Auftrag ausschliesslich echte "Klingt nach"-Moods (max. 2)
// -- eine eigene, kleine Komponente ist die minimalinvasivere Loesung als
// BandCard fuer einen zweiten Chip-Modus zu erweitern und damit auch
// /bands und /veranstaltung/[slug] zu beeinflussen.
export default function AuswahlBandCard({
  band,
  priority,
}: {
  band: AuswahlBandSummary;
  priority?: boolean;
}) {
  const image = band.thumbnailImage ?? band.heroImage;
  const chips = band.moods.slice(0, 2);

  return (
    <div
      className="group relative bg-pl-elevated border border-pl-soft rounded-xl overflow-hidden
                 hover:border-pl-medium motion-safe:transition-colors"
    >
      <div className="relative aspect-[16/10] bg-pl-canvas">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            priority={priority}
            className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-pl-text-hint/30 select-none" aria-hidden="true">
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
      <div className="p-5">
        <div className="text-lg font-extrabold text-pl-text">{band.name}</div>
        {band.shortDescription && (
          <p className="mt-1.5 text-sm leading-relaxed text-pl-text-muted line-clamp-2">
            {band.shortDescription}
          </p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {chips.map((chip) => (
              <span
                key={chip.slug}
                className="text-xs px-2.5 py-1 rounded-full bg-pl-accent-subtle text-pl-accent-deep"
              >
                {chip.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Gestreckter Link ueber die ganze Karte (wie components/BandCard.tsx):
          das Merk-Herz liegt darueber (z-10) und ist kein Kind des Links. */}
      <Link
        href={`/band/${band.slug}`}
        aria-label={`Zum Bandprofil: ${band.name}`}
        className="absolute inset-0 z-0 focus:outline-none focus-visible:outline-2
                   focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pl-accent)]"
      />
    </div>
  );
}
