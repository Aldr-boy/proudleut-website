import Image from 'next/image';
import Link from 'next/link';
import { bandLogos } from '@/lib/homepage/bandLogos';

// Bodenlinie im Homepage-Hero (Auftrag "Proudleut-Homepage-Hero
// Bandzeile", Variante 1a): liegt direkt auf der bestehenden dunklen
// Hero-Flaeche (bg-pl-stage), keine eigene Leiste/Hintergrundflaeche.
// Wird als letztes Kind IN demselben data-hero-wall-paused-Container wie
// die Bildwand gerendert (siehe HeroWall.tsx) -- dadurch pausiert
// derselbe bestehende Pause-Button (kein zweiter Regler) auch diese
// Zeile. Der dunkle Grund unter der Zeile kommt jetzt vom neuen
// ImageBottomFade/MobileEdgeFade in HeroWall.tsx (Nachbesserung
// "Feinschliff Bandzeile", Abschnitt 1).
//
// Datenquelle: dieselbe bandLogos-Liste wie zuvor components/homepage/
// LogoStrip.tsx (lib/homepage/bandLogos.ts) -- keine zweite, abweichende
// Logo-Liste. Farben bleiben unveraendert Original (kein Filter/
// Entsaettigung).
//
// Groessen (Nachbesserung "Feinschliff Bandzeile", Abschnitt 3): reale
// Rohwerte aus der Entwurfsdatei "Hero Bandzeile.dc.html" (LOGOS-Array,
// Variante 1a), dort mit 0.66 (Desktop, mqDesk) bzw. 0.5 (Mobile,
// mqMobile) multipliziert -- exakt uebernommen statt einer einheitlichen
// Hoehe, damit die Zeile optisch ausgeglichen wirkt (donnaweda/whoobers/
// Urner Musi/Tegernseer sind im Original bewusst kleiner). Pro Logo per
// CSS-Custom-Property gesetzt (identisches Muster wie
// --pl-hero-float-distance in HeroWall.tsx) statt dynamisch erzeugter
// Tailwind-Klassen, da Tailwind Klassennamen nur bei statischem
// Vorkommen im Quelltext erkennt.
const LOGO_RAW_HEIGHT: Record<string, number> = {
  'A96 Musikanten': 52,
  'Bigband Steinbach': 46,
  Birddogs: 52,
  'Blechstreet Boys': 52,
  "D'Quertreiber": 50,
  Donnaweda: 34,
  'San2 & His Soul Patrol': 44,
  'Rotzlöffl Band': 42,
  // "m" im Entwurf (Rohwert 52) -- bewusst leicht angehoben (Auftrag
  // erlaubt das explizit): sehr feine Linienzeichnung, bei identischer
  // Rohgroesse wie die uebrigen Logos kaum erkennbar. Nachbesserung
  // "Feinschliff Bandzeile Runde 2": von 60 auf 56 reduziert, wirkte
  // gegenueber den Nachbarlogos zu schwer.
  Muckasäck: 56,
  'Rüscherl & Muse': 48,
  Schlawindl: 52,
  "Smooth 'n' Groove": 48,
  // Bewusst der kleinste Wert im Entwurf -- auf dem jetzt abgedunkelten
  // Grund ausreichend erkennbar, siehe Abschlussbericht.
  'Tegernseer Tanzlmusi': 28,
  Whoobers: 36,
  'Urner Musi': 36,
};
const DESKTOP_SCALE = 0.66;
const MOBILE_SCALE = 0.5;

const LOGO_LINK_CLASS =
  'inline-flex shrink-0 items-center opacity-90 hover:opacity-100 motion-safe:transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light rounded-sm h-[var(--pl-logo-h-mobile)] md:h-[var(--pl-logo-h-desktop)]';

function LogoItem({
  logo,
  duplicate,
}: {
  logo: (typeof bandLogos)[number];
  duplicate?: boolean;
}) {
  const raw = LOGO_RAW_HEIGHT[logo.name] ?? 48;
  const style = {
    ['--pl-logo-h-mobile' as string]: `${Math.round(raw * MOBILE_SCALE)}px`,
    ['--pl-logo-h-desktop' as string]: `${Math.round(raw * DESKTOP_SCALE)}px`,
  };
  return (
    <Link
      href={logo.href}
      aria-label={duplicate ? undefined : logo.name}
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
      inert={duplicate || undefined}
      className={LOGO_LINK_CLASS}
      style={style}
    >
      <Image
        src={logo.src}
        alt={`${logo.name} Logo`}
        width={160}
        height={48}
        className="h-full w-auto object-contain"
      />
    </Link>
  );
}

export function HeroLogoMarquee() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex h-14 items-center gap-4 px-4 sm:px-6 md:gap-6 md:pl-8 lg:pl-12 xl:pl-16">
      <p className="shrink-0 font-mono text-[11px] tracking-[0.14em] uppercase text-pl-accent-light">
        Bands auf proudleut
      </p>
      {/* Weicher Ein-/Auslauf an beiden Raendern der Zeile (Entwurf:
          fade 36px Mobile / 90px Desktop) -- .pl-logo-fade-mask in
          app/globals.css, dort per Media Query auf 90px angehoben. */}
      <div className="pl-logo-fade-mask relative min-w-0 flex-1 overflow-hidden">
        <div className="pl-logo-marquee flex w-max items-center gap-10 md:gap-16">
          {bandLogos.map((logo) => (
            <LogoItem key={logo.name} logo={logo} />
          ))}
          {bandLogos.map((logo) => (
            <LogoItem key={`${logo.name}-dup`} logo={logo} duplicate />
          ))}
        </div>
      </div>
    </div>
  );
}
