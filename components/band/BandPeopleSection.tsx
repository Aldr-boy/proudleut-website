import Image from 'next/image';
import Link from 'next/link';
import type { Band, BandPersonSummary } from '@/lib/types/band';
import { formatBandPersonCreditsLine } from '@/lib/bands/bandPersonCreditsLine';

type Props = {
  band: Band;
};

// Personenkarte innerhalb "Menschen hinter der Band" (Auftrag "Bandseiten:
// Musikerprofile auf den Personenkarten verlinken"): fuer jede Person mit
// gueltigem Slug (RLS garantiert bereits, dass eine solche Person auch ein
// oeffentliches /musiker/[slug]-Profil hat, siehe normalizeBandPeople)
// werden Name und ein separater "Musikerprofil ansehen"-Link angeboten --
// bewusst KEIN Klickbereich ueber die gesamte Karte mehr (Barrierefreiheit:
// zwei eigenstaendige, klar unterscheidbare Links statt einem grossen
// impliziten). Ohne Slug (defensiv, aktuell durch die Normalisierung nicht
// erreichbar) bleibt die Karte wie zuvor unverlinkt.
const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent rounded-sm';

function PersonCard({ person }: { person: BandPersonSummary }) {
  const hasProfile = Boolean(person.slug);
  const creditsLine = hasProfile ? formatBandPersonCreditsLine(person.credits) : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-pl-soft bg-white p-4">
      {person.imageUrl ? (
        <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0">
          <Image src={person.imageUrl} alt={person.name} fill className="object-cover" sizes="56px" />
        </div>
      ) : null}
      <div className="min-w-0">
        {hasProfile ? (
          <Link
            href={`/musiker/${person.slug}`}
            className={`block font-semibold text-pl-text truncate hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
          >
            {person.name}
          </Link>
        ) : (
          <p className="font-semibold text-pl-text truncate">{person.name}</p>
        )}
        {person.role && (
          <p className="text-sm text-pl-text-muted truncate">{person.role}</p>
        )}
        {person.instruments.length > 0 && (
          <p className="text-xs text-pl-text-hint truncate">
            {person.instruments.map((i) => i.name).join(' · ')}
          </p>
        )}
        {creditsLine && (
          <p className="text-xs text-pl-text-hint mt-1">{creditsLine}</p>
        )}
        {hasProfile && (
          <Link
            href={`/musiker/${person.slug}`}
            className={`inline-flex items-center gap-1 text-xs font-semibold text-pl-accent-deep hover:text-pl-accent motion-safe:transition-colors mt-2 ${FOCUS_RING}`}
          >
            Musikerprofil ansehen
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

// "Menschen hinter der Band" (Musiker-/Personenebene V1, Paket 4B). Nur
// oeffentlich sichtbare Personen (RLS-gefiltert, siehe
// lib/supabase/normalizeBand.ts::normalizeBandPeople) -- keine leere
// Section, wenn aktuell niemand sichtbar ist. pl-paper (warm, persoenlich)
// statt pl-canvas, entsprechend der Farbrolle fuer einladende Sections.
export function BandPeopleSection({ band }: Props) {
  const people = band.menschenHinterDerBand ?? [];
  if (people.length === 0) return null;

  return (
    <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
          Menschen hinter der Band
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-pl-text mb-8">
          Wer bei {band.name} spielt
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      </div>
    </section>
  );
}
