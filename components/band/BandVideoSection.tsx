import type { Band } from '@/lib/types/band';
import { VideoPlayer } from './VideoPlayer';
import { BandGallery } from './BandGallery';
import { BandChapterHeading } from './BandChapterHeading';

type Props = {
  band: Band;
  embedUrl: string | null;
};

// "Wie klingt die Band live?" -- die eine erlaubte dunkle "emotionale Insel"
// neben dem Hero (siehe design-reference.md, "Max. 2 dunkle Buehnen-
// Content-Sections pro Seite"). Fuehrt nur noch Video-Tile und die
// vollstaendige Galerie samt Vergroesserungsfunktion (siehe BandGallery.tsx)
// auf einer Flaeche zusammen. "Klingt nach" steht in BandDescription.tsx,
// "Stil & Einfluesse" im Zeilenraster (BandTagsSection.tsx).
//
// Rendert nur, wenn Video oder Galerie vorhanden sind -- keine leere Insel.
// Ohne Video steht die Galerie direkt unter der Ueberschrift (keine
// Trennlinie ueber ihr).
export function BandVideoSection({ band, embedUrl }: Props) {
  const hasVideo = embedUrl !== null;
  const hasGallery = band.gallery.length > 0;

  if (!hasVideo && !hasGallery) return null;

  // Vorschaubild fuer den Klick-zum-Laden-Button: bewusst ein bereits
  // vorhandenes lokales Bandbild statt eines YouTube-Vorschaubilds (Auftrag:
  // "vorhandene lokale Medien bevorzugen", keine Drittanbieter-Anfrage vor
  // der Nutzeraktion). thumbnailImage ist eine eigene Medienrolle, keine
  // Kopie eines Galeriebilds -- die Galerie darunter zeigt weiterhin alle
  // vorhandenen Bilder, keine Dopplung.
  const poster = band.thumbnailImage ?? band.heroImage ?? band.gallery[0];

  return (
    <section id="live" className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6 scroll-mt-nav md:scroll-mt-[calc(var(--pl-nav-height)+5rem)]">
      <div className="pl-container-shell">
        <BandChapterHeading title="Wie klingt die Band live?" variant="dark" />

        {hasVideo && (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-pl-stage-elevated">
            <VideoPlayer bandName={band.name} poster={poster} />
          </div>
        )}

        {hasGallery && (
          <div className={hasVideo ? 'mt-10 pt-10 border-t border-white/10' : ''}>
            <BandGallery band={band} />
          </div>
        )}
      </div>
    </section>
  );
}
