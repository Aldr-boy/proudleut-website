import type { Band } from '@/lib/types/band';
import { AnfrageButton } from './AnfrageButton';
import { MerkButton } from './MerkButton';
import { isFollowerCountVisible, resolveFollowerStandDisplay } from '@/lib/socialLinks/followerCountVisibility';

type Props = {
  band: Band;
  websiteUrl: string | null;
};

type FollowerMetric = { count: number; unit: string; checkedAt: string };
type LinkItem = { label: string; href: string; icon: React.ReactNode; metric?: FollowerMetric };

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

const CONTACT_EMAIL = 'alexander.dressler@proudleut.com';

// Deutsche Zahlenformatierung, keine Abkuerzungen ("5,2k") -- Auftrag
// Abschnitt 2.
function formatFollowerCount(n: number): string {
  return n.toLocaleString('de-DE');
}

// Feste Zeitzone UTC fuer die Formatierung: last_checked_at wird admin-
// seitig als reines Kalenderdatum (YYYY-MM-DD, UTC-Mitternacht)
// gespeichert (siehe lib/socialLinks/resolveSocialMetricsWrite.ts) --
// eine Formatierung in der Betrachter-Zeitzone koennte das Datum sonst um
// einen Tag verschieben.
function formatStandDate(checkedAt: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(checkedAt));
}

function formatStandMonthYear(checkedAt: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(checkedAt));
}

// Zentrale Sichtbarkeitsregel (isFollowerCountVisible) entscheidet, ob
// diese Plattform ueberhaupt eine Zahl zeigt -- ohne sichtbare Zahl bleibt
// die Zeile ein gewoehnlicher Profillink (kein Nullwert, kein
// Platzhalter, siehe Auftrag Abschnitt 2).
function resolveVisibleMetric(
  count: number | null | undefined,
  checkedAt: string | null | undefined,
  unit: string,
): FollowerMetric | undefined {
  if (!isFollowerCountVisible(count, checkedAt)) return undefined;
  return { count: count as number, unit, checkedAt: checkedAt as string };
}

export function BandContactSection({ band, websiteUrl }: Props) {
  const igMetric = resolveVisibleMetric(
    band.socialProfileMetrics?.instagram?.count,
    band.socialProfileMetrics?.instagram?.checkedAt,
    'Follower',
  );
  const fbMetric = resolveVisibleMetric(
    band.socialProfileMetrics?.facebook?.count,
    band.socialProfileMetrics?.facebook?.checkedAt,
    'Follower',
  );
  const ytMetric = resolveVisibleMetric(
    band.socialProfileMetrics?.youtube?.count,
    band.socialProfileMetrics?.youtube?.checkedAt,
    'Abonnenten',
  );

  const links: LinkItem[] = (
    [
      websiteUrl ? { label: 'Website', href: websiteUrl, icon: <GlobeIcon /> } : null,
      band.socialLinks.instagram ? { label: 'Instagram', href: band.socialLinks.instagram, icon: <InstagramIcon />, metric: igMetric } : null,
      band.socialLinks.facebook ? { label: 'Facebook', href: band.socialLinks.facebook, icon: <FacebookIcon />, metric: fbMetric } : null,
      band.socialLinks.youtube ? { label: 'YouTube', href: band.socialLinks.youtube, icon: <YouTubeIcon />, metric: ytMetric } : null,
      band.socialLinks.spotify ? { label: 'Spotify', href: band.socialLinks.spotify, icon: <SpotifyIcon /> } : null,
    ] as (LinkItem | null)[]
  ).filter((l): l is LinkItem => l !== null);

  const hasLinks = links.length > 0;

  // Gemeinsamer vs. plattformweiser Pruefstand -- nur aus tatsaechlich
  // sichtbaren Metriken abgeleitet (Auftrag: "Nur Pruefstaende
  // tatsaechlich angezeigter Kennzahlen ausweisen").
  const standDisplay = resolveFollowerStandDisplay(
    links.filter((l) => l.metric).map((l) => ({ checkedAt: l.metric!.checkedAt })),
  );

  return (
    <section id="band-contact-section" className="bg-pl-paper border-t border-pl-soft py-12 md:py-16 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className={`grid grid-cols-1 gap-10 ${hasLinks ? 'md:grid-cols-2 md:gap-16' : ''}`}>

          {/* Linke Spalte: Mehr von [Band] – nur wenn Links vorhanden */}
          {hasLinks && (
            <div>
              <h2 className="text-lg font-bold text-pl-text mb-5">
                Mehr von {band.name}
              </h2>
              <ul className="max-w-sm">
                {links.map(({ label, href, icon, metric }, idx) => (
                  <li key={label} className={idx > 0 ? 'border-t border-pl-soft' : ''}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={metric ? `${label}: ${formatFollowerCount(metric.count)} ${metric.unit}` : undefined}
                      className="flex w-full items-center gap-3 py-3 rounded-sm text-sm text-pl-text-muted
                                 hover:text-pl-accent motion-safe:transition-colors group
                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
                    >
                      <span className="shrink-0 text-pl-text-muted group-hover:text-pl-accent motion-safe:transition-colors">
                        {icon}
                      </span>
                      <span>{label}</span>

                      {metric && (
                        <span className="ml-auto shrink-0 flex flex-col items-end gap-0.5">
                          <span className="flex items-baseline gap-1">
                            <span className="font-semibold text-pl-text group-hover:text-pl-accent motion-safe:transition-colors">{formatFollowerCount(metric.count)}</span>
                            <span className="text-xs text-pl-text-muted">{metric.unit}</span>
                          </span>
                          {standDisplay.kind === 'per_platform' && (
                            <span className="text-[11px] text-pl-text-hint">
                              Stand: {formatStandDate(metric.checkedAt)}
                            </span>
                          )}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>

              {standDisplay.kind === 'shared' && (
                <p className="mt-3 text-xs text-pl-text-hint">
                  Stand: {formatStandMonthYear(standDisplay.checkedAt)}
                </p>
              )}
            </div>
          )}

          {/* Rechte Spalte: CTA – immer sichtbar. Dunkle Akzent-Karte
              (Auftrag Abschnitt 8/PDF-Referenz "Euer Abend mit [Band]") --
              eine einzelne Karte innerhalb einer hellen Section zaehlt
              nicht als "dunkle Buehnen-Content-Section" im Sinne von
              design-reference.md. */}
          <div className="bg-pl-stage rounded-2xl px-6 py-7 sm:px-8 sm:py-9">
            <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-2">
              Euer Abend mit {band.name}
            </p>
            <h2 className="text-lg font-bold text-pl-on-stage mb-3">
              Interesse?
            </h2>
            <p className="text-sm text-pl-on-stage-muted leading-relaxed mb-5">
              Deine Anfrage geht direkt an {band.name}.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <AnfrageButton
                name={band.name}
                slug={band.slug}
                anfrageEventTypes={band.anfrageEventTypes ?? []}
              />
              <MerkButton
                name={band.name}
                slug={band.slug}
                anfrageEventTypes={band.anfrageEventTypes ?? []}
                variant="dark"
              />
            </div>

            <p className="text-xs text-pl-on-stage-muted mt-5">
              Noch unsicher?{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline hover:text-pl-on-stage motion-safe:transition-colors"
              >
                Schreib mir kurz, wenn du Hilfe bei der Auswahl möchtest.
              </a>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
