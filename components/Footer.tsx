import Link from 'next/link';
import { ProudleutLogo } from './ProudleutLogo';
import { buildOccasionNavUrl, type FinderFilterParams } from '@/lib/bands/finderRouting';

const CONTACT_EMAIL = 'alexander.dressler@proudleut.com';

// Footer-Links sind reine Navigation ohne aktive Finder-Filter -- dieselbe
// buildOccasionNavUrl()-Logik wie im Bandfinder (lib/bands/finderRouting.ts),
// damit Anlaesse mit eigener /veranstaltung/[slug]-Landingpage dorthin
// verlinken und alle anderen automatisch auf /bands?anlass=<slug> ausweichen
// -- keine hartcodierten Routen, kein Auseinanderlaufen mit dem Finder.
const NO_FINDER_FILTERS: FinderFilterParams = { region: null, suche: '', bandtyp: null, mood: null };

// Reihenfolge/Labels aus dem freigegebenen Footer-Entwurf. Slugs identisch zu
// lib/finderOccasions.ts (FINDER_OCCASIONS) -- "Alle Bands" ist bewusst kein
// Anlass, sondern verlinkt direkt auf /bands (identisches Ziel wie der
// Header-CTA, components/Header.tsx).
const DISCOVER_OCCASION_SLUGS = [
  { label: 'Hochzeit', slug: 'hochzeit' },
  { label: 'Firmenfeier', slug: 'firmenfeier' },
  { label: 'Festzelt', slug: 'festzelt' },
  { label: 'Stadt- & Bürgerfest', slug: 'stadt-und-buergerfest' },
  { label: 'Konzert, Club & Festival', slug: 'konzert-club-festival' },
] as const;

const PROUDLEUT_LINKS = [
  { label: 'Über proudleut', href: '/ueber-mich' },
  { label: 'Für Bands', href: '/fuer-bands' },
  { label: 'Musiker hinter den Bands', href: '/musiker' },
] as const;

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light rounded-sm';

// Spaltenlinks: grosszuegige Tap-Flaeche (Auftrag "komfortable Touch-Ziele"),
// identisches Padding-Muster wie die mobile Hauptnavigation
// (components/Header.tsx, py-2.5). Farbe bewusst volles text-pl-on-stage
// (Auftrag "Feinschliff": bessere Lesbarkeit als text-pl-on-stage-muted,
// ≈14.9:1 gegen den Footer-Hintergrund) -- kein eigener Hover-Farbwechsel
// noetig, da bereits die hellste bestehende On-Stage-Stufe.
const NAV_LINK_CLASS = `block py-2.5 md:py-1 text-pl-on-stage ${FOCUS_RING}`;

// Markenzeile, sichtbare E-Mail-Adresse und Impressum/Datenschutz: gedaempfte
// Zwischenstufe statt text-pl-on-stage-muted (Auftrag "Feinschliff") --
// text-pl-on-stage mit Opacity-Modifier statt eines neuen Tokens, ≈9.8:1
// gegen den Footer-Hintergrund (siehe Abschlussbericht fuer die genaue
// Berechnung). Hover auf interaktiven Elementen geht auf volles
// text-pl-on-stage.
const DIMMED_TEXT_CLASS = 'text-pl-on-stage/80';

// Spaltenueberschriften: Farbe/Groesse/Gewicht wie das bestehende Kicker-
// Pattern (u. a. components/homepage/BandEinschaetzen.tsx), aber bewusst
// OHNE uppercase -- die Marke "proudleut" wird nie grossgeschrieben, daher
// muss "proudleut" hier woertlich klein bleiben.
const COLUMN_HEADING_CLASS = 'text-xs font-semibold text-pl-accent-light tracking-wide';

export default function Footer() {
  const discoverLinks = [
    ...DISCOVER_OCCASION_SLUGS.map((o) => ({
      label: o.label,
      href: buildOccasionNavUrl(o.slug, NO_FINDER_FILTERS),
    })),
    { label: 'Alle Bands', href: '/bands' },
  ];

  return (
    <footer className="bg-pl-gradient-footer">
      <div className="pl-container-shell px-4 sm:px-6 pt-14 md:pt-20">
        {/* Vier Bereiche: Logo+Markenzeile, Entdecken, proudleut, Kontakt.
            "Entdecken"/"proudleut" bilden bis md ein eigenes 2-Spalten-Raster
            (mobile Vorgabe: zweispaltig nebeneinander, danach erst der
            Kontaktblock) -- ab md loesen sie sich per `md:contents` aus
            diesem Wrapper und werden zu regulaeren Spalten im uebergeordneten
            4-Spalten-Raster, ohne Markup-Duplizierung pro Breakpoint. */}
        <div className="flex flex-col gap-10 md:grid md:grid-cols-[1.5fr_1fr_1fr_1.15fr] md:gap-x-12 md:items-start">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              aria-label="Zur Startseite"
              className={`inline-flex w-fit text-pl-on-stage ${FOCUS_RING}`}
            >
              <ProudleutLogo className="h-8 md:h-9 w-auto" />
            </Link>
            <p className={`${DIMMED_TEXT_CLASS} text-sm`}>Livebands für euer Event.</p>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:contents">
            <nav aria-label="Entdecken" className="flex flex-col gap-3">
              <p className={COLUMN_HEADING_CLASS}>Entdecken</p>
              <div className="flex flex-col text-[15px]">
                {discoverLinks.map((l) => (
                  <Link key={l.label} href={l.href} className={NAV_LINK_CLASS}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>

            <nav aria-label="proudleut" className="flex flex-col gap-3">
              <p className={COLUMN_HEADING_CLASS}>proudleut</p>
              <div className="flex flex-col text-[15px]">
                {PROUDLEUT_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className={NAV_LINK_CLASS}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          <nav aria-label="Kontakt" className="flex flex-col gap-3">
            <p className={COLUMN_HEADING_CLASS}>Kontakt</p>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`inline-flex w-fit items-baseline gap-2 text-xl md:text-2xl font-bold text-pl-on-stage hover:text-pl-accent-light motion-safe:transition-colors py-1 ${FOCUS_RING}`}
              >
                Schreib mir
                <span aria-hidden="true" className="text-pl-accent-light">
                  →
                </span>
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`w-fit text-sm ${DIMMED_TEXT_CLASS} underline underline-offset-4 hover:text-pl-on-stage motion-safe:transition-colors py-1 ${FOCUS_RING}`}
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </nav>
        </div>

        <div className="mt-12 md:mt-16 border-t border-pl-stage">
          <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex gap-6">
              <Link
                href="/impressum"
                className={`py-3 sm:py-0 ${DIMMED_TEXT_CLASS} hover:text-pl-on-stage motion-safe:transition-colors ${FOCUS_RING}`}
              >
                Impressum
              </Link>
              <Link
                href="/datenschutz"
                className={`py-3 sm:py-0 ${DIMMED_TEXT_CLASS} hover:text-pl-on-stage motion-safe:transition-colors ${FOCUS_RING}`}
              >
                Datenschutz
              </Link>
            </div>
            {/* Copyright bleibt bewusst die einzige verbliebene
                text-pl-on-stage-muted-Stelle -- reiner Fliesstext ohne
                Interaktion, ≈4.67:1 gegen den Footer-Hintergrund, besteht
                AA weiterhin (siehe Abschlussbericht). */}
            <p className="text-pl-on-stage-muted">© 2026 proudleut.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
