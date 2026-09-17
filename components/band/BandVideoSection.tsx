import type { Band } from '@/lib/types/band';
import { VideoPlayer } from './VideoPlayer';
import { BandGallery } from './BandGallery';
import { BandChapterHeading } from './BandChapterHeading';

type Props = {
  band: Band;
  embedUrl: string | null;
};

// "02 Wie klingt die Band live?" -- die eine erlaubte dunkle "emotionale Insel"
// neben dem Hero (siehe design-reference.md, "Max. 2 dunkle Buehnen-
// Content-Sections pro Seite"). Fuehrt Video, "Klingt nach", "Stil &
// Einfluesse" (Auftrag "Bandseiten-Finalisierung": ausschliesslich hier,
// getrennt von "Klingt nach") und die vollstaendige Galerie samt
// Vergroesserungsfunktion (siehe BandGallery.tsx) auf einer Flaeche
// zusammen, statt sie wie zuvor auf mehrere Sections zu verteilen.
//
// Rendert nur, wenn mindestens EIN Baustein tatsaechlich Inhalt hat -- kein
// leeres Kapitel, wenn eine Band weder Video noch Moods noch Stil noch
// Galerie hat.
export function BandVideoSection({ band, embedUrl }: Props) {
  const klingtNach = band.klingtNach;
  const stil = band.musikalischVerortet;
  const hasVideo = embedUrl !== null;
  const hasGallery = band.gallery.length > 0;

  if (!hasVideo && klingtNach.length === 0 && stil.length === 0 && !hasGallery) return null;

  // Vorschaubild fuer den Klick-zum-Laden-Button: bewusst ein bereits
  // vorhandenes lokales Bandbild statt eines YouTube-Vorschaubilds (Auftrag:
  // "vorhandene lokale Medien bevorzugen", keine Drittanbieter-Anfrage vor
  // der Nutzeraktion). thumbnailImage ist eine eigene Medienrolle, keine
  // Kopie eines Galeriebilds -- die Galerie darunter zeigt weiterhin alle
  // vorhandenen Bilder, keine Dopplung.
  const poster = band.thumbnailImage ?? band.heroImage ?? band.gallery[0];

  return (
    <section id="live" className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6 scroll-mt-nav">
      <div className="pl-container-shell">
        <BandChapterHeading number="02" title="Wie klingt die Band live?" variant="dark" />

        <div className={hasVideo ? 'grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-12 items-start' : ''}>
          {hasVideo && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-pl-stage-elevated">
              <VideoPlayer embedUrl={embedUrl} bandName={band.name} poster={poster} />
            </div>
          )}

          {(klingtNach.length > 0 || stil.length > 0) && (
            <div className="flex flex-col gap-6">
              {klingtNach.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-3">
                    Klingt nach
                  </p>
                  <ul className="space-y-2.5">
                    {klingtNach.map((tag) => (
                      <li key={tag} className="flex items-center gap-3 text-sm md:text-base text-pl-on-stage">
                        <span className="w-1 h-4 rounded-full bg-pl-accent-light shrink-0" aria-hidden="true" />
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stil.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-3">
                    Stil &amp; Einflüsse
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stil.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-pl-on-stage"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {hasGallery && (
          <div className="mt-10 pt-10 border-t border-white/10">
            <BandGallery band={band} />
          </div>
        )}
      </div>
    </section>
  );
}
