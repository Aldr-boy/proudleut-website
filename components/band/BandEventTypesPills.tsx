import Link from 'next/link';
import { findCategoryForEventTypeSlug } from './bandTagsCategoryMatch';

type Props = {
  eventTypes: string[];
  categorySlugs?: string[];
  variant?: 'light' | 'dark';
};

// "Spielt bei"-Pills, ausgelagert aus BandTagsSection.tsx (Auftrag
// "Profil-Demo /fuer-bands an neues Bandprofil angleichen"), damit sowohl
// die echte Bandseite (variant="light", unveraendertes Verhalten) als auch
// die kompakte Profil-Demo (variant="dark", auf der dunklen Demo-Karte)
// dieselbe Komponente statt duplizierter Pill-Logik nutzen.
const PILL_LIGHT = 'inline-flex items-center rounded-full border border-pl-soft px-3.5 py-1.5 text-sm font-medium text-pl-text-muted';
const PILL_LIGHT_INTERACTIVE =
  'hover:border-pl-accent hover:text-pl-accent motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent';

const PILL_DARK = 'inline-flex items-center rounded-full border border-white/20 px-3.5 py-1.5 text-sm font-medium text-pl-on-stage-muted';
const PILL_DARK_INTERACTIVE =
  'hover:border-pl-accent-light hover:text-pl-accent-light motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light';

export function BandEventTypesPills({ eventTypes, categorySlugs, variant = 'light' }: Props) {
  if (eventTypes.length === 0) return null;

  const pill = variant === 'dark' ? PILL_DARK : PILL_LIGHT;
  const interactive = variant === 'dark' ? PILL_DARK_INTERACTIVE : PILL_LIGHT_INTERACTIVE;

  return (
    <div className="flex flex-wrap gap-2">
      {eventTypes.map((et, i) => {
        const eventTypeSlug = categorySlugs?.[i];
        const category = eventTypeSlug ? findCategoryForEventTypeSlug(eventTypeSlug) : undefined;
        return category ? (
          <Link key={et} href={`/veranstaltung/${category.slug}`} className={`${pill} ${interactive}`}>
            {et}
          </Link>
        ) : (
          <span key={et} className={pill}>
            {et}
          </span>
        );
      })}
    </div>
  );
}
