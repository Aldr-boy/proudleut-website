import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import { VideoPlayer } from './VideoPlayer';

type Props = {
  band: Band;
  embedUrl: string | null;
};

// "02 Wie klingt sie live?" -- die eine erlaubte dunkle "emotionale Insel"
// neben dem Hero (siehe design-reference.md, "Max. 2 dunkle Buehnen-
// Content-Sections pro Seite"). Fuehrt Video, "Klingt nach" und ein paar
// Buehnenbilder bewusst auf einer Flaeche zusammen (Auftrag Abschnitt 8),
// statt sie wie zuvor auf drei getrennte helle Sections zu verteilen.
//
// Rendert nur, wenn mindestens EIN Baustein tatsaechlich Inhalt hat -- kein
// leeres Kapitel, wenn eine Band weder Video noch Moods noch Galerie hat.
export function BandVideoSection({ band, embedUrl }: Props) {
  const klingtNach = band.klingtNach;
  const liveImages = band.gallery.slice(0, 3);
  const hasVideo = embedUrl !== null;

  if (!hasVideo && klingtNach.length === 0 && liveImages.length === 0) return null;

  // Vorschaubild fuer den Klick-zum-Laden-Button: bewusst ein bereits
  // vorhandenes lokales Bandbild statt eines YouTube-Vorschaubilds (Auftrag:
  // "vorhandene lokale Medien bevorzugen", keine Drittanbieter-Anfrage vor
  // der Nutzeraktion).
  const poster = band.thumbnailImage ?? band.heroImage ?? band.gallery[0];

  return (
    <section id="live" className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6 scroll-mt-nav">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-2">
          02
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-on-stage mb-8">
          Wie klingt sie live?
        </h2>

        <div className={hasVideo ? 'grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 md:gap-12 items-start' : ''}>
          {hasVideo && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-pl-stage-elevated">
              <VideoPlayer embedUrl={embedUrl} bandName={band.name} poster={poster} />
            </div>
          )}

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
              <p className="mt-5 text-xs text-pl-on-stage-muted">
                Der beste Eindruck kommt von der Bühne.
              </p>
            </div>
          )}
        </div>

        {liveImages.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-3 md:gap-4">
            {liveImages.map((img, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 33vw, 33vw"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
