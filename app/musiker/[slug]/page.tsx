import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getPersonBySlugFromSupabase } from '@/lib/people/publicQueries';
import { normalizePersonFromSupabase } from '@/lib/people/normalizePerson';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

// --- Inline helpers ---

function safeUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol === 'javascript:') return null;
    return u.href;
  } catch {
    return null;
  }
}

// --- Metadata ---

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data, error } = await getPersonBySlugFromSupabase(slug);
  if (error || !data) return {};
  const person = normalizePersonFromSupabase(data);
  return { title: person.name };
}

// --- Page ---

export default async function MusikerPage({ params }: PageProps) {
  const { slug } = await params;

  // Ausschliesslich RLS-gefilterter anon-Client (people_public_read:
  // status='active') -- eine draft/archivierte Person liefert 0 Zeilen,
  // .single() macht das zu einem error, der hier zu notFound() fuehrt.
  // Identisches Prinzip wie app/band/[slug]/page.tsx.
  const { data, error } = await getPersonBySlugFromSupabase(slug);
  if (error || !data) notFound();

  const person = normalizePersonFromSupabase(data);
  const websiteUrl = safeUrl(person.websiteUrl);

  // Rolle/musikalische Einordnung unter dem Namen: eindeutige, nicht-leere
  // Rollen aus allen sichtbaren Memberships, ohne Instrumente vermischt
  // (Auftrag "Paket 4B", Abschnitt "Rollen-/Instrument-Anzeige").
  const roles = [...new Set(person.memberships.map((m) => m.role).filter((r): r is string => !!r))];

  return (
    <article className="bg-pl-canvas">
      <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6 border-b border-pl-soft">
        <div className="max-w-[820px] mx-auto flex items-center gap-6">
          {person.imageUrl && (
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0">
              <Image src={person.imageUrl} alt={person.name} fill className="object-cover" sizes="128px" />
            </div>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-pl-text">{person.name}</h1>
            {roles.length > 0 && (
              <p className="text-pl-text-muted mt-1">{roles.join(' · ')}</p>
            )}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm text-pl-accent hover:underline"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </section>

      {person.bio && (
        <section className="bg-pl-canvas py-10 md:py-12 px-4 sm:px-6">
          <div className="max-w-[820px] mx-auto">
            <p className="text-pl-text leading-8 whitespace-pre-line">{person.bio}</p>
          </div>
        </section>
      )}

      <section className="bg-pl-canvas py-10 md:py-12 px-4 sm:px-6 border-t border-pl-soft">
        <div className="max-w-[820px] mx-auto">
          <h2 className="text-xl font-bold text-pl-text mb-6">Bands &amp; Projekte bei Proudleut</h2>

          {person.memberships.length === 0 ? (
            <p className="text-pl-text-muted">
              Aktuell keine öffentlich sichtbaren Bandzugehörigkeiten bei proudleut.
            </p>
          ) : (
            <div className="space-y-4">
              {person.memberships.map((m) => (
                <Link
                  key={m.bandId}
                  href={`/band/${m.bandSlug}`}
                  className="block rounded-xl border border-pl-soft p-4 hover:border-pl-medium motion-safe:transition-colors"
                >
                  <p className="font-semibold text-pl-text">{m.bandName}</p>
                  {m.role && <p className="text-sm text-pl-text-muted">{m.role}</p>}
                  {m.instruments.length > 0 && (
                    <p className="text-xs text-pl-text-hint mt-1">
                      {m.instruments.map((i) => i.name).join(' · ')}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
