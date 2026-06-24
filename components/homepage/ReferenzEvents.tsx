import Image from 'next/image';
import Link from 'next/link';
import { referenzEvents } from '@/lib/homepage/referenzEvents';

export default function ReferenzEvents() {
  return (
    <section className="bg-pl-stage relative overflow-hidden py-20 md:py-28 px-4 sm:px-6">
      <div className="absolute inset-0 bg-pl-gradient-spotlight pointer-events-none" />
      <div className="relative z-10 pl-container-shell">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-3">
            So klingt&apos;s, wenn alles passt
          </h2>
          <p className="text-pl-on-stage-muted text-lg">
            Ausgewählte Events, bei denen proudleut-Bands begeistert haben
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {referenzEvents.map((ev) => (
            <article
              key={ev.event}
              className="bg-pl-stage-elevated border border-pl-stage rounded-lg overflow-hidden hover:border-pl-accent-light/30 transition-colors"
            >
              <div className="relative aspect-[3/2]">
                <Image
                  src={ev.src}
                  alt={`${ev.band} beim ${ev.event}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  quality={75}
                />
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-pl-on-stage">{ev.event}</p>
                {'bandHref' in ev ? (
                  <Link
                    href={ev.bandHref as string}
                    className="text-sm text-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
                  >
                    {ev.band}
                  </Link>
                ) : (
                  <p className="text-sm text-pl-accent-light">{ev.band}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
