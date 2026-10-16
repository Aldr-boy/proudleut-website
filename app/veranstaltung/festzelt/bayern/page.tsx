import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';
import { DEFAULT_SOCIAL_IMAGE } from '@/lib/seo/metadata';
import {
  FESTZELT_BAYERN_ALL_BANDS_URL,
  FESTZELT_BAYERN_MIN_BANDS,
  countFestzeltBayernBands,
  festzeltBayernAllBandsLabel,
  festzeltBayernAudience,
  festzeltBayernBandsHeading,
  festzeltBayernFaq,
  festzeltBayernIntro,
  festzeltBayernMeta,
  festzeltBayernPrice,
  festzeltBayernTips,
  resolveFestzeltBayernGroups,
} from '@/lib/content/festzeltBayern';

export const revalidate = 300;

const h2Class = 'text-2xl md:text-3xl font-bold text-pl-text mt-12 mb-4';
const h3Class = 'text-lg md:text-xl font-semibold text-pl-text mt-8 mb-2';
const pClass = 'text-pl-text-muted leading-relaxed mb-4';
const linkClass = 'text-pl-accent underline hover:text-pl-accent-link-hover break-words';

// Nur Bands der Auswahl, die aktuell aktiv sind (gleiche Quelle wie
// Bandseiten und Sitemap) -- eine inaktive Band wird nicht verlinkt.
async function loadGroups() {
  const { data, error } = await getAllBandsFromSupabase();
  if (error) throw error;
  const activeSlugs = new Set((data ?? []).map((b: { slug?: string | null }) => b.slug).filter((s): s is string => !!s));
  return resolveFestzeltBayernGroups(activeSlugs);
}

export async function generateMetadata(): Promise<Metadata> {
  const groups = await loadGroups();
  const indexable = countFestzeltBayernBands(groups) >= FESTZELT_BAYERN_MIN_BANDS;
  const { title, description, canonical } = festzeltBayernMeta;

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

export default async function FestzeltBayernPage() {
  const groups = await loadGroups();

  return (
    <section className="bg-pl-canvas pb-16 px-0">
      <BandFinderPageHead
        h1="Festzeltbands aus Bayern"
        intro={festzeltBayernIntro}
        backHref="/veranstaltung/festzelt"
        backLabel="← Zurück zu Festzeltbands"
      />
      <div className="pl-container-shell px-4 sm:px-6 pt-6">
        <div className="max-w-[760px]">
          <p className={pClass}>{festzeltBayernAudience}</p>

          <h2 className={h2Class}>{festzeltBayernTips.heading}</h2>
          {festzeltBayernTips.items.map((item) => (
            <p key={item.lead} className={pClass}>
              <strong className="font-semibold text-pl-text">{item.lead}</strong> {item.text}
            </p>
          ))}

          <h2 className={h2Class}>{festzeltBayernBandsHeading}</h2>
          {groups.map((group) => (
            <div key={group.heading}>
              <h3 className={h3Class}>{group.heading}</h3>
              <ul className="list-disc pl-6 text-pl-text-muted leading-relaxed mb-4 space-y-2">
                {group.bands.map((band) => (
                  <li key={band.slug}>
                    <Link href={`/band/${band.slug}`} className={`font-semibold ${linkClass}`}>
                      {band.name}
                    </Link>{' '}
                    ({band.ort}): {band.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className={`${pClass} mt-6`}>
            <a href={FESTZELT_BAYERN_ALL_BANDS_URL} className={linkClass}>
              {festzeltBayernAllBandsLabel}
            </a>
          </p>

          <h2 className={h2Class}>{festzeltBayernPrice.heading}</h2>
          <p className={pClass}>{festzeltBayernPrice.text}</p>

          <h2 className={h2Class}>{festzeltBayernFaq.heading}</h2>
          {festzeltBayernFaq.items.map((item) => (
            <div key={item.question}>
              <h3 className={h3Class}>{item.question}</h3>
              <p className={pClass}>{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
