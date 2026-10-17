import type { Metadata } from 'next';
import Image from 'next/image';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import BandCard from '@/components/BandCard';
import { Button } from '@/components/ui/Button';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/seo/metadata';
import {
  HOCHZEIT_OBERPFALZ_ALL_BANDS_LABEL,
  HOCHZEIT_OBERPFALZ_ALL_BANDS_URL,
  HOCHZEIT_OBERPFALZ_MIN_BANDS,
  countHochzeitOberpfalzBands,
  hochzeitOberpfalzClosing,
  hochzeitOberpfalzFaq,
  hochzeitOberpfalzHero,
  hochzeitOberpfalzMeta,
  hochzeitOberpfalzPrice,
  hochzeitOberpfalzSteps,
  hochzeitOberpfalzTips,
  resolveHochzeitOberpfalzGroups,
} from '@/lib/content/hochzeitOberpfalz';

export const revalidate = 300;

const BTN_PRIMARY =
  'inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-pl-accent text-pl-on-accent text-base font-semibold hover:bg-pl-accent-hover motion-safe:transition-colors';
const BTN_SECONDARY_ON_LIGHT =
  'inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-pl-soft text-pl-text text-base font-semibold hover:border-pl-accent hover:text-pl-accent motion-safe:transition-colors';
const BTN_SECONDARY_ON_STAGE =
  'inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-pl-on-stage-muted text-pl-on-stage text-base font-semibold hover:border-pl-accent-light hover:bg-pl-stage-elevated motion-safe:transition-colors';

// Nur Bands der Auswahl, die aktuell aktiv sind (gleiche Quelle wie
// Bandseiten und Sitemap) -- eine inaktive Band wird nicht angezeigt.
async function loadRows() {
  const { data, error } = await getAllBandsFromSupabase();
  if (error) throw error;
  return data ?? [];
}

function activeSlugsOf(rows: Array<{ slug?: string | null }>) {
  return new Set(rows.map((b) => b.slug).filter((s): s is string => !!s));
}

export async function generateMetadata(): Promise<Metadata> {
  const rows = await loadRows();
  const count = countHochzeitOberpfalzBands(resolveHochzeitOberpfalzGroups(activeSlugsOf(rows)));
  const indexable = count >= HOCHZEIT_OBERPFALZ_MIN_BANDS;
  const { title, description, canonical } = hochzeitOberpfalzMeta;

  return {
    // absolute: der Titel enthält "– proudleut.com" bereits, das Layout-
    // Template soll ihn nicht ein zweites Mal anhängen.
    title: { absolute: title },
    description,
    alternates: { canonical },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_SOCIAL_IMAGE.url],
    },
  };
}

export default async function HochzeitOberpfalzPage() {
  const rows = await loadRows();
  const groups = resolveHochzeitOberpfalzGroups(activeSlugsOf(rows));
  const bandBySlug = new Map(
    rows.map((row) => [row.slug as string, normalizeBandFromSupabase(row)] as const)
  );
  const hero = hochzeitOberpfalzHero;

  return (
    <>
      {/* Kopf: Vollbild-Foto, dunkle Abdeckung (links stark, rechts schwach).
          Am Handy ist der Kopf deutlich höher als der Bildschirm; damit dort
          mehrere der fünf Musiker sichtbar bleiben, deckt das Foto am Handy
          die oberen 60 % der Bildschirmhöhe und läuft nach unten in die
          Bühnenfarbe aus. Bildnachweis unter dem Block "So läuft's". */}
      <section className="relative overflow-hidden bg-pl-stage min-h-screen min-h-svh flex flex-col justify-end" aria-labelledby="hochzeit-oberpfalz-h1">
        <div className="absolute inset-x-0 top-0 h-[60svh] md:inset-0 md:h-auto">
          <Image
            src={hero.imageSrc}
            alt={hero.imageAlt}
            fill
            priority
            quality={75}
            sizes="100vw"
            className="object-cover object-[38%_40%] md:object-[center_40%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-pl-stage/10 via-pl-stage/10 via-45% to-pl-stage md:hidden" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none hidden md:block"
          style={{
            background:
              'linear-gradient(to right, rgba(18,16,26,0.92) 0%, rgba(18,16,26,0.7) 45%, rgba(18,16,26,0.3) 100%)',
          }}
        />
        <div className="relative z-10 w-full pl-container-shell px-4 sm:px-6 pt-[50svh] md:pt-36 pb-12 md:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-16 items-end">
            <div className="max-w-[640px]">
              <h1
                id="hochzeit-oberpfalz-h1"
                className="text-4xl md:text-5xl font-extrabold tracking-tight text-pl-on-stage leading-tight"
                style={{ textShadow: '0 2px 24px rgba(18,16,26,0.6)' }}
              >
                {hero.headline}
              </h1>
              <p className="pl-photo-copy mt-5 text-base md:text-lg leading-relaxed">{hero.intro}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href="#bands" className={BTN_PRIMARY}>
                  {hero.primaryButton}
                </Button>
                <Button href={HOCHZEIT_OBERPFALZ_ALL_BANDS_URL} className={BTN_SECONDARY_ON_STAGE}>
                  {HOCHZEIT_OBERPFALZ_ALL_BANDS_LABEL}
                </Button>
              </div>
            </div>
            <div>
              <div className="rounded-xl border border-pl-stage-divider bg-pl-stage-elevated/90 p-6 md:p-7">
                <p className="text-xs font-semibold tracking-widest text-pl-on-stage-muted mb-5">
                  {hochzeitOberpfalzSteps.title}
                </p>
                <ol className="space-y-4">
                  {hochzeitOberpfalzSteps.items.map((step, i) => (
                    <li key={step} className="flex items-start gap-4">
                      <span
                        aria-hidden="true"
                        className="shrink-0 w-7 h-7 rounded-full border border-pl-accent-light text-pl-accent-light text-sm font-semibold flex items-center justify-center"
                      >
                        {i + 1}
                      </span>
                      <span className="text-pl-on-stage leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p
                className="mt-3 font-mono text-[11px] font-normal leading-snug text-pl-on-stage/70"
                style={{ textShadow: '0 1px 8px rgba(18,16,26,0.6)' }}
              >
                {hero.caption}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bandkarten in den drei Gruppen der Auswahl */}
      <section id="bands" className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6 scroll-mt-24">
        <div className="pl-container-shell">
          {groups.map((group, gi) => (
            <div key={group.heading} className={gi > 0 ? 'mt-14 md:mt-16' : ''}>
              <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6">{group.heading}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.bands.map((entry, bi) => {
                  const band = bandBySlug.get(entry.slug);
                  if (!band) return null;
                  return (
                    <div key={entry.slug}>
                      <BandCard band={band} priority={gi === 0 && bi < 3} showMerkButton />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-10">
            <Button href={HOCHZEIT_OBERPFALZ_ALL_BANDS_URL} className={BTN_SECONDARY_ON_LIGHT}>
              {HOCHZEIT_OBERPFALZ_ALL_BANDS_LABEL}
            </Button>
          </div>
        </div>
      </section>

      {/* Kacheln: Worauf es bei der Band ankommt */}
      <section className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-8 max-w-[820px]">
            {hochzeitOberpfalzTips.heading}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {hochzeitOberpfalzTips.items.map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-pl-elevated border border-pl-soft p-6 shadow-pl-photo"
              >
                <h3 className="text-lg font-semibold text-pl-text mb-2">{item.title}</h3>
                <p className="text-pl-text-muted leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preisorientierung mit drei Preiskarten */}
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
                {hochzeitOberpfalzPrice.heading}
              </h2>
              <p className="text-pl-text-muted leading-relaxed">{hochzeitOberpfalzPrice.text}</p>
            </div>
            <div className="space-y-4">
              {hochzeitOberpfalzPrice.cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl bg-pl-elevated border border-pl-soft p-5 shadow-pl-photo"
                >
                  <p className="text-sm text-pl-text-muted">{card.label}</p>
                  <p className="mt-1 text-xl font-bold text-pl-text">{card.value}</p>
                  {card.note && <p className="mt-0.5 text-sm text-pl-text-muted">{card.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Häufige Fragen: aufklappbar, Antworten stehen im HTML */}
      <section className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6">
              {hochzeitOberpfalzFaq.heading}
            </h2>
            <div className="divide-y divide-[var(--pl-border-medium)]">
              {hochzeitOberpfalzFaq.items.map((faq) => (
                <details key={faq.question} className="group py-1">
                  <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden [&::marker]:hidden text-pl-text font-medium hover:text-pl-accent motion-safe:transition-colors select-none">
                    <span>{faq.question}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="w-4 h-4 shrink-0 text-pl-text-muted motion-safe:transition-transform group-open:rotate-180"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="pb-5 text-pl-text-muted leading-relaxed">{faq.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Abschluss */}
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6 text-center">
        <div className="max-w-[620px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
            {hochzeitOberpfalzClosing.heading}
          </h2>
          <p className="text-pl-text-muted leading-relaxed mb-8">{hochzeitOberpfalzClosing.text}</p>
          <Button href={HOCHZEIT_OBERPFALZ_ALL_BANDS_URL} className={BTN_PRIMARY}>
            {HOCHZEIT_OBERPFALZ_ALL_BANDS_LABEL}
          </Button>
        </div>
      </section>
    </>
  );
}
