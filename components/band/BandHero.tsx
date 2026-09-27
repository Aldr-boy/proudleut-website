import Image from 'next/image';
import type { Band } from '@/lib/types/band';
import { formatLocation } from '@/lib/utils/formatLocation';
import { resolveHeroImagePresentation, resolveMobileHeroImage } from '@/lib/bands/heroImagePresentation';
import { HeroCTA } from './HeroCTA';

type Props = { band: Band; hasVideo: boolean };

// Vollflaechiger Bild-Hero (Auftrag "Bandseiten-Redesign"/"Bandseiten-
// Finalisierung"): grosses Bandbild ueber die gesamte Breite, Logo klein
// direkt ueber dem Bandnamen (Hero-Variante "Name fuehrt", siehe
// Logo-Kommentar unten), kraeftiger Bandname bleibt die einzige H1,
// Kategorie/Standort als Kicker darueber, Aktionen bereits im Einstieg
// erreichbar (HeroCTA, direkt eingebettet statt eines eigenen Balkens).
export function BandHero({ band, hasVideo }: Props) {
  const locationText = formatLocation(band.location);
  const metaLine = [band.category, locationText].filter(Boolean).join(' · ');
  const memberInfo = band.weddingInfo?.bandSize;
  // shortDescriptionExplicit statt shortDescription (Auftrag "Kein Slogan
  // -> kein Text im Hero"): OHNE den main_text-Kuerzungs-Fallback, siehe
  // lib/supabase/normalizeBand.ts. Fehlt er, faellt die Textzeile bei
  // Baendern ohne Besetzung komplett weg (leerer String, siehe
  // {subtitle && (...)} unten); bei Baendern MIT Besetzung bleibt nur
  // "<Besetzung>" stehen -- .filter(Boolean) verhindert dabei in jedem
  // Fall ein verwaistes " · " am Anfang.
  const subtitle = [band.shortDescriptionExplicit, memberInfo].filter(Boolean).join(' · ');

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
  const mobileImageStyle = presentation.mobileObjectPosition
    ? { objectPosition: presentation.mobileObjectPosition }
    : undefined;
  // Dasselbe Bild auf beiden Breakpoint-Gruppen, nur der Bildausschnitt
  // unterscheidet sich (Auftrag "Bandseiten-Finalisierung", heroPosDesk/
  // heroPosMob im finalen Entwurf) -- ein einzelnes <Image> reicht dafuer
  // aus (siehe lib/bands/heroImagePresentation.ts), object-position wird
  // ueber CSS-Variablen je Breakpoint umgeschaltet statt ueber ein zweites
  // Bildelement.
  const objectPositionVars = presentation.desktopObjectPosition || presentation.mobileObjectPosition
    ? ({
        '--hero-pos-mobile': presentation.mobileObjectPosition ?? presentation.desktopObjectPosition ?? 'center',
        '--hero-pos-desktop': presentation.desktopObjectPosition ?? 'center',
      } as React.CSSProperties)
    : undefined;

  return (
    // Unter md (Mobile) uebernimmt die bestehende .pl-hero-scene-Klasse
    // (app/globals.css, urspruenglich fuer den Startseiten-Hero/PR #115)
    // die Mindesthoehe: min-height 100svh mit 100vh-Fallback, damit die
    // naechste Section beim ersten Laden nicht unten hervorschaut. Ersetzt
    // das vorherige min-h-[80vh] direkt (kein Nebeneinander, keine
    // Kollision). Ab md unveraendert bei den bisherigen festen vh-Werten
    // (82vh/86vh) -- Desktop ist nicht Teil dieses Auftrags. Beide Divs
    // hier (dieses und der Content-Flow-Block weiter unten) tragen die
    // Klasse, weil der Content-Block als einziges Flow-Kind des relativ
    // positionierten Hero-Containers dessen gerenderte Hoehe bestimmt (die
    // absolut positionierten Bild-/Verlaufsebenen tragen dazu nichts bei).
    <div className="pl-hero-scene relative w-full md:min-h-[82vh] lg:min-h-[86vh] bg-pl-stage overflow-hidden">
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
            className={
              objectPositionVars
                ? 'object-cover object-[var(--hero-pos-mobile)] md:object-[var(--hero-pos-desktop)]'
                : 'object-cover object-center'
            }
            style={objectPositionVars}
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

      {/* Content – bündig unten links */}
      <div className="pl-hero-scene relative z-10 flex items-end h-full md:min-h-[82vh] lg:min-h-[86vh]">
        <div className="w-full pl-container-shell px-4 sm:px-6 pb-8 md:pb-12">
          {/* Logo -- klein, direkt ueber dem Bandnamen verankert statt als
              Eck-Plakette (finaler Entwurf, "Hero-Varianten & Empfehlung",
              V1 "Name fuehrt": beide Referenzlogos sind auf Buehnenfotos
              allein nicht zuverlaessig lesbar, der Name traegt die
              Erkennbarkeit, das Logo liefert Persoenlichkeit daneben).
              Groesse bewusst generisch/einheitlich gehalten (keine
              bandspezifische Layout-Sonderabfrage) -- object-contain leitet
              die tatsaechliche Bildform aus der Datei ab, siehe
              bandHeroLogoAspectRatio.test.ts. Layout funktioniert ohne Logo
              unveraendert -- rein bedingtes Rendering. */}
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
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-pl-accent-light mb-3">
              {metaLine}
            </p>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-pl-on-stage leading-[1.03] mb-3">
            {band.name}
          </h1>

          {subtitle && (
            <p className="text-base md:text-lg text-pl-on-stage-muted max-w-2xl mb-6 leading-relaxed">
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
