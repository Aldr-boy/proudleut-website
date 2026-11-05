import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import type { BandFact } from '@/lib/bands/bandFacts';
import { formatLocation } from '@/lib/utils/formatLocation';
import { resolveHeroImagePresentation, resolveMobileHeroImage } from '@/lib/bands/heroImagePresentation';
import { BandHeroGallery } from './BandHeroGallery';
import { absoluteUrl } from '@/lib/seo/metadata';
import { BandShareButton } from './BandShareButton';
import { HeroCTA } from './HeroCTA';
import { HeroVideoPill } from './HeroVideoPill';

type Props = { band: Band; hasVideo: boolean; facts: BandFact[] };

// Steckbrief (Herkunft, Besetzung, Stil) als normale Liste im Seitenfluss
// unter dem Hero -- bis 1023 px; ab lg uebernimmt die Faktenleiste
// (BandFloatingCta). Ab md auf 640 px begrenzt und linksbuendig an der Kante
// des Textes darueber (px-6). Statisch, unabhaengig vom Scrollzustand.
function MobileFactsList({ facts }: { facts: BandFact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="lg:hidden md:max-w-[640px] bg-pl-canvas px-5 md:px-6 pt-4 pb-2">
      {facts.map((f) => (
        <div key={f.label} className="flex justify-between gap-4 py-[13px] border-b border-pl-soft text-[15px]">
          <dt className="text-pl-text-muted">{f.label}</dt>
          <dd className="font-bold text-pl-text text-right">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Vollflaechiger Bild-Hero (Variante E): Kicker (Genre · Ort), Bandname als
// einzige H1, Claim, Anfrage-Button mit Merken-Herz im Bild. Die Video-Pille
// oeffnet das Video-Modal (VideoModalProvider): Desktop unten rechts im Bild,
// Handy unter dem Claim ueber dem Anfrage-Button. Hoehe 100svh, Desktop mit
// Unter-/Obergrenze, damit Querformatbilder nicht zu stark hochgezogen werden.
// Ohne Bandbild: kurzer Kopf statt Vollbild-Hero, ohne Anfrage-Button (die
// Leiste ist dann von Anfang an sichtbar und traegt den einzigen Button).
export function BandHero({ band, hasVideo, facts }: Props) {
  const locationText = formatLocation(band.location);
  const metaLine = [band.category, locationText].filter(Boolean).join(' · ');
  // shortDescriptionExplicit statt shortDescription (Auftrag "Kein Slogan
  // -> kein Text im Hero"): OHNE den main_text-Kuerzungs-Fallback, siehe
  // lib/supabase/normalizeBand.ts. Fehlt er, faellt die Textzeile komplett
  // weg. Die Besetzung steht nicht mehr hier, sondern in den Fakten
  // (lib/bands/bandFacts.ts).
  const subtitle = band.shortDescriptionExplicit;

  if (!band.heroImage) {
    return (
      <>
        <div className="bg-pl-canvas pt-[calc(var(--pl-nav-height)+1.5rem)] pb-6 md:pb-8 px-4 sm:px-6">
          <div className="pl-container-shell">
            {metaLine && (
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-pl-accent-deep mb-3">
                {metaLine}
              </p>
            )}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-pl-text leading-[1.03] mb-3">
              {band.name}
            </h1>
            {subtitle && (
              <p className="text-base md:text-lg text-pl-text-muted max-w-2xl leading-relaxed">{subtitle}</p>
            )}
            {hasVideo && (
              <div className="mt-5">
                <HeroVideoPill tone="light" bandName={band.name} />
              </div>
            )}
          </div>
        </div>
        <MobileFactsList facts={facts} />
      </>
    );
  }

  const heroImage = band.heroImage;
  const presentation = resolveHeroImagePresentation(band.slug);
  const mobileImage = resolveMobileHeroImage(band);

  // Handy: Galerie im Header (BandHeroGallery). Erste Folie = Hauptbild (bei
  // konfiguriertem mobilen Motiv dieses), danach die Buehnenfotos in ihrer
  // Reihenfolge; ein Bild, das schon als Hauptbild steht, kommt nicht doppelt.
  const firstSlide = mobileImage ?? heroImage;
  const slides = [
    firstSlide,
    ...band.gallery.filter((g) => g.url !== firstSlide.url && g.url !== heroImage.url),
  ];

  const desktopImageStyle = presentation.desktopObjectPosition
    ? { objectPosition: presentation.desktopObjectPosition }
    : undefined;

  return (
    <>
      {/* Handy (unter md): Galerie ganz oben, laeuft hinter der Navigation; die
          Aubergine-Flaeche mit runden Ecken liegt direkt auf dem Bild
          (ueberlappt dessen untersten Rand); Genre · Ort, Name und Hashtag
          stehen zentriert darauf, kein Text auf dem Foto. Anfrage-Button und
          Herz stehen nur in der festen Leiste (BandFloatingCta). Ab md wie
          bisher: feste Hoehe 100svh, begrenzt auf 560-900 px, Foto als
          Vollbild mit Verlauf und Text darueber. */}
      <div className="relative w-full bg-pl-text md:bg-pl-stage md:h-[100svh] md:min-h-[560px] md:max-h-[900px] overflow-hidden">
        <BandHeroGallery images={slides} />

        <div className="hidden md:block absolute inset-0">
          <Image
            src={heroImage.url}
            alt={heroImage.alt}
            width={heroImage.width ?? 1600}
            height={heroImage.height ?? 1067}
            priority
            className="block w-full h-full object-cover"
            style={desktopImageStyle}
            sizes="100vw"
          />

          {/* Gradient overlay: dunkelt von unten (und links, fuer den Text), lässt oben transparent */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(18,16,26,0.94) 0%, rgba(18,16,26,0.6) 28%, rgba(18,16,26,0.12) 62%, transparent 100%), linear-gradient(to right, rgba(18,16,26,0.45) 0%, transparent 50%)',
            }}
          />
        </div>

        {/* Content – Handy: aubergine Flaeche mit runden Ecken, ueberlappt den Bildrand,
            28 px, zentriert; ab md bündig unten im Bild */}
        <div className="relative z-10 max-md:-mt-7 max-md:rounded-t-[28px] max-md:bg-pl-text md:flex md:items-end md:h-full">
          <BandShareButton name={band.name} tagline={subtitle} url={absoluteUrl(`/band/${band.slug}`)} />
          <div className="w-full pl-container-shell px-6 pt-[38px] pb-[34px] md:pt-0 md:pb-14">
            <div className="flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left gap-6 md:gap-10">
              <div className="min-w-0 flex flex-col items-center gap-3 md:block">
                {/* Logo -- klein, direkt ueber dem Bandnamen verankert (Hero-
                    Variante "Name fuehrt"); Groesse bewusst generisch, object-
                    contain leitet die Bildform aus der Datei ab, siehe
                    bandHeroLogoAspectRatio.test.ts. Rein bedingtes Rendering. */}
                {band.logo && (
                  <div className="hidden md:block">
                  <div className="relative w-32 h-10 sm:w-40 sm:h-12 md:w-48 md:h-14 mb-3">
                    <Image
                      src={band.logo.url}
                      alt={band.logo.alt}
                      fill
                      className="object-contain object-left"
                      sizes="192px"
                    />
                  </div>
                  </div>
                )}

                {metaLine && (
                  <p className="text-[12.5px] md:text-sm leading-[1.55] md:leading-normal font-bold uppercase tracking-[0.14em] md:tracking-[0.08em] text-pl-accent-light max-w-[330px] md:max-w-none text-balance md:text-wrap mb-0 md:mb-3">
                    {metaLine}
                  </p>
                )}

                <h1 className="text-[46px] md:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-pl-on-stage leading-[1.02] text-balance md:text-wrap mb-0 md:mb-3">
                  {band.name}
                </h1>

                {subtitle && (
                  <p className="text-lg md:text-2xl text-pl-on-stage/90 font-normal md:font-medium max-w-[320px] md:max-w-2xl text-balance md:text-wrap mb-0 md:mb-6 leading-[1.38] md:leading-snug">
                    {subtitle}
                  </p>
                )}

                {/* Handy: Pille unter dem Hashtag */}
                {hasVideo && (
                  <div className="md:hidden mt-3">
                    <HeroVideoPill tone="light" bandName={band.name} />
                  </div>
                )}

                {/* Handy ausgeblendet: dort uebernimmt die feste Leiste
                    (BandFloatingCta); ein nicht darstellbarer Hero-Button
                    gilt dort als "passiert", die Leiste ist von Anfang an da. */}
                <div className="hidden md:block">
                  <HeroCTA
                    name={band.name}
                    slug={band.slug}
                    anfrageEventTypes={band.anfrageEventTypes ?? []}
                  />
                </div>
              </div>

              {/* Desktop: Pille unten rechts im Bild */}
              {hasVideo && (
                <div className="hidden md:block shrink-0">
                  <HeroVideoPill tone="image" bandName={band.name} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileFactsList facts={facts} />
    </>
  );
}
