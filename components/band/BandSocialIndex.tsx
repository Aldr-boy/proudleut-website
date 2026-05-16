import type { Band } from '@/lib/types/band';

type Props = { band: Band };

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    if (k % 1 === 0) return `${k}K`;
    return `${k.toFixed(1).replace('.', ',')}K`;
  }
  return n.toLocaleString('de-DE');
}

type StatCard = { platform: string; count: number; unit: string };

export function BandSocialIndex({ band }: Props) {
  const stats = band.socialMediaStats;

  const cards: StatCard[] = [
    stats?.igFollowers ? { platform: 'Instagram', count: stats.igFollowers, unit: 'Follower' } : null,
    stats?.fbFollowers ? { platform: 'Facebook', count: stats.fbFollowers, unit: 'Follower' } : null,
    stats?.ytSubscribers ? { platform: 'YouTube', count: stats.ytSubscribers, unit: 'Abonnenten' } : null,
  ].filter((c): c is StatCard => c !== null);

  if (cards.length === 0) return null;

  const totalCount = cards.reduce((sum, c) => sum + c.count, 0);
  const showAggregated = cards.length > 1;

  return (
    <section className="bg-pl-canvas border-t border-pl-soft py-12 md:py-16">
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
          Online sichtbar
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-2">
          {showAggregated ? (
            <>
              <span className="text-3xl md:text-4xl">{formatCount(totalCount)}</span>
              <span className="block text-base font-normal text-pl-text-muted mt-1">
                Sichtbare Präsenz — auf {cards.length} Plattformen
              </span>
            </>
          ) : (
            cards[0].platform
          )}
        </h2>
        <p className="text-sm text-pl-text-muted mb-8 max-w-xl">
          Ein Eindruck davon, wo diese Band auch außerhalb von proudleut aktiv ist.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map(({ platform, count, unit }) => (
            <div
              key={platform}
              className="bg-pl-elevated border border-pl-soft rounded-xl px-5 py-4"
            >
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
                {platform}
              </p>
              <p className="text-2xl font-bold text-pl-text leading-none">
                {formatCount(count)}
              </p>
              <p className="text-xs text-pl-text-muted mt-1">{unit}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
