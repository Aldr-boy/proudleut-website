import type { Band } from '@/lib/types/band';
import { BandRow } from './BandRow';
import { VideoPlayer } from './VideoPlayer';

type Props = {
  band: Band;
};

// Zeile "Live" im Zeilenraster (BandTagsSection.tsx): ersetzt die frueheren
// dunkle Insel "Wie klingt die Band live?". Das Poster-Tile (VideoPlayer) ist
// unveraendert -- Optik, Play-Overlay, lokales Bandbild (nie ein YouTube-
// Vorschaubild) und Trigger fuers Video-Modal (VideoModalProvider, genau EIN
// <dialog>, siehe page.tsx); der Fokus kehrt wie bisher zum Ausloeser zurueck.
// Das Tile ist hoechstens 640 px breit (16:9, 640 x 360), linksbuendig, mobil
// volle Breite. Die Zeile traegt die Anker-Id "live" (Link /band/<slug>#live
// aus /fuer-bands) samt scroll-margin unter der Faktenleiste. Das Label ist
// eine <h2> mit unsichtbarem Zusatz fuer Screenreader. Wird nur gerendert,
// wenn die Band ein Video hat (hasVideo in BandTagsSection).
export function BandVideoRow({ band }: Props) {
  // Vorschaubild fuer den Klick-zum-Laden-Button: bewusst ein bereits
  // vorhandenes lokales Bandbild statt eines YouTube-Vorschaubilds (keine
  // Drittanbieter-Anfrage vor der Nutzeraktion).
  const poster = band.thumbnailImage ?? band.heroImage ?? band.gallery[0];

  return (
    <BandRow id="live" label="Live" labelAs="h2" labelSrSuffix={`– Video von ${band.name}`}>
      <div className="relative w-full max-w-[640px] aspect-video rounded-xl overflow-hidden bg-pl-stage-elevated">
        <VideoPlayer bandName={band.name} poster={poster} />
      </div>
    </BandRow>
  );
}
