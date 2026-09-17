import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import { findCategoryForEventTypeSlug } from './bandTagsCategoryMatch';
import { BandReferenceEvents } from './BandReferenceEvents';
import { BandDocumentsSection } from './BandDocumentsSection';
import { BandWeddingModule } from './BandWeddingModule';
import { BandChapterHeading } from './BandChapterHeading';

type Props = {
  band: Band;
};

// Zurueckgenommene Chip-Optik (duennere Kontur, kein weisser Fuellton, kein
// font-semibold) -- die Anlass-Chips sollen wie Kontext wirken, nicht wie
// gleichrangige Hauptaktionen neben "Anfragen"/"Merken" (Auftrag
// "Bandseiten-Nachschaerfung", Abschnitt 3).
const PILL =
  'inline-flex items-center rounded-full border border-pl-soft px-3.5 py-1.5 text-sm font-medium text-pl-text-muted';

// "03 Die Band für euer Event?" (Nachschaerfung, Abschnitt 3): drei
// datengetriebene Ebenen statt eines zweispaltigen Rasters mit intern
// nochmals zweispaltigen Referenzen -- 1) "Spielt bei" ueber die volle
// Breite, 2) Referenz-Events links / Hochzeitskarte rechts (nur wenn
// beide vorhanden, sonst nutzt die eine vorhandene Gruppe die volle
// Lesebreite), 3) Festwirte-Unterlagen als flache Karte ueber die volle
// Breite. Jede Ebene rendert nur, wenn sie tatsaechlich Inhalt hat -- keine
// leeren Spalten/Flaechen. "Vernetzt"/Social-Links entfallen hier
// vollstaendig, da sie bereits einmalig im Anfrage-Bereich erscheinen
// (BandContactSection.tsx) -- keine Dopplung. Bandart/Herkunft/Besetzung
// sind nach "01" umgezogen (siehe BandDescription.tsx).
export function BandTagsSection({ band }: Props) {
  const hasEventTypes = band.eventTypes.length > 0;
  const hasReferenceEvents = band.referenceEvents.length > 0;
  const hasDocuments = band.documents.length > 0;
  const hasWedding = !!band.weddingInfo?.weddingDescription
    || band.weddingInfo?.kidnappingBride != null
    || band.weddingInfo?.moderation != null
    || !!band.weddingInfo?.possiblePlaytimes;

  const hasMidTier = hasReferenceEvents || hasWedding;
  const midTierIsSplit = hasReferenceEvents && hasWedding;

  const tiers = [hasEventTypes, hasMidTier, hasDocuments];
  const firstTierIndex = tiers.findIndex(Boolean);

  if (firstTierIndex === -1) return null;

  return (
    <section id="anlass" className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6 scroll-mt-nav">
      <div className="pl-container-shell">
        <BandChapterHeading number="03" title="Die Band für euer Event?" />

        <div className="flex flex-col gap-10 md:gap-12">
          {hasEventTypes && (
            <div>
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                Spielt bei
              </p>
              <div className="flex flex-wrap gap-2">
                {band.eventTypes.map((et, i) => {
                  const eventTypeSlug = band.categorySlugs?.[i];
                  const category = eventTypeSlug ? findCategoryForEventTypeSlug(eventTypeSlug) : undefined;
                  return category ? (
                    <Link
                      key={et}
                      href={`/veranstaltung/${category.slug}`}
                      className={`${PILL} hover:border-pl-accent hover:text-pl-accent motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent`}
                    >
                      {et}
                    </Link>
                  ) : (
                    <span key={et} className={PILL}>
                      {et}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {hasMidTier && (
            <div
              className={`grid grid-cols-1 gap-8 ${midTierIsSplit ? 'lg:grid-cols-2 lg:gap-14 lg:items-start' : ''} ${
                firstTierIndex === 1 ? '' : 'pt-10 md:pt-12 border-t border-pl-soft'
              }`}
            >
              {hasReferenceEvents && (
                <div className={midTierIsSplit ? '' : 'max-w-xl'}>
                  <BandReferenceEvents band={band} />
                </div>
              )}
              {hasWedding && (
                <div className={midTierIsSplit ? '' : 'max-w-xl'}>
                  <BandWeddingModule band={band} />
                </div>
              )}
            </div>
          )}

          {hasDocuments && (
            <div className={firstTierIndex === 2 ? '' : 'pt-10 md:pt-12 border-t border-pl-soft'}>
              <BandDocumentsSection band={band} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
