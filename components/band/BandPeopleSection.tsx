import Image from 'next/image';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';

type Props = {
  band: Band;
};

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
            <Link
              key={person.id}
              href={`/musiker/${person.slug}`}
              className="flex items-center gap-4 rounded-xl border border-pl-soft bg-white p-4 hover:border-pl-medium motion-safe:transition-colors"
            >
              {person.imageUrl ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0">
                  <Image src={person.imageUrl} alt={person.name} fill className="object-cover" sizes="56px" />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="font-semibold text-pl-text truncate">{person.name}</p>
                {person.role && (
                  <p className="text-sm text-pl-text-muted truncate">{person.role}</p>
                )}
                {person.instruments.length > 0 && (
                  <p className="text-xs text-pl-text-hint truncate">
                    {person.instruments.map((i) => i.name).join(' · ')}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
