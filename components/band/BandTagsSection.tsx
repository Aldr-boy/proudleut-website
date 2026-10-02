import type { Band } from '@/lib/types/band';
import { hasWeddingContent } from '@/lib/bands/bandWeddingContent';
import { BandEventTypesPills } from './BandEventTypesPills';
import { BandReferenceEvents } from './BandReferenceEvents';
import { BandDocumentsSection } from './BandDocumentsSection';
import { BandWeddingModule } from './BandWeddingModule';
import { BandRow } from './BandRow';
import { BandVideoRow } from './BandVideoRow';

type Props = {
  band: Band;
  // Die Band hat ein gueltiges Video: erste Zeile "Live" mit dem Poster-Tile.
  hasVideo: boolean;
};

// Zeilenraster (Prototyp E): Label links, Inhalt rechts, in dieser
// Reihenfolge -- Live (Video-Tile, nur mit Video), Stil & Einfluesse, Spielt
// bei, Hochzeit, Referenz-Events, Unterlagen fuer Veranstalter. Die Section
// entfaellt nicht, wenn nur das Video da ist (hasVideo zaehlt mit). Jede Zeile rendert nur, wenn sie
// tatsaechlich Inhalt hat (kein Platzhalter); die erste sichtbare Zeile hat
// keine Linie darueber (siehe BandRow.tsx). Ohne Ueberschrift und ohne
// Kapitelnummer. "Vernetzt"/Social-Links stehen in "Mehr von [Band]"
// (BandContactSection.tsx).
export function BandTagsSection({ band, hasVideo }: Props) {
  const stil = band.musikalischVerortet;
  const hasStil = stil.length > 0;
  const hasEventTypes = band.eventTypes.length > 0;
  const hasReferenceEvents = band.referenceEvents.length > 0;
  const hasDocuments = band.documents.length > 0;
  // BandWeddingModule rendert nur mit "Hochzeit" unter den Event-Types
  // (hasWeddingContent); die Zeile darf nur erscheinen, wenn auch Inhalt da ist.
  const hasWedding = hasWeddingContent(band) && (
    !!band.weddingInfo?.weddingDescription
    || band.weddingInfo?.kidnappingBride != null
    || band.weddingInfo?.moderation != null
    || !!band.weddingInfo?.possiblePlaytimes
  );

  if (!hasVideo && !hasStil && !hasEventTypes && !hasWedding && !hasReferenceEvents && !hasDocuments) return null;

  return (
    <section id="anlass" className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6 scroll-mt-nav">
      <div className="pl-container-shell">
        <div>
          {hasVideo && <BandVideoRow band={band} />}

          {hasStil && (
            <BandRow label="Stil & Einflüsse" pillAligned>
              <div className="flex flex-wrap gap-2">
                {stil.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center h-[38px] px-[18px] rounded-full bg-pl-stage text-pl-on-stage text-sm font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </BandRow>
          )}

          {hasEventTypes && (
            <BandRow label="Spielt bei" pillAligned>
              <BandEventTypesPills
                eventTypes={band.eventTypes}
                categorySlugs={band.categorySlugs}
                variant="light"
                collapseOnMobile={6}
              />
            </BandRow>
          )}

          {hasWedding && <BandWeddingModule band={band} />}
          {hasReferenceEvents && <BandReferenceEvents band={band} />}
          {hasDocuments && <BandDocumentsSection band={band} />}
        </div>
      </div>
    </section>
  );
}
