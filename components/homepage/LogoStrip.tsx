import Image from 'next/image';
import Link from 'next/link';
import { bandLogos } from '@/lib/homepage/bandLogos';

// Visuelle Bruecke zwischen Hero (dunkel) und "Livebands entdecken"
// (helle AuswahlSection direkt darunter): keine eigenstaendige Section mit
// grosser Ueberschrift, sondern ein kleiner, ruhiger Zweizeiler direkt ueber
// der abgerundeten, dunklen Logo-Card -- Text und Card gehoeren optisch
// zusammen (knappes mb, gleiche Card auf demselben hellen Grund wie der
// folgende Contentbereich, bg-pl-paper, identisch zu AuswahlSection).
// Bewusst keine erklaerende Marketing-Subline ("Ein kleiner Ausschnitt aus
// dem proudleut-Kosmos." kommt nicht zurueck) und keine grossen vertikalen
// Abstaende -- kein eigener Seitenabschnitt.
export default function LogoStrip() {
  return (
    <section className="bg-pl-paper pt-6 pb-6 md:pt-8 md:pb-8 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className="text-center mb-4 md:mb-5">
          <p className="text-sm md:text-base font-semibold text-pl-text">
            Bands mit eigener Handschrift
          </p>
          <p className="text-xs md:text-sm text-pl-text-muted mt-0.5">
            Nicht nur musikalisch.
          </p>
        </div>
        <div className="bg-pl-stage rounded-2xl md:rounded-[28px] px-6 py-7 md:px-10 md:py-9">
          <div className="flex items-center justify-center gap-x-8 gap-y-5 md:gap-x-10 flex-wrap">
            {bandLogos.map((logo) => (
              <Link
                key={logo.name}
                href={logo.href}
                aria-label={logo.name}
                className="opacity-80 hover:opacity-100 motion-safe:transition-opacity"
              >
                <Image
                  src={logo.src}
                  alt={`${logo.name} Logo`}
                  width={160}
                  height={48}
                  className={`max-h-9 md:max-h-11 w-auto object-contain ${logo.className ?? 'max-w-32 md:max-w-40'}`}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
