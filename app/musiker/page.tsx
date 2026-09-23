import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPublicPeopleFromSupabase } from '@/lib/people/publicQueries';
import { normalizePersonFromSupabase, type PublicPerson } from '@/lib/people/normalizePerson';
import { derivePersonHeroRole } from '@/lib/people/personHeroRole';
import { formatBandPersonCreditsLine } from '@/lib/bands/bandPersonCreditsLine';
import { absoluteUrl } from '@/lib/seo/metadata';
import { BandFinderPageHead } from '@/components/bands/BandFinderPageHead';

// Gleicher ISR-Rhythmus wie die anderen statischen Uebersichtsseiten
// (siehe app/bands/page.tsx) -- kein force-dynamic wie bei der einzelnen
// Profilseite app/musiker/[slug]/page.tsx, da hier keine 404-Semantik pro
// Slug haengt, nur eine Liste.
export const revalidate = 300;

// Auftrag "Musikerübersicht /musiker nachschärfen": title exakt "Musiker
// hinter den Bands" (die bestehende globale Title-Vorlage aus
// app/layout.tsx bleibt unangetastet -- das bekannte Suffix-Thema ist
// ausdruecklich ein separater Schritt). Canonical/Sitemap-Eintrag bleiben
// unveraendert (absoluteUrl('/musiker')).
export const metadata: Metadata = {
  title: 'Musiker hinter den Bands',
  description:
    'Lerne Musiker kennen, die bei proudleut-Bands spielen, und entdecke, in welchen Bands du sie live erleben kannst.',
  alternates: { canonical: absoluteUrl('/musiker') },
};

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent rounded-sm';

// Personenkarte (Auftrag "Musikerübersicht /musiker nachschärfen", plus
// Nachschaerfung "Karten/Linktexte/Teaser" und "Pill-Darstellung statt
// Textzeilen"): Kartenrahmen weiterhin an components/BandCard.tsx
// angeglichen (rounded-xl/border-pl-soft/bg-pl-elevated/shadow-pl-photo,
// aspect-[3/2]-Bild, p-4, Name als text-lg font-semibold-Ueberschrift) --
// BandCard selbst bleibt dabei unveraendert, nur seine Masse/Optik werden
// hier uebernommen, da BandCard wegen des eigenen gestreckten Karten-Links
// (kein Klickbereich ueber die gesamte Karte hier gefordert) nicht direkt
// wiederverwendbar ist. Die Bandzugehoerigkeit erscheint als einmalige
// "Spielt bei"-Ueberschrift mit allen Memberships darunter als kompakte,
// gleich gestaltete Pills (bg-pl-accent-subtle/text-pl-accent-deep,
// identisch zur frueheren Pill-Optik) -- jede Pill verlinkt ausschliesslich
// ueber die bereits bestehenden, validierten Membership-Daten (m.bandSlug)
// auf das jeweilige Bandprofil, keine erfundenen Ziele. flex-wrap erlaubt
// langen Bandnamen den Zeilenumbruch. Inhalt/Reihenfolge sonst unveraendert:
// Foto, Name, Rolle, Referenzzeile (nur bei vorhandenen Credits,
// ausschliesslich ueber formatBandPersonCreditsLine, bleibt reiner
// Beschreibungstext und keine Pill), "Spielt bei"-Pills, "Mehr über
// [Name] →"-Link (identischer Wortlaut wie in
// components/band/BandPeopleSection.tsx). Bewusst KEIN Klickbereich ueber
// die gesamte Karte (identisches Prinzip wie dort): Foto, Name und der
// abschliessende Link sind drei eigenstaendige Links auf dasselbe Profil,
// Bandnamen eigene Links auf die jeweilige Bandseite -- Bandnamen duerfen
// umbrechen (kein truncate/line-clamp).
function MusikerCard({ person }: { person: PublicPerson }) {
  const role = derivePersonHeroRole(person);
  const creditsLine = formatBandPersonCreditsLine(person.credits);
  const profileHref = `/musiker/${person.slug}`;

  return (
    <div className="w-full sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] flex flex-col rounded-xl overflow-hidden bg-pl-elevated border border-pl-soft shadow-pl-photo">
      {/* Foto: einheitlicher Querformat-Ausschnitt (aspect-[3/2], identisch
          zu BandCard.tsx), object-position: center 30% fuer alle Personen
          gleich -- bewusst NICHT ueber lib/people/heroImagePresentation.ts
          (das bleibt der Profilseiten-Hero vorbehalten, andere Bildflaeche/
          anderes Seitenverhaeltnis). Ohne Bild bleibt dieselbe Flaeche als
          neutrale, einfarbige bg-pl-elevated-Flaeche stehen -- keine
          Platzhaltergrafik, kein Icon (siehe Abschlussbericht, B-Finding).
          aria-label nur ohne Bild noetig, sonst liefert das alt-Attribut
          den Linknamen. */}
      <Link
        href={profileHref}
        aria-label={person.imageUrl ? undefined : person.name}
        className={`relative block w-full aspect-[3/2] shrink-0 bg-pl-elevated ${FOCUS_RING}`}
      >
        {person.imageUrl && (
          <Image
            src={person.imageUrl}
            alt={person.name}
            fill
            className="object-cover"
            style={{ objectPosition: 'center 30%' }}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-pl-text font-semibold text-lg leading-snug mb-1">
          <Link
            href={profileHref}
            className={`hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
          >
            {person.name}
          </Link>
        </h3>
        {role && <p className="text-pl-text-muted text-sm mb-2">{role}</p>}
        {creditsLine && <p className="text-pl-text-hint text-xs mb-2">{creditsLine}</p>}

        {person.memberships.length > 0 && (
          <div className="mt-1">
            <p className="text-[11px] font-semibold text-pl-text-hint uppercase tracking-wider mb-1.5">
              Spielt bei
            </p>
            <div className="flex flex-wrap gap-1.5">
              {person.memberships.map((m) => (
                <Link
                  key={m.bandId}
                  href={`/band/${m.bandSlug}`}
                  className={`inline-flex items-center rounded-full bg-pl-accent-subtle px-2 py-0.5 text-xs font-medium text-pl-accent-deep hover:opacity-80 motion-safe:transition-opacity ${FOCUS_RING}`}
                >
                  {m.bandName}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link
          href={profileHref}
          className={`mt-auto pt-3 inline-flex items-center gap-1 text-sm font-semibold text-pl-accent-deep hover:text-pl-accent motion-safe:transition-colors ${FOCUS_RING}`}
        >
          Mehr über {person.name}
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
      {/* Seitenkopf im Muster von app/bands/page.tsx: gleiche, unveraenderte
          Komponente (components/bands/BandFinderPageHead.tsx) direkt
          wiederverwendet statt nachgebaut -- heller bg-pl-paper-Hintergrund,
          linksbuendig, identische H1-Groesse/-Gewichtung, Abstaende und
          Containerbreite wie auf /bands. Die vormalige dunkle, zentrierte
          Buehnenflaeche entfaellt. */}
      <section className="bg-pl-canvas pb-16 px-0">
        <BandFinderPageHead
          h1="Musiker hinter den Bands"
          intro="Bandname und Bilder erzählen nur einen Teil. Die Menschen hinter der Musik überraschen oft – mit ihrer Erfahrung, ihrem Können und den Bühnen, auf denen sie bereits standen."
        />

        {/* Profilkarten: flex-wrap + justify-center statt bedingter
            Spaltenlogik nach Personenzahl -- bei 1 Karte steht sie allein
            zentriert, bei 2 stehen sie nebeneinander zentriert, bei 3 fuellen
            sie exakt eine Reihe. Jede Kartenbreite wird ueber calc() aus
            derselben Formel berechnet, die ein CSS-Grid mit 1/2/3 Spalten
            (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6, identisch zu
            components/bands/BandExplorer.tsx) ohnehin erzeugen wuerde --
            dadurch sind es bei vollem Raster (3 Karten auf Desktop, 2 auf
            Tablet) pixelgleich dieselben Kartenbreiten wie auf /bands, und
            bei weniger Karten als Spalten bleibt die Breite unveraendert
            (keine Verbreiterung), die Gruppe steht nur zentriert. Flex-
            Standardverhalten (align-items: stretch) gleicht Karten innerhalb
            einer Reihe automatisch in der Hoehe an, ohne eine Mindesthoehe
            zu erzwingen. */}
        <div className="pl-container-shell px-4 sm:px-6 pt-8 md:pt-10">
          <div className="flex flex-wrap justify-center gap-6">
            {people.map((person) => (
              <MusikerCard key={person.id} person={person} />
            ))}
          </div>

          {/* Abschlussteaser: ein Satz, kein neuer Button/Formular -- nur
              "Melde dich gerne" verlinkt auf /kontakt, im bestehenden
              ruhigen Textlink-Stil (identische Klassen wie der "Schreib uns
              kurz"-Link in components/bands/BandExplorer.tsx). Bleibt
              innerhalb derselben Section, keine neue Flaeche. */}
          <p className="text-pl-text-muted text-sm text-center mt-12">
            Deine Band hat ein Profil auf proudleut und du möchtest dich hier ebenfalls zeigen?{' '}
            <Link
              href="/kontakt"
              className={`text-pl-accent hover:opacity-80 motion-safe:transition-opacity underline underline-offset-2 ${FOCUS_RING}`}
            >
              Melde dich gerne
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
