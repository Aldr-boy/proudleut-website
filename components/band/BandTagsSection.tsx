import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import { formatLocation } from '@/lib/utils/formatLocation';
import { findCategoryForEventTypeSlug } from './bandTagsCategoryMatch';

type Props = {
  band: Band;
};

// Ebene 1 "Klingt nach" -- emotional fuehrend, groesste/prominenteste Chips.
const GOLDEN_CHIP =
  'inline-flex items-center px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm md:text-base font-medium border';
// Ebene 2 "Musikalisch verortet" -- zweite Ebene, kleinere sekundaere Chips.
const PURPLE_CHIP =
  'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-pl-accent-subtle text-pl-accent-deep';

export function BandTagsSection({ band }: Props) {
  const hasKlingtNach = band.klingtNach.length > 0;
  const hasMusikalischVerortet = band.musikalischVerortet.length > 0;

  const besetzung = band.weddingInfo?.bandSize || band.weddingInfo?.constellation;
  const locationText = formatLocation(band.location);

  const quickFacts = (
    [
      band.category ? { label: 'Bandart', value: band.category } : null,
      locationText ? { label: 'Herkunft', value: locationText } : null,
      besetzung ? { label: 'Besetzung', value: besetzung } : null,
    ] as ({ label: string; value: string } | null)[]
  ).filter((f): f is { label: string; value: string } => f !== null);

  const hasSocialLinks =
    !!(band.socialLinks.instagram ||
      band.socialLinks.facebook ||
      band.socialLinks.spotify ||
      band.socialLinks.youtube);

  if (
    !hasKlingtNach &&
    !hasMusikalischVerortet &&
    quickFacts.length === 0 &&
    band.eventTypes.length === 0 &&
    !hasSocialLinks
  ) {
    return null;
  }

  return (
    <section className="bg-pl-canvas py-12 md:py-16 border-b border-pl-soft px-4 sm:px-6">
      <div className="pl-container-shell space-y-8">

        {/* Klingt nach + Musikalisch verortet */}
        {(hasKlingtNach || hasMusikalischVerortet) && (
          <div className="space-y-5">
            {hasKlingtNach && (
              <div>
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                  Klingt nach
                </p>
                <div className="flex flex-wrap gap-2">
                  {band.klingtNach.map((tag) => (
                    <span
                      key={tag}
                      className={GOLDEN_CHIP}
                      style={{
                        backgroundColor: 'rgba(233,196,106,0.14)',
                        borderColor: 'rgba(233,196,106,0.38)',
                        color: '#8a6200',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasMusikalischVerortet && (
              <div>
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                  Musikalisch verortet
                </p>
                <div className="flex flex-wrap gap-2">
                  {band.musikalischVerortet.map((tag) => (
                    <span key={tag} className={PURPLE_CHIP}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ebene 3: Bandart · Herkunft · Besetzung -- ruhige typografische
            Faktenzeile, keine Karten, Trennung ueber "·". Labels bleiben als
            sr-only erhalten (Auftrag: "keine vorhandene Bandinformation geht
            verloren"), sind aber visuell bewusst nicht mehr sichtbar. */}
        {quickFacts.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-3 border-t border-pl-soft pt-7 text-sm font-medium text-pl-text">
            {quickFacts.map(({ label, value }, i) => (
              <span key={label} className="flex items-baseline gap-x-3">
                {i > 0 && <span className="text-pl-text-hint" aria-hidden="true">·</span>}
                <span>
                  <span className="sr-only">{label}: </span>
                  {value}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Ebene 4 "Spielt bei" + Vernetzt -- deutlich zurueckgenommene
            Meta-Ebene. Textliste mit "·"-Trennern statt Chip-Wolke. Bereits
            bestehende Kategorie-Verlinkung (siehe bandTagsCategoryMatch.ts)
            bleibt funktional erhalten -- nur die visuelle Chip-Darstellung
            entfaellt, nicht der Linkmehrwert (interne Verlinkung/SEO). */}
        {(band.eventTypes.length > 0 || hasSocialLinks) && (
          <div className="flex flex-col sm:flex-row sm:items-start gap-8 border-t border-pl-soft pt-7">

            {band.eventTypes.length > 0 && (
              <div className="flex-1">
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                  Spielt bei
                </p>
                <p className="text-sm text-pl-text-muted leading-loose">
                  {band.eventTypes.map((et, i) => {
                    const eventTypeSlug = band.categorySlugs?.[i];
                    const category = eventTypeSlug ? findCategoryForEventTypeSlug(eventTypeSlug) : undefined;
                    return (
                      <span key={et}>
                        {i > 0 && <span className="text-pl-text-hint" aria-hidden="true"> · </span>}
                        {category ? (
                          <Link
                            href={`/veranstaltung/${category.slug}`}
                            className="rounded-sm hover:text-pl-text motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
                          >
                            {et}
                          </Link>
                        ) : (
                          et
                        )}
                      </span>
                    );
                  })}
                </p>
              </div>
            )}

            {hasSocialLinks && (
              <div className="shrink-0">
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                  Vernetzt
                </p>
                <div className="flex items-center gap-3 flex-wrap">
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
              </div>
            )}

          </div>
        )}

      </div>
    </section>
  );
}
