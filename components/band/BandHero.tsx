import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import { formatLocation } from '@/lib/utils/formatLocation';
import { resolveHeroImagePresentation, resolveMobileHeroImage } from '@/lib/bands/heroImagePresentation';
import { HeroCTA } from './HeroCTA';

type Props = { band: Band; hasVideo: boolean };

// Vollflaechiger Bild-Hero (Auftrag "Bandseiten-Redesign", Abschnitt 5):
// grosses Bandbild ueber die gesamte Breite, kraeftiger Bandname unten,
// Kategorie/Standort klar untergeordnet, Logo ruhig oben im Bild unterhalb
// der schwebenden Navigation (Abschnitt 6), Aktionen bereits im Einstieg
// erreichbar (HeroCTA, direkt eingebettet statt eines eigenen Balkens).
export function BandHero({ band, hasVideo }: Props) {
  const locationText = formatLocation(band.location);
  const metaLine = [band.category, locationText].filter(Boolean).join(' · ');
  const memberInfo = band.weddingInfo?.bandSize;
  const subtitle = [band.shortDescription, memberInfo].filter(Boolean).join(' · ');

  const presentation = resolveHeroImagePresentation(band.slug);
  const mobileImage = resolveMobileHeroImage(band);
  // Nur wenn tatsaechlich ein abweichendes mobiles Motiv konfiguriert UND
  // gefunden wurde, werden zwei <Image>-Varianten gerendert (siehe
  // lib/bands/heroImagePresentation.ts) -- der Standardfall (kein Eintrag,
  // die weit ueberwiegende Mehrheit der Baender) bleibt bei einem einzigen
  // priorisierten Bild wie zuvor, ohne Performance-Nachteil.
  const hasDistinctMobileImage = !!mobileImage && mobileImage.url !== band.heroImage?.url;

  const desktopImageStyle = presentation.desktopObjectPosition
    ? { objectPosition: presentation.desktopObjectPosition }
    : undefined;

  return (
    <div className="relative w-full min-h-[80vh] md:min-h-[82vh] lg:min-h-[86vh] bg-pl-stage overflow-hidden">
      {hasDistinctMobileImage ? (
        <>
          <Image
            src={mobileImage!.url}
            alt={mobileImage!.alt}
            fill
            priority
            className="object-cover object-center md:hidden"
            sizes="100vw"
          />
          {band.heroImage && (
            <Image
              src={band.heroImage.url}
              alt={band.heroImage.alt}
              fill
              className="hidden md:block object-cover"
              style={desktopImageStyle}
              sizes="100vw"
            />
          )}
        </>
      ) : (
        band.heroImage && (
          <Image
            src={band.heroImage.url}
            alt={band.heroImage.alt}
            fill
            priority
            className="object-cover object-center"
            style={desktopImageStyle}
            sizes="100vw"
          />
        )
      )}

      {/* Gradient overlay: dunkelt von unten, lässt oben transparent */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(18,16,26,0.93) 0%, rgba(18,16,26,0.5) 42%, rgba(18,16,26,0.12) 70%, transparent 100%)',
        }}
      />

      {/* Logo -- ruhig oben im Bild, unterhalb der schwebenden Navigation,
          rechtsbuendig (Auftrag Abschnitt 6). Layout funktioniert ohne Logo
          unveraendert -- rein bedingtes Rendering. */}
      {band.logo && (
        <div className="absolute inset-x-0 top-0 z-[5] px-4 sm:px-6 pt-[calc(var(--pl-nav-height)+8px)]">
          <div className="pl-container-shell flex justify-end">
            <div className="relative w-28 h-10 sm:w-32 sm:h-11 md:w-36 md:h-12">
              <Image
                src={band.logo.url}
                alt={band.logo.alt}
                fill
                className="object-contain object-right"
                sizes="144px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content – bündig unten links */}
      <div className="relative z-10 flex items-end h-full min-h-[80vh] md:min-h-[82vh] lg:min-h-[86vh]">
        <div className="w-full pl-container-shell px-4 sm:px-6 pb-8 md:pb-12">
          {metaLine && (
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-pl-on-stage-muted mb-3">
              {metaLine}
            </p>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-pl-on-stage leading-[1.03] mb-3">
            {band.name}
          </h1>

          {subtitle && (
            <p className="text-base md:text-lg italic text-pl-on-stage-muted max-w-2xl mb-6 leading-relaxed">
              {subtitle}
            </p>
          )}

          <HeroCTA
            name={band.name}
            slug={band.slug}
            anfrageEventTypes={band.anfrageEventTypes ?? []}
            hasVideo={hasVideo}
          />
        </div>
      </div>
    </div>
  );
}
