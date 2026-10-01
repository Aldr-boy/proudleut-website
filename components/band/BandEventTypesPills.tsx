import Link from 'next/link';
import { findCategoryForEventTypeSlug } from './bandTagsCategoryMatch';
import { CollapsiblePills } from './CollapsiblePills';

type Props = {
  eventTypes: string[];
  categorySlugs?: string[];
  variant?: 'light' | 'dark';
  // Opt-in: mobil nur die ersten N Pills zeigen, der Rest ist per display:none
  // ausgeblendet (bleibt im HTML) und per "+N weitere" aufklappbar (siehe
  // CollapsiblePills.tsx). Ohne Angabe bleibt die Darstellung unveraendert
  // (z. B. Profil-Demo in /fuer-bands).
  collapseOnMobile?: number;
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

// Mindestanzahl verborgener Pills, ab der die mobile Kuerzung ueberhaupt greift.
const MIN_HIDDEN_ON_MOBILE = 3;

// Mobil verborgene Pills (Zustand siehe CollapsiblePills.tsx).
const PILL_COLLAPSED_ON_MOBILE = 'max-md:group-data-[expanded=false]:hidden';

export function BandEventTypesPills({ eventTypes, categorySlugs, variant = 'light', collapseOnMobile }: Props) {
  if (eventTypes.length === 0) return null;

  const pill = variant === 'dark' ? PILL_DARK : PILL_LIGHT;
  const interactive = variant === 'dark' ? PILL_DARK_INTERACTIVE : PILL_LIGHT_INTERACTIVE;
  const limit = collapseOnMobile ?? Infinity;
  // Gekuerzt wird nur, wenn mindestens MIN_HIDDEN_ON_MOBILE Pills verborgen
  // wuerden -- bei einer einzelnen oder zwei Pills spart "+N weitere" keinen
  // Platz (ab 9 Pills bei collapseOnMobile={6}).
  const collapsible = eventTypes.length - limit >= MIN_HIDDEN_ON_MOBILE;

  const pills = eventTypes.map((et, i) => {
    const eventTypeSlug = categorySlugs?.[i];
    const category = eventTypeSlug ? findCategoryForEventTypeSlug(eventTypeSlug) : undefined;
    const collapsed = collapsible && i >= limit ? ` ${PILL_COLLAPSED_ON_MOBILE}` : '';
    return category ? (
      <Link key={et} href={`/veranstaltung/${category.slug}`} className={`${pill} ${interactive}${collapsed}`}>
        {et}
      </Link>
    ) : (
      <span key={et} className={`${pill}${collapsed}`}>
        {et}
      </span>
    );
  });

  if (collapsible) {
    return <CollapsiblePills hiddenCount={eventTypes.length - limit}>{pills}</CollapsiblePills>;
  }

  return <div className="flex flex-wrap gap-2">{pills}</div>;
}
