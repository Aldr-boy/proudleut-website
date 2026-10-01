import type { Band } from '@/lib/types/band';
import { BandRow } from './BandRow';
import { isFollowerCountVisible, resolveFollowerStandDisplay } from '@/lib/socialLinks/followerCountVisibility';
import { shouldShowOwnListenersStand } from '@/lib/socialLinks/listenersStandDisplay';
import { formatFollowerCount, formatStandDate, formatStandMonthYear } from '@/lib/socialLinks/formatFollowerMetrics';

type Props = {
  band: Band;
  websiteUrl: string | null;
};

type FollowerMetric = { count: number; unit: string; checkedAt: string };
// Spotify "Monatliche Hörer*innen": eigene Kennzahl, bewusst NICHT als
// FollowerMetric modelliert -- sie fliesst nie in den gemeinsamen Stand der
// Follower ein und traegt immer ihr eigenes Erfassungsdatum (rollierender
// 28-Tage-Wert).
type ListenersMetric = { count: number; asOf: string };
type LinkItem = { label: string; href: string; metric?: FollowerMetric; listeners?: ListenersMetric };

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

// Zeile "Mehr von [Band]" im Raster (Prototyp E): Label links, Social-Pills
// rechts -- Label fett, Zahl und Einheit gedaempft, ohne Icons. Zahlen-,
// Stand- und Einordnungslogik sind unveraendert (nur linksbuendig). Ohne
// jeden Link entfaellt die Zeile komplett. Der Abschluss-CTA ("Interesse?")
// steht in BandCtaSection.tsx.
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

  // Gleiche 12-Monats-Sichtbarkeitsregel wie bei den Follower-Zahlen
  // (unveraendert wiederverwendet); Ergebnis bleibt getrennt von den
  // Follower-Metriken.
  const spotifyListenersRaw = band.spotifyMonthlyListeners;
  const spotifyListeners: ListenersMetric | undefined = isFollowerCountVisible(
    spotifyListenersRaw?.count,
    spotifyListenersRaw?.asOf,
  )
    ? { count: spotifyListenersRaw!.count as number, asOf: spotifyListenersRaw!.asOf as string }
    : undefined;

  const links: LinkItem[] = (
    [
      websiteUrl ? { label: 'Website', href: websiteUrl } : null,
      band.socialLinks.instagram ? { label: 'Instagram', href: band.socialLinks.instagram, metric: igMetric } : null,
      band.socialLinks.facebook ? { label: 'Facebook', href: band.socialLinks.facebook, metric: fbMetric } : null,
      band.socialLinks.youtube ? { label: 'YouTube', href: band.socialLinks.youtube, metric: ytMetric } : null,
      band.socialLinks.spotify ? { label: 'Spotify', href: band.socialLinks.spotify, listeners: spotifyListeners } : null,
    ] as (LinkItem | null)[]
  ).filter((l): l is LinkItem => l !== null);

  if (links.length === 0) return null;

  // Gemeinsamer vs. plattformweiser Pruefstand -- nur aus tatsaechlich
  // sichtbaren Metriken abgeleitet (Auftrag: "Nur Pruefstaende
  // tatsaechlich angezeigter Kennzahlen ausweisen").
  const standDisplay = resolveFollowerStandDisplay(
    links.filter((l) => l.metric).map((l) => ({ checkedAt: l.metric!.checkedAt })),
  );

  // Eigenes Spotify-Datum nur zeigen, wenn es nicht ohnehin im gemeinsamen
  // Stand (gleicher Monat) steckt -- reine Anzeigeregel, der gemeinsame
  // Follower-Stand bleibt davon unberuehrt.
  const showListenersOwnStand = spotifyListeners
    ? shouldShowOwnListenersStand(spotifyListeners.asOf, standDisplay)
    : false;

  // Einordnungssatz unter den Zahlen (Auftrag "Hinweis unter den Social-
  // Zahlen"): nur wenn mindestens eine Kennzahl tatsaechlich sichtbar ist
  // (Follower ODER Spotify-Hoerer*innen) -- reine Anzeigeregel auf Basis
  // der bereits berechneten, sichtbaren Metriken, keine eigene Sichtbar-
  // keits-/Standlogik.
  const hasVisibleMetric = links.some((l) => l.metric || l.listeners);

  return (
    // Gleiche Flaeche wie das Zeilenraster (Canvas); die Trennlinie steht
    // oberhalb der Zeile (die Zeile ist hier das erste Kind und bringt daher
    // selbst keine Linie mit).
    <section id="band-contact-section" className="bg-pl-canvas px-4 sm:px-6 pb-16 md:pb-20">
      <div className="pl-container-shell">
        <div className="border-t border-pl-soft pt-6 md:pt-7">
          <BandRow label={`Mehr von ${band.name}`} labelAs="h2" pillAligned>
            <ul className="flex flex-wrap gap-2.5">
              {links.map(({ label, href, metric, listeners }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={
                      metric
                        ? `${label}: ${formatFollowerCount(metric.count)} ${metric.unit}`
                        : listeners
                          ? `${label}: ${formatFollowerCount(listeners.count)} Monatliche Hörer*innen, Stand ${formatStandDate(listeners.asOf)}`
                          : undefined
                    }
                    className="inline-flex items-center gap-2 min-h-11 px-[18px] py-2 rounded-full bg-pl-elevated border border-pl-soft text-[15px] text-pl-text
                               hover:border-pl-accent motion-safe:transition-colors
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
                  >
                    <strong className="font-bold">{label}</strong>

                    {metric && (
                      <span className="inline-flex items-baseline gap-2 text-pl-text-muted">
                        <span>
                          {formatFollowerCount(metric.count)} {metric.unit}
                        </span>
                        {standDisplay.kind === 'per_platform' && (
                          <span className="text-[11px] text-pl-text-hint">
                            Stand: {formatStandDate(metric.checkedAt)}
                          </span>
                        )}
                      </span>
                    )}

                    {listeners && (
                      <span className="inline-flex items-baseline gap-2 text-pl-text-muted">
                        <span>
                          {formatFollowerCount(listeners.count)} <span>Monatliche Hörer*innen</span>
                        </span>
                        {showListenersOwnStand && (
                          <span className="text-[11px] text-pl-text-hint">
                            Stand: {formatStandDate(listeners.asOf)}
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

            {hasVisibleMetric && (
              <p className="mt-1 max-w-xl text-xs text-pl-text-hint">
                Die Zahlen zeigen die Online-Präsenz, nicht die Qualität einer Band oder wie gut sie zu eurem Fest passt.
              </p>
            )}
          </BandRow>
        </div>
      </div>
    </section>
  );
}
