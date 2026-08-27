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

// Anzeigetext fuer die Hauptwebsite im Block "Mehr von …" -- Hostname
// ohne Protokoll/www, entsprechend dem bestaetigten Hi-Fi ("dominikpalmer.de
// ↗" statt des bisherigen generischen Worts "Website").
function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
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
  const firstName = person.name.split(' ')[0] || person.name;

  // Zusaetzliche Links (person_links) -- dieselbe safeUrl()-Pruefung wie
  // bei websiteUrl, keine neue URL-Sicherheitsschicht.
  const additionalLinks = person.links
    .map((link) => ({ id: link.id, label: link.label, href: safeUrl(link.url) }))
    .filter((link): link is { id: string; label: string; href: string } => link.href !== null);

  // Rolle unter dem Namen: eindeutige, nicht-leere Rollen aus allen
  // sichtbaren Memberships, ohne Instrumente vermischt. Im Hero bewusst
  // nur die primaere Rolle vor einem "&" (z. B. "Bassist" statt
  // "Bassist & Bandleader") -- reine Hero-Vereinfachung, die einzelne
  // Membership (m.role) in der Proudleut-Bandzugehoerigkeit-Card bleibt
  // davon unberuehrt.
  const roles = [
    ...new Set(
      person.memberships
        .map((m) => m.role)
        .filter((r): r is string => !!r)
        .map((r) => r.split(' & ')[0]),
    ),
  ];

  const hasMehrVonSection = websiteUrl !== null || additionalLinks.length > 0;

  return (
    <article className="bg-pl-canvas">
      {/* 1 — Hero */}
      <section className="bg-pl-paper border-b border-pl-soft px-4 sm:px-6">
        <div className="pl-container-shell py-10 md:py-16">
          {/* Mobile: Foto oben (4:5, gedeckelt), Name direkt danach -- Name
              soll noch im ersten Viewport sichtbar bleiben, siehe Auftrag
              "Musikerseite-Redesign V1", Abschnitt 1 (Hero). */}
          <div className="md:hidden">
            {person.imageUrl && (
              <div className="relative w-full aspect-[4/5] max-h-[48vh] rounded-2xl overflow-hidden">
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
            )}
            <h1 className="text-4xl font-bold text-pl-text mt-6 leading-tight">{person.name}</h1>
            {roles.length > 0 && <p className="text-lg text-pl-text-muted mt-2">{roles.join(' · ')}</p>}
          </div>

          {/* Desktop: asymmetrische Bild/Text-Komposition, unten buendig */}
          <div className={person.imageUrl ? 'hidden md:grid md:grid-cols-[minmax(0,440px)_1fr] md:gap-16 md:items-end' : 'hidden md:block'}>
            {person.imageUrl && (
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden">
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="440px"
                />
              </div>
            )}
            <div className="pb-2">
              <h1 className="text-5xl lg:text-6xl font-bold text-pl-text leading-tight">{person.name}</h1>
              {roles.length > 0 && <p className="text-xl text-pl-text-muted mt-4">{roles.join(' · ')}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* 2 — Zusammengearbeitet mit */}
      {person.credits.length > 0 && (
        <section className="bg-pl-canvas py-14 md:py-20 px-4 sm:px-6 border-b border-pl-soft">
          <div className="pl-container-shell max-w-[760px]">
            <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider">
              Zusammengearbeitet mit
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-3 mt-6">
              {person.credits.map((credit) => (
                <p key={credit.id} className="text-xl md:text-[1.4rem] font-medium text-pl-text leading-snug">
                  {credit.name}
                </p>
              ))}
            </div>
            <p className="text-sm text-pl-text-hint mt-6">u. v. m.</p>
          </div>
        </section>
      )}

      {/* 3 — Über [Vorname] */}
      {person.bio && (
        <section className="bg-pl-paper py-14 md:py-20 px-4 sm:px-6 border-b border-pl-soft">
          <div className="pl-container-shell max-w-[760px]">
            <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-6">
              Über {firstName}
            </h2>
            <p className="text-pl-text leading-8 text-lg whitespace-pre-line">{person.bio}</p>
          </div>
        </section>
      )}

      {/* 4 — Bei Proudleut */}
      <section className="bg-pl-canvas py-14 md:py-20 px-4 sm:px-6 border-b border-pl-soft">
        <div className="pl-container-shell max-w-[760px]">
          <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-6">
            Bei Proudleut
          </h2>

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
                  className="flex items-center gap-5 rounded-xl border border-pl-soft bg-pl-elevated p-4 hover:border-pl-medium motion-safe:transition-colors"
                >
                  {m.bandImage && (
                    <div className="relative w-24 h-[72px] shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={m.bandImage.url}
                        alt={m.bandImage.alt || m.bandName}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg text-pl-text">{m.bandName}</p>
                    {(m.role || m.instruments.length > 0) && (
                      <p className="text-sm text-pl-text-muted mt-0.5">
                        {[m.role, m.instruments.map((i) => i.name).join(', ')].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="text-pl-text-hint text-2xl shrink-0" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5 — Mehr von [Vorname] (externe Vertiefung bewusst zuletzt) */}
      {hasMehrVonSection && (
        <section className="bg-pl-canvas py-14 md:py-20 px-4 sm:px-6">
          <div className="pl-container-shell max-w-[760px]">
            <h2 className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-4">
              Mehr von {firstName}
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-pl-text hover:text-pl-accent motion-safe:transition-colors"
                >
                  {displayHost(websiteUrl)} ↗
                </a>
              )}
              {additionalLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold text-pl-text hover:text-pl-accent motion-safe:transition-colors"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
