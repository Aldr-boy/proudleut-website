import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import type { BandFact } from '@/lib/bands/bandFacts';
import { formatLocation } from '@/lib/utils/formatLocation';
import { resolveHeroImagePresentation, resolveMobileHeroImage } from '@/lib/bands/heroImagePresentation';
import { HeroCTA } from './HeroCTA';
import { HeroVideoPill } from './HeroVideoPill';

type Props = { band: Band; hasVideo: boolean; facts: BandFact[] };

// Steckbrief (Herkunft, Besetzung, Stil) als normale Liste im Seitenfluss
// unter dem Hero -- nur mobil; ab md uebernimmt die Faktenleiste
// (BandFloatingCta). Statisch, unabhaengig vom Scrollzustand.
function MobileFactsList({ facts }: { facts: BandFact[] }) {
  if (facts.length === 0) return null;
  return (
    <dl className="md:hidden bg-pl-canvas px-5 pt-4 pb-2">
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
                <HeroVideoPill tone="light" />
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
  // Nur wenn tatsaechlich ein abweichendes mobiles Motiv konfiguriert UND
  // gefunden wurde, werden zwei <Image>-Varianten gerendert (siehe
  // lib/bands/heroImagePresentation.ts) -- der Standardfall (kein Eintrag,
  // die weit ueberwiegende Mehrheit der Baender) bleibt bei einem einzigen
  // priorisierten Bild, ohne Performance-Nachteil.
  const hasDistinctMobileImage = !!mobileImage && mobileImage.url !== heroImage.url;

  const desktopImageStyle = presentation.desktopObjectPosition
    ? { objectPosition: presentation.desktopObjectPosition }
    : undefined;
  const mobileImageStyle = presentation.mobileObjectPosition
    ? { objectPosition: presentation.mobileObjectPosition }
    : undefined;
  // Dasselbe Bild auf beiden Breakpoint-Gruppen, nur der Bildausschnitt
  // unterscheidet sich -- object-position wird ueber CSS-Variablen je
  // Breakpoint umgeschaltet statt ueber ein zweites Bildelement.
  const objectPositionVars = presentation.desktopObjectPosition || presentation.mobileObjectPosition
    ? ({
        '--hero-pos-mobile': presentation.mobileObjectPosition ?? presentation.desktopObjectPosition ?? 'center',
        '--hero-pos-desktop': presentation.desktopObjectPosition ?? 'center',
      } as React.CSSProperties)
    : undefined;

  return (
    <>
      {/* Mobil (unter md): .pl-hero-scene (app/globals.css) = min-height 100svh
          mit 100vh-Fallback, der Hero waechst mit dem Inhalt. Ab md feste Hoehe
          100svh, begrenzt auf 560-900 px; beide Divs (dieses und der
          Content-Block) tragen die Klasse, weil der Content-Block als einziges
          Flow-Kind die gerenderte Hoehe bestimmt. */}
      <div className="pl-hero-scene relative w-full md:h-[100svh] md:min-h-[560px] md:max-h-[900px] bg-pl-stage overflow-hidden">
        {hasDistinctMobileImage ? (
          <>
            <Image
              src={mobileImage!.url}
              alt={mobileImage!.alt}
              fill
              priority
              className="object-cover object-center md:hidden"
              style={mobileImageStyle}
              sizes="100vw"
            />
            <Image
              src={heroImage.url}
              alt={heroImage.alt}
              fill
              className="hidden md:block object-cover"
              style={desktopImageStyle}
              sizes="100vw"
            />
          </>
        ) : (
          <Image
            src={heroImage.url}
            alt={heroImage.alt}
            fill
            priority
            className={
              objectPositionVars
                ? 'object-cover object-[var(--hero-pos-mobile)] md:object-[var(--hero-pos-desktop)]'
                : 'object-cover object-center'
            }
            style={objectPositionVars}
            sizes="100vw"
          />
        )}

        {/* Gradient overlay: dunkelt von unten (und links, fuer den Text), lässt oben transparent */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(18,16,26,0.94) 0%, rgba(18,16,26,0.6) 28%, rgba(18,16,26,0.12) 62%, transparent 100%), linear-gradient(to right, rgba(18,16,26,0.45) 0%, transparent 50%)',
          }}
        />

        {/* Content – bündig unten */}
        <div className="pl-hero-scene relative z-10 flex items-end h-full">
          <div className="w-full pl-container-shell px-4 sm:px-6 pb-8 md:pb-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 md:gap-10">
              <div className="min-w-0">
                {/* Logo -- klein, direkt ueber dem Bandnamen verankert (Hero-
                    Variante "Name fuehrt"); Groesse bewusst generisch, object-
                    contain leitet die Bildform aus der Datei ab, siehe
                    bandHeroLogoAspectRatio.test.ts. Rein bedingtes Rendering. */}
                {band.logo && (
                  <div className="relative w-32 h-10 sm:w-40 sm:h-12 md:w-48 md:h-14 mb-3">
                    <Image
                      src={band.logo.url}
                      alt={band.logo.alt}
                      fill
                      className="object-contain object-left"
                      sizes="192px"
                    />
                  </div>
                )}

                {metaLine && (
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.08em] text-pl-accent-light mb-3">
                    {metaLine}
                  </p>
                )}

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-pl-on-stage leading-[1.02] mb-3">
                  {band.name}
                </h1>

                {subtitle && (
                  <p className="text-lg md:text-2xl text-pl-on-stage/90 font-medium max-w-2xl mb-5 md:mb-6 leading-snug">
                    {subtitle}
                  </p>
                )}

                {/* Handy: Pille unter dem Claim, ueber dem Anfrage-Button */}
                {hasVideo && (
                  <div className="md:hidden mb-4">
                    <HeroVideoPill tone="image" />
                  </div>
                )}

                <HeroCTA
                  name={band.name}
                  slug={band.slug}
                  anfrageEventTypes={band.anfrageEventTypes ?? []}
                />
              </div>

              {/* Desktop: Pille unten rechts im Bild */}
              {hasVideo && (
                <div className="hidden md:block shrink-0">
                  <HeroVideoPill tone="image" />
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
