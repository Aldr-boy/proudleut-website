import type { Band } from '../types/band';
import type { PublicPerson } from '../people/normalizePerson';
import { absoluteUrl, isAbsoluteHttpsUrl, SITE_URL } from './metadata.ts';

/**
 * MusicGroup JSON-LD für ein Bandprofil generieren.
 *
 * Gibt nur Felder aus, für die sinnvolle Daten vorhanden sind.
 * Keine leeren Strings, keine Platzhalter.
 *
 * Hinweis: Referenz-Events werden im Durchstich NICHT als MusicEvent
 * ins JSON-LD aufgenommen. Ein bloßes Jahr (z. B. "2024") ist kein
 * konkretes Datum im Sinne von Schema.org. MusicEvent erst in Phase 3
 * einbauen, wenn ein echtes startDate (mindestens YYYY-MM-DD) vorliegt.
 * Bis dahin: Referenz-Events nur im UI anzeigen.
 */
export function generateBandJsonLd(band: Band) {
  // sameAs: Website + Social Links sammeln
  const sameAs = [
    band.websiteUrl,
    band.socialLinks.facebook,
    band.socialLinks.instagram,
    band.socialLinks.spotify,
    band.socialLinks.youtube,
  ].filter(Boolean);

  // Genre aus Kategorie und Eventtypen
  const genre = [band.category, ...band.eventTypes].filter(Boolean);

  // Location nur wenn sinnvolle Daten vorhanden
  const hasLocation = band.location.city || band.location.state;
  const location = hasLocation
    ? {
        '@type': 'Place' as const,
        address: {
          '@type': 'PostalAddress' as const,
          ...(band.location.city && { addressLocality: band.location.city }),
          ...(band.location.state && { addressRegion: band.location.state }),
          ...(band.location.country && { addressCountry: band.location.country }),
        },
      }
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: band.name,
    url: `https://proudleut.com/band/${band.slug}`,
    ...(sameAs.length > 0 && { sameAs }),
    ...(genre.length > 0 && { genre }),
    ...(band.description && { description: band.description.slice(0, 300) }),
    ...(band.heroImage && { image: band.heroImage.url }),
    ...(location && { location }),
  };
}

/**
 * Person JSON-LD für ein oeffentliches Musikerprofil generieren (Auftrag
 * "Person-Schema für alle öffentlichen Musikerprofile ergänzen").
 *
 * Arbeitet ausschliesslich mit bereits normalisierten, oeffentlichen
 * Personendaten (PublicPerson, siehe lib/people/normalizePerson.ts) -- die
 * RLS-Filterung (nur aktive Person, nur oeffentliche Memberships/Links) ist
 * bereits auf Datenebene erfolgt, hier wird nichts zusaetzlich nachgefiltert
 * ausser der schema.org-spezifischen URL-/Protokoll-Validierung unten.
 *
 * @id/url: nutzen dieselbe absolute, zentrale URL-Quelle (absoluteUrl aus
 * lib/seo/metadata.ts) wie das bestehende Canonical-/Metadata-Verhalten der
 * Musikerseite -- keine hartkodierte Domain. Es gibt im Projekt aktuell
 * keine gesonderte @id-Fragment-Konvention (auch generateBandJsonLd oben
 * setzt keine @id) -- @id ist deshalb bewusst identisch zur kanonischen
 * Profil-URL, ohne ein neues Fragment zu erfinden.
 *
 * jobTitle: uebernimmt exakt den bereits im Musiker-Hero berechneten und
 * sichtbar ausgegebenen Rollenwert (siehe app/musiker/[slug]/page.tsx,
 * `roles.join(' · ')`) -- keine eigene abweichende Rollenlogik. Wird der
 * Wert nicht uebergeben (Hero zeigt keine Rolle), bleibt jobTitle weg.
 *
 * memberOf: eine MusicGroup je oeffentlich sichtbarer Membership, mit
 * name/url aus den bestehenden Banddaten. Bewusst KEINE @id -- die
 * bestehenden Bandseiten setzen selbst keine (siehe generateBandJsonLd
 * oben), also wird hier auch keine neue erfunden.
 *
 * sameAs: Hauptwebsite + zusaetzliche oeffentliche Links, aber nur gueltige
 * absolute https-URLs, keine proudleut-internen URLs, keine Duplikate.
 */
export function generatePersonJsonLd(
  person: PublicPerson,
  options: { heroRole?: string } = {},
) {
  const url = absoluteUrl(`/musiker/${person.slug}`);
  const siteOrigin = new URL(SITE_URL).origin;

  const sameAsCandidates = [person.websiteUrl, ...person.links.map((l) => l.url)];
  const sameAs = Array.from(
    new Set(
      sameAsCandidates.filter((candidate): candidate is string => {
        if (!isAbsoluteHttpsUrl(candidate)) return false;
        return new URL(candidate).origin !== siteOrigin;
      }),
    ),
  );

  const memberOf = person.memberships.map((m) => ({
    '@type': 'MusicGroup' as const,
    name: m.bandName,
    url: absoluteUrl(`/band/${m.bandSlug}`),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': url,
    name: person.name,
    url,
    ...(isAbsoluteHttpsUrl(person.imageUrl) && { image: person.imageUrl }),
    ...(person.bio && { description: person.bio }),
    ...(options.heroRole && { jobTitle: options.heroRole }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(memberOf.length > 0 && { memberOf }),
  };
}

/**
 * Sicheres JSON.stringify fuer die Ausgabe via dangerouslySetInnerHTML in
 * einem <script type="application/ld+json">-Tag. `<`, `>` und `&` werden zu
 * Unicode-Escapes entschaerft -- das reicht aus, um ein vorzeitiges
 * `</script>` (z. B. durch einen Personennamen/Bio-Text mit diesem
 * Teilstring) zu verhindern, ohne die JSON-Semantik zu veraendern (Browser
 * dekodieren < etc. beim JSON.parse wieder zum Originalzeichen).
 */
export function safeJsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
