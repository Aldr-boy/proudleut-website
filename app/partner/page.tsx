import Image from 'next/image';
import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo/metadata';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';

export const metadata: Metadata = {
  title: 'Partner',
  description: 'proudleut arbeitet mit dem Kneipenkarussell zusammen.',
  alternates: { canonical: absoluteUrl('/partner') },
};

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent rounded-sm';

type Partner = {
  name: string;
  text: string;
  href: string;
  logoSrc: string;
  logoAlt: string;
};

// Weitere Partner hier ergänzen: jeder Eintrag erscheint als eigener
// Partnerblock untereinander.
const PARTNERS: Partner[] = [
  {
    name: 'Kneipenkarussell',
    text: 'Kneipenwanderung durch Neumarkt mit Live-Bands in vielen Lokalen an einem Abend.',
    href: 'https://kneipenkarussell.de',
    logoSrc: '/images/partner/kneipenkarussell-logo.svg',
    logoAlt: 'Logo Kneipenkarussell',
  },
];

// Seitenkopf wie auf /musiker (BandFinderPageHead, bg-pl-canvas-Section).
// Der Partnerblock ist bewusst kein Kartenraster, sondern ein großzügiger,
// einzelner Block (Kartenrahmen wie auf /musiker: rounded-xl, border-pl-soft,
// bg-pl-elevated, shadow-pl-photo), der auch allein ausgewogen wirkt.
export default function PartnerPage() {
  return (
    <main>
      <section className="bg-pl-canvas pb-16 px-0">
        <BandFinderPageHead
          h1="Partner"
          intro="proudleut arbeitet mit dem Kneipenkarussell zusammen."
        />

        <div className="pl-container-shell px-4 sm:px-6 pt-8 md:pt-10 flex flex-col gap-6">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="rounded-xl bg-pl-elevated border border-pl-soft shadow-pl-photo p-6 sm:p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-14"
            >
              <div className="w-full max-w-xs md:max-w-none md:w-5/12 shrink-0">
                <Image
                  src={partner.logoSrc}
                  alt={partner.logoAlt}
                  width={3392}
                  height={2174}
                  unoptimized
                  className="w-full h-auto"
                />
              </div>

              <div className="flex flex-col items-start text-left">
                <h2 className="text-pl-text font-bold text-2xl md:text-3xl leading-tight mb-3">
                  {partner.name}
                </h2>
                <p className="text-pl-text-muted text-base leading-relaxed mb-6 max-w-md">
                  {partner.text}
                </p>
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-base font-semibold text-pl-accent-deep hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
                >
                  Zur Website
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
