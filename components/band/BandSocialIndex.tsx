import type { Band } from '@/lib/types/band';

type Props = { band: Band };

function formatCount(n: number): string {
  return n.toLocaleString('de-DE');
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type StatCard = {
  platform: string;
  count: number;
  label: string;
  icon: React.ReactNode;
};

export function BandSocialIndex({ band }: Props) {
  const stats = band.socialMediaStats;

  const cards: StatCard[] = (
    [
      stats?.igFollowers ? { platform: 'Instagram', count: stats.igFollowers, label: 'Follower', icon: <InstagramIcon /> } : null,
      stats?.fbFollowers ? { platform: 'Facebook', count: stats.fbFollowers, label: 'Follower', icon: <FacebookIcon /> } : null,
      stats?.ytSubscribers ? { platform: 'YouTube', count: stats.ytSubscribers, label: 'Abonnenten', icon: <YouTubeIcon /> } : null,
    ] as (StatCard | null)[]
  ).filter((c): c is StatCard => c !== null);

  if (cards.length === 0) return null;

  return (
    <section
      className="border-t py-12 md:py-14"
      style={{
        background: 'var(--pl-bg-stage)',
        borderColor: 'rgba(196,168,216,0.12)',
      }}
    >
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: 'rgba(196,168,216,0.5)' }}
        >
          Online-Präsenz
        </p>
        <h2
          className="text-xl md:text-2xl font-bold mb-1"
          style={{ color: 'var(--pl-text-on-stage)' }}
        >
          {band.name} online
        </h2>
        <p
          className="text-sm mb-8 max-w-xl"
          style={{ color: 'rgba(196,168,216,0.6)' }}
        >
          Follower- und Abo-Zahlen aus den öffentlichen Kanälen der Band.
        </p>

        <div className={`grid gap-3 ${cards.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {cards.map(({ platform, count, label, icon }) => (
            <div
              key={platform}
              className="flex items-center gap-4 rounded-xl px-5 py-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(196,168,216,0.12)',
              }}
            >
              <span style={{ color: 'rgba(196,168,216,0.55)' }}>
                {icon}
              </span>
              <div>
                <p
                  className="text-2xl font-bold leading-none"
                  style={{ color: 'var(--pl-text-on-stage)' }}
                >
                  {formatCount(count)}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: 'rgba(196,168,216,0.55)' }}
                >
                  {platform} {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
