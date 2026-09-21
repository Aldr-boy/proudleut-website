import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPublicPeopleFromSupabase } from '@/lib/people/publicQueries';
import { normalizePersonFromSupabase, type PublicPerson } from '@/lib/people/normalizePerson';
import { derivePersonHeroRole } from '@/lib/people/personHeroRole';
import { formatBandPersonCreditsLine } from '@/lib/bands/bandPersonCreditsLine';
import { absoluteUrl } from '@/lib/seo/metadata';

// Gleicher ISR-Rhythmus wie die anderen statischen Uebersichtsseiten
// (siehe app/bands/page.tsx) -- kein force-dynamic wie bei der einzelnen
// Profilseite app/musiker/[slug]/page.tsx, da hier keine 404-Semantik pro
// Slug haengt, nur eine Liste.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Die Menschen hinter den Bands – proudleut',
  description:
    'Lerne Musiker kennen, die in proudleut-Bands spielen. Entdecke ihre Profile und die Bands, in denen du sie live erleben kannst.',
  alternates: { canonical: absoluteUrl('/musiker') },
};

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent rounded-sm';

// Personenkarte (Auftrag "Musikerübersicht unter /musiker anlegen"): feste
// Grundstruktur fuer alle Personen, optionale Inhalte (Rolle, Referenzzeile,
// Bands) nur bei tatsaechlich vorhandenen Daten -- keine erzwungene
// Kartenhoehe, keine kuenstlichen Leerzeilen. Bewusst KEIN Klickbereich
// ueber die gesamte Karte (identisches Prinzip wie components/band/
// BandPeopleSection.tsx): Foto, Name und "Musikerprofil ansehen" sind drei
// eigenstaendige Links auf dasselbe Profil, Bandnamen eigene Links auf die
// jeweilige Bandseite.
function MusikerCard({ person }: { person: PublicPerson }) {
  const role = derivePersonHeroRole(person);
  const creditsLine = formatBandPersonCreditsLine(person.credits);
  const profileHref = `/musiker/${person.slug}`;

  return (
    <div className="w-full sm:w-[420px] flex flex-col rounded-2xl border border-pl-soft bg-white overflow-hidden">
      {/* Foto: einheitlicher Hochformat-Ausschnitt (aspect-[4/5]),
          object-position: center 30% fuer alle Personen gleich -- bewusst
          NICHT ueber lib/people/heroImagePresentation.ts (das bleibt der
          Profilseiten-Hero vorbehalten, andere Bildflaeche/anderes
          Seitenverhaeltnis). Ohne Bild bleibt dieselbe Flaeche als neutrale,
          einfarbige bg-pl-elevated-Flaeche stehen -- keine Platzhaltergrafik,
          kein Icon (siehe Abschlussbericht, B-Finding). aria-label nur ohne
          Bild noetig, sonst liefert das alt-Attribut den Linknamen. */}
      <Link
        href={profileHref}
        aria-label={person.imageUrl ? undefined : person.name}
        className={`relative block w-full aspect-[4/5] shrink-0 bg-pl-elevated ${FOCUS_RING}`}
      >
        {person.imageUrl && (
          <Image
            src={person.imageUrl}
            alt={person.name}
            fill
            className="object-cover"
            style={{ objectPosition: 'center 30%' }}
            sizes="(min-width: 640px) 420px, 100vw"
          />
        )}
      </Link>

      <div className="p-6 flex flex-col flex-1">
        <Link
          href={profileHref}
          className={`font-bold text-xl text-pl-text hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
        >
          {person.name}
        </Link>
        {role && <p className="text-sm text-pl-text-muted mt-1">{role}</p>}
        {creditsLine && <p className="text-xs text-pl-text-hint mt-3">{creditsLine}</p>}

        {person.memberships.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold text-pl-text-hint uppercase tracking-wider mb-1.5">
              Spielt bei
            </p>
            <div className="flex flex-wrap gap-2">
              {person.memberships.map((m) => (
                <Link
                  key={m.bandId}
                  href={`/band/${m.bandSlug}`}
                  className={`inline-flex items-center rounded-full border border-pl-soft bg-pl-elevated px-3 py-1 text-xs font-semibold text-pl-text hover:border-pl-medium hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
                >
                  {m.bandName}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href={profileHref}
          className={`mt-auto pt-5 inline-flex items-center gap-1 text-sm font-semibold text-pl-accent-deep hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
        >
          Musikerprofil ansehen
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

export default async function MusikerUebersichtPage() {
  // Dieselbe RLS-gefilterte, oeffentliche Personenquelle wie die einzelne
  // Profilseite (getPersonBySlugFromSupabase) -- hier nur als Liste statt
  // Einzel-Lookup, siehe lib/people/publicQueries.ts::
  // getAllPublicPeopleFromSupabase. Keine abweichende Sichtbarkeitslogik.
  const { data, error } = await getAllPublicPeopleFromSupabase();
  if (error || !data || data.length === 0) notFound();

  // Alphabetisch nach dem vollstaendigen gespeicherten Namen, deutsche
  // Sortierung -- keine Nachnamen-Zerlegung, keine Bewertung, keine
  // manuelle Reihenfolge.
  const people = data
    .map(normalizePersonFromSupabase)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <main>
      {/* Seitenkopf nach dem Muster bestehender statischer Seiten (siehe
          app/kontakt/page.tsx): Buehnenflaeche, zentrierter Titel + Intro. */}
      <section className="bg-pl-stage py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-pl-on-stage mb-6">
            Die Menschen hinter den Bands
          </h1>
          <p className="text-pl-on-stage-muted text-lg leading-relaxed">
            Manche Musiker spielen in mehreren Bands und bringen Erfahrung aus ganz
            unterschiedlichen Projekten mit. Hier lernst du einige von ihnen kennen und siehst,
            bei welchen proudleut-Bands sie auf der Bühne stehen.
          </p>
        </div>
      </section>

      {/* Profilkarten: flex-wrap + justify-center statt bedingter
          Spaltenlogik nach Personenzahl -- bei 1 Karte steht sie allein
          zentriert, bei 2 stehen sie nebeneinander zentriert, bei 3 wandert
          die dritte automatisch in eine eigene, zentrierte zweite Reihe
          (feste Kartenbreite sm:w-[420px] sorgt dafuer, dass innerhalb der
          1140px-Containerbreite maximal zwei Karten pro Reihe passen).
          Flex-Standardverhalten (align-items: stretch) gleicht Karten
          innerhalb einer Reihe automatisch in der Hoehe an, ohne eine
          Mindesthoehe zu erzwingen. */}
      <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="flex flex-wrap justify-center gap-8 md:gap-10">
            {people.map((person) => (
              <MusikerCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
