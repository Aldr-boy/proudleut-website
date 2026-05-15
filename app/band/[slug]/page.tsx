import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getBandBySlug, getBands } from '@/lib/airtable/queries';
import { generateBandJsonLd } from '@/lib/seo/jsonLd';
import { CATEGORIES } from '@/lib/categories';
import { getSimilarBands } from '@/lib/bands/similarBands';
import BandCard from '@/components/BandCard';
import { MarkdownText } from '@/components/MarkdownText';

export const revalidate = 300;

type PageProps = { params: Promise<{ slug: string }> };

// --- Inline helpers ---

function safeUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'javascript:') return null;
    return u.href;
  } catch {
    return null;
  }
}

function getCategorySlugForEventType(eventType: string): string | null {
  const normalized = eventType.trim();
  return (
    CATEGORIES.find((c) =>
      c.airtableEventTypes.some((et) => et.trim() === normalized)
    )?.slug ?? null
  );
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0];
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v');
      } else if (u.pathname.startsWith('/embed/')) {
        id = u.pathname.replace('/embed/', '').split('?')[0];
      } else if (u.pathname.startsWith('/shorts/')) {
        id = u.pathname.replace('/shorts/', '').split('?')[0];
      }
    }
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

// --- Metadata ---

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const band = await getBandBySlug(slug);
  if (!band) return {};
  return {
    title: band.name,
    description:
      band.metaDescription ||
      band.shortDescription ||
      `${band.name} – Liveband bei proudleut`,
  };
}

// --- Page ---

export default async function BandPage({ params }: PageProps) {
  const { slug } = await params;

  const [maybeBand, allBands] = await Promise.all([getBandBySlug(slug), getBands()]);
  if (!maybeBand) notFound();
  const band = maybeBand;

  const jsonLd = generateBandJsonLd(band);
  const websiteUrl = safeUrl(band.websiteUrl);
  const embedUrl = getYouTubeEmbedUrl(band.youtubeVideoUrl);
  const similarBands = getSimilarBands(band, allBands);

  const hasSocialLinks = Object.values(band.socialLinks).some(Boolean);
  const hasWeddingInfo = !!(
    band.weddingInfo?.weddingDescription ||
    band.weddingInfo?.bandSize ||
    band.weddingInfo?.feeRange ||
    band.weddingInfo?.constellation
  );
  const hasLocation = !!(band.location?.city || band.location?.district);
  const locationText = [band.location?.city, band.location?.district, band.location?.state]
    .filter(Boolean)
    .join(' · ');

  const quickFacts: string[] = [];
  if (band.weddingInfo?.bandSize) {
    const size = band.weddingInfo.bandSize;
    quickFacts.push(/^\d+$/.test(size.trim()) ? `${size} Musiker` : size);
  } else if (band.weddingInfo?.constellation) {
    quickFacts.push(band.weddingInfo.constellation);
  }
  const locationLabel = band.location?.city || band.location?.district || null;
  if (locationLabel) quickFacts.push(locationLabel);
  const uniqueEventTypes = [...new Set(band.eventTypes)];
  quickFacts.push(...uniqueEventTypes.slice(0, 3));

  return (
    <article className="bg-pl-canvas">
      {/* JSON-LD – produktiv, kein Debug */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Image */}
      {band.heroImage && (
        <div className="bg-pl-stage">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
              <Image
                src={band.heroImage.url}
                alt={band.heroImage.alt}
                fill
                className="object-cover"
                priority
                sizes="(min-width: 1280px) 1152px, 100vw"
              />
            </div>
          </div>
        </div>
      )}

      {/* Zweispaltiges Layout ab lg */}
      <div
        className="max-w-6xl mx-auto px-4 sm:px-6 py-10
                   lg:grid lg:grid-cols-[1fr_300px] lg:gap-12 lg:items-start"
      >
        {/* ─── Hauptinhalt ─── */}
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-pl-text leading-tight">
            {band.name}
          </h1>
          {band.category && (
            <p className="text-sm tracking-wide text-pl-accent font-medium mt-2 mb-4">{band.category}</p>
          )}
          {band.shortDescription && (
            <p className="text-pl-text text-lg leading-relaxed max-w-2xl mb-6">{band.shortDescription}</p>
          )}

          {quickFacts.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-1.5">
                Kurz gesagt
              </p>
              <p className="text-sm text-pl-text-muted">{quickFacts.join(' · ')}</p>
            </div>
          )}

          {websiteUrl && (
            <div className="mb-10">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold
                           bg-pl-accent text-pl-on-accent
                           hover:bg-pl-accent-hover motion-safe:transition-colors"
              >
                Zur Band-Website
              </a>
            </div>
          )}

          {/* Veranstaltungstypen mit internen Links */}
          {band.eventTypes.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                Anlässe
              </h2>
              <div className="flex flex-wrap gap-2">
                {band.eventTypes.map((et) => {
                  const catSlug = getCategorySlugForEventType(et);
                  const base =
                    'px-3 py-1 rounded-full text-sm border border-pl-soft text-pl-text-muted';
                  return catSlug ? (
                    <Link
                      key={et}
                      href={`/veranstaltung/${catSlug}`}
                      className={`${base} hover:border-pl-medium hover:text-pl-text motion-safe:transition-colors`}
                    >
                      {et}
                    </Link>
                  ) : (
                    <span key={et} className={base}>
                      {et}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* Referenz-Events */}
          {band.referenceEvents.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                Aufgetreten bei
              </h2>
              <ul className="space-y-2">
                {band.referenceEvents.slice(0, 8).map((ev, i) => (
                  <li key={i} className="text-sm border-l-2 border-pl-soft pl-3">
                    <span className="text-pl-text font-medium">{ev.eventName}</span>
                    {(ev.city || ev.year) && (
                      <span className="text-pl-text-muted/70">
                        {ev.city && ` · ${ev.city}`}
                        {ev.year && ` · ${ev.year}`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* YouTube Video */}
          {embedUrl && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                Video
              </h2>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-pl-canvas">
                <iframe
                  src={embedUrl}
                  title={`Video von ${band.name}`}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </section>
          )}

          {/* Beschreibung */}
          {band.description && (
            <section className="mb-8 max-w-prose">
              <MarkdownText
                text={band.description}
                className="text-pl-text-muted leading-relaxed space-y-4"
              />
            </section>
          )}

          {/* Hochzeitsinfos */}
          {hasWeddingInfo && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                Hochzeit mit {band.name}
              </h2>
              {band.weddingInfo?.weddingDescription && (
                <p className="text-pl-text-muted mb-4 leading-relaxed whitespace-pre-line">
                  {band.weddingInfo.weddingDescription}
                </p>
              )}
              <dl className="space-y-4">
                {band.weddingInfo?.bandSize && (
                  <div>
                    <dt className="text-xs font-semibold text-pl-text-muted/60 uppercase tracking-wider">Bandgröße</dt>
                    <dd className="text-pl-text-muted text-sm mt-0.5">{band.weddingInfo.bandSize}</dd>
                  </div>
                )}
                {band.weddingInfo?.feeRange && (
                  <div>
                    <dt className="text-xs font-semibold text-pl-text-muted/60 uppercase tracking-wider">Gage</dt>
                    <dd className="text-pl-text-muted text-sm mt-0.5">{band.weddingInfo.feeRange}</dd>
                  </div>
                )}
                {band.weddingInfo?.constellation && (
                  <div>
                    <dt className="text-xs font-semibold text-pl-text-muted/60 uppercase tracking-wider">Konstellation</dt>
                    <dd className="text-pl-text-muted text-sm mt-0.5">{band.weddingInfo.constellation}</dd>
                  </div>
                )}
                {band.weddingInfo?.moderation != null && (
                  <div>
                    <dt className="text-xs font-semibold text-pl-text-muted/60 uppercase tracking-wider">Moderation</dt>
                    <dd className="text-pl-text-muted text-sm mt-0.5">{band.weddingInfo.moderation ? 'Ja' : 'Nein'}</dd>
                  </div>
                )}
                {band.weddingInfo?.kidnappingBride != null && (
                  <div>
                    <dt className="text-xs font-semibold text-pl-text-muted/60 uppercase tracking-wider">Brautentführung</dt>
                    <dd className="text-pl-text-muted text-sm mt-0.5">{band.weddingInfo.kidnappingBride ? 'Ja' : 'Nein'}</dd>
                  </div>
                )}
                {band.weddingInfo?.possiblePlaytimes && (
                  <div>
                    <dt className="text-xs font-semibold text-pl-text-muted/60 uppercase tracking-wider">Spielzeiten</dt>
                    <dd className="text-pl-text-muted text-sm mt-0.5">{band.weddingInfo.possiblePlaytimes}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Galerie */}
          {band.gallery.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                Galerie
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {band.gallery.slice(0, 6).map((img, i) => (
                  <div key={i} className="relative aspect-[3/2] rounded-lg overflow-hidden">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 25vw, 50vw"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ─── Sidebar – auf Mobile nach Main-Content ─── */}
        <aside className="mt-10 lg:mt-0 lg:sticky lg:top-20 bg-pl-paper rounded-2xl p-6 border border-pl-soft space-y-6">
          {/* Logo */}
          {band.logo && (
            <div>
              <Image
                src={band.logo.url}
                alt={band.logo.alt}
                width={200}
                height={100}
                className="object-contain"
                style={{ maxWidth: '160px', height: 'auto' }}
              />
            </div>
          )}

          {/* Desktop CTA – hidden on mobile (lg:block) */}
          {websiteUrl && (
            <div className="hidden lg:block">
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-6 py-4 text-base rounded-full
                           bg-pl-accent text-pl-on-accent font-semibold
                           hover:bg-pl-accent-hover motion-safe:transition-colors"
              >
                Zur Band-Website
              </a>
            </div>
          )}

          {/* Social Links */}
          {hasSocialLinks && (
            <div className="flex gap-3 flex-wrap">
              {band.socialLinks.instagram && (
                <a
                  href={band.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Instagram von ${band.name}`}
                  className="text-pl-text-muted hover:text-pl-accent motion-safe:transition-colors"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              )}
              {band.socialLinks.facebook && (
                <a
                  href={band.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Facebook von ${band.name}`}
                  className="text-pl-text-muted hover:text-pl-accent motion-safe:transition-colors"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {band.socialLinks.spotify && (
                <a
                  href={band.socialLinks.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Spotify von ${band.name}`}
                  className="text-pl-text-muted hover:text-pl-accent motion-safe:transition-colors"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </a>
              )}
              {band.socialLinks.youtube && (
                <a
                  href={band.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`YouTube von ${band.name}`}
                  className="text-pl-text-muted hover:text-pl-accent motion-safe:transition-colors"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Standort */}
          {hasLocation && (
            <div>
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-1">
                Standort
              </p>
              <p className="text-pl-text-muted text-sm">{locationText}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Ähnliche Bands – volle Container-Breite */}
      {similarBands.length > 0 && (
        <section className="bg-pl-canvas border-t border-pl-soft py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-bold text-pl-text mb-6">Ähnliche Bands</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarBands.map((b) => (
                <BandCard key={b.slug} band={b} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-pl-paper border-t border-pl-soft py-12 md:py-14 px-4 sm:px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
            Noch nicht die richtige Band gefunden?
          </h2>
          <p className="text-pl-text-muted leading-relaxed mb-8">
            Entdecke weitere Livebands auf proudleut — oder schreib mir kurz, wenn du Hilfe bei der Auswahl möchtest.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/bands"
              className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                         bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover motion-safe:transition-colors"
            >
              Alle Bands entdecken
            </Link>
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                         border border-pl-soft text-pl-text-muted
                         hover:border-pl-medium hover:text-pl-text motion-safe:transition-colors"
            >
              Schreib mir kurz
            </a>
          </div>
        </div>
      </section>
    </article>
  );
}
