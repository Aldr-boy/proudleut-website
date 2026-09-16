import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import { findCategoryForEventTypeSlug } from './bandTagsCategoryMatch';
import { BandReferenceEvents } from './BandReferenceEvents';
import { BandDocumentsSection } from './BandDocumentsSection';
import { BandWeddingModule } from './BandWeddingModule';

type Props = {
  band: Band;
};

const PILL =
  'inline-flex items-center rounded-full border border-pl-soft bg-white px-4 py-2 text-sm font-semibold text-pl-text';

// "03 Die Band für euer Event?" (Auftrag "Bandseiten-Finalisierung",
// verbindliches Wording): zusammenhaengender Abschnitt statt vier
// nebeneinander gestapelter Alt-Sections -- linke Spalte "Spielt bei" +
// Referenz-Events, rechte Spalte Festwirte-Unterlagen- und
// Hochzeitskarte (finaler Entwurf, sec-anlass). "Vernetzt"/Social-Links
// entfallen hier vollstaendig, da sie bereits einmalig im Anfrage-Bereich
// erscheinen (BandContactSection.tsx) -- keine Dopplung. Bandart/
// Herkunft/Besetzung sind nach "01" umgezogen (siehe BandDescription.tsx).
export function BandTagsSection({ band }: Props) {
  const hasEventTypes = band.eventTypes.length > 0;
  const hasReferenceEvents = band.referenceEvents.length > 0;
  const hasDocuments = band.documents.length > 0;
  const hasWedding = !!band.weddingInfo?.weddingDescription
    || band.weddingInfo?.kidnappingBride != null
    || band.weddingInfo?.moderation != null
    || !!band.weddingInfo?.possiblePlaytimes;

  const hasLeftColumn = hasEventTypes || hasReferenceEvents;
  const hasRightColumn = hasDocuments || hasWedding;

  if (!hasLeftColumn && !hasRightColumn) return null;

  return (
    <section id="anlass" className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6 scroll-mt-nav">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">03</p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-8">
          Die Band für euer Event?
        </h2>

        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {hasLeftColumn && (
            <div className="flex-[1.5] min-w-0 space-y-6">
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

              {hasReferenceEvents && <BandReferenceEvents band={band} />}
            </div>
          )}

          {hasRightColumn && (
            <div className="flex-1 min-w-0 flex flex-col gap-4 lg:self-start">
              {hasDocuments && <BandDocumentsSection band={band} />}
              {hasWedding && <BandWeddingModule band={band} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
