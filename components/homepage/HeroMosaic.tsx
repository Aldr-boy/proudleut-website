import Link from 'next/link';
import Image from 'next/image';
import { CATEGORIES, type CategoryConfig } from '@/lib/categories';
import { heroMosaicImages } from '@/lib/homepage/heroMosaicImages';

// "Nach Anlass": bewusste Auswahl von drei bestehenden CATEGORIES-Eintraegen
// in dieser Reihenfolge (Vorgabe), Zielpfad /veranstaltung/[slug] bleibt der
// bestehende, funktionierende Anlass-Zielpfad -- keine neue Ziel-URL.
const ANLASS_CHIP_SLUGS = ['hochzeit', 'firmenfeier', 'festzelt'];
const ANLASS_CHIPS: CategoryConfig[] = ANLASS_CHIP_SLUGS
  .map((slug) => CATEGORIES.find((c) => c.slug === slug))
  .filter((c): c is CategoryConfig => c !== undefined);

// "Klingt nach": bewusste Auswahl von drei aktiven Moods (siehe Preflight-
// Analysebericht), Zielpfad direkt in den vorgefilterten Band-Explorer
// (/bands?mood=<slug>) -- keine eigene Mood-Landingpage.
const KLINGT_NACH_CHIPS: { title: string; slug: string }[] = [
  { title: 'Tanzflächen-Garantie', slug: 'tanzflaechen-garantie' },
  { title: 'Authentisch und handgemacht', slug: 'authentisch-handgemacht' },
  { title: 'Generationenverbindend', slug: 'generationenverbindend' },
];

export default function HeroMosaic() {
  return (
    <section className="relative overflow-hidden bg-pl-stage min-h-[520px] md:min-h-[680px] lg:h-[85svh] lg:max-h-[900px]">
      {/* Mosaik-Grid – absolut hinterlegt, füllt die Section */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 md:grid-cols-4 md:grid-rows-3 gap-0.5">
        {heroMosaicImages.map((img, i) => (
          <div key={i} className="relative overflow-hidden">
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 25vw"
              priority={i < 4}
              quality={75}
            />
          </div>
        ))}
      </div>

      {/* Overlay – linearer Basis-Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(rgba(18,16,26,0.58), rgba(18,16,26,0.68))" }}
      />

      {/* Spotlight – zentrales Abdunklungsfeld hinter dem Text */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(18,16,26,0.86) 0%, rgba(18,16,26,0.68) 38%, rgba(18,16,26,0.42) 70%, transparent 100%)" }}
      />

      {/* Content -- mobil oben ausgerichtet mit Abstand zur schwebenden
          Pill-Navigation (fixed, ~12px + 56px hoch), ab md wieder wie
          zuvor vertikal zentriert. */}
      <div className="absolute inset-0 z-10 flex items-start justify-center md:items-center px-4 sm:px-6 pt-24 pb-10 md:py-16">
        <div className="text-center max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold text-pl-on-stage leading-tight mb-3 md:mb-4">
            Livebands
            <br className="hidden sm:block" /> für dein Event
          </h1>
          <p className="text-pl-on-stage text-lg md:text-xl mb-6 md:mb-8 max-w-xl mx-auto">
            Finde passende Livebands nach Anlass &amp; Stil und kontaktiere sie direkt.
          </p>
          <div className="mb-8 md:mb-10 space-y-4">
            <div className="flex flex-wrap justify-center gap-2">
              {ANLASS_CHIPS.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/veranstaltung/${cat.slug}`}
                  className="px-5 py-2.5 rounded-full text-sm border border-pl-accent-light/30 text-pl-on-stage-muted hover:border-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
                >
                  {cat.title}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {KLINGT_NACH_CHIPS.map((mood) => (
                <Link
                  key={mood.slug}
                  href={`/bands?mood=${mood.slug}`}
                  className="px-5 py-2.5 rounded-full text-sm border border-pl-accent-light/30 text-pl-on-stage-muted hover:border-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
                >
                  {mood.title}
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/bands"
            className="inline-flex items-center px-6 py-3 rounded-full bg-pl-accent text-pl-on-accent font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors"
          >
            Bands entdecken
          </Link>
        </div>
      </div>
    </section>
  );
}
