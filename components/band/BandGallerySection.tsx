import type { Band } from '@/lib/types/band';
import { BandGallery } from './BandGallery';

type Props = {
  band: Band;
};

// "Ein Eindruck von der Buehne" (Prototyp E): eigene helle Section nach
// "Mehr von [Band]" und vor der CTA-Karte, bg-pl-canvas wie Zeilenraster und
// "Mehr von". Ohne Galerie entfaellt die Section komplett (kein Platzhalter,
// keine Luecke). Der Abstand nach oben kommt vom unteren Abstand der
// vorhergehenden Section.
export function BandGallerySection({ band }: Props) {
  if (band.gallery.length === 0) return null;

  return (
    <section className="bg-pl-canvas px-4 sm:px-6 pb-16 md:pb-20">
      <div className="pl-container-shell">
        <BandGallery band={band} />
      </div>
    </section>
  );
}
