import type { Band } from '../types/band';
import type { PublicPerson } from '../people/normalizePerson';
import { absoluteUrl, isAbsoluteHttpsUrl, SITE_URL } from './metadata.ts';

// Entfernt paarweise Markdown-Auszeichnung (**, __, *, _, Backticks) und Zeilenumbrüche
// aus dem Beschreibungstext. Unterstriche in Wörtern/Links bleiben unberührt.
function stripMarkdownForJsonLd(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '$1')
    .replace(/(?<!\w)__(?=\S)(.+?)(?<=\S)__(?!\w)/g, '$1')
    .replace(/\*(?=[^\s*])([^*]+?)(?<=[^\s*])\*/g, '$1')
    .replace(/(?<!\w)_(?=[^\s_])([^_]+?)(?<=[^\s_])_(?!\w)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

const DESCRIPTION_MAX_LENGTH = 300;

// Entfernt unsichtbare Formatierungszeichen (Zero-Width-Space/-Non-Joiner, Word-Joiner und
// verwandte unsichtbare Operatoren, Richtungsmarken, weiche Trennstriche, BOM). Ein
// Zero-Width-Joiner bleibt nur erhalten, wenn er zwei Emoji verbindet (gültige Emoji-Sequenz,
// z. B. 👨‍👩‍👧); jeder andere Joiner (z. B. hinter einem Satzzeichen) wird entfernt. Der
// Emoji-Präsentationsselektor U+FE0F wird nicht angefasst.
function removeInvisibleChars(text: string): string {
  return text
    .replace(/[­᠎​‌‎‏‪-‮⁠-⁤⁦-⁩﻿]/g, '')
    .replace(
      /(\p{Extended_Pictographic}[️\u{1F3FB}-\u{1F3FF}]*)‍(?=\p{Extended_Pictographic})|‍/gu,
      (match, emojiBefore?: string) => (emojiBefore ? match : ''),
    );
}

// Kürzt auf maximal DESCRIPTION_MAX_LENGTH Zeichen, nie mitten im Wort: passt der Text, bleibt er
// unverändert; sonst am letzten Satzende innerhalb der Grenze, ohne Satzende am letzten ganzen
// Wort mit angehängtem „…“ (zählt zur Grenze).
function truncateDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text;

  // Ein Satzende direkt an der Grenze zählt noch mit, wenn danach ein Leerzeichen folgt.
  const head = text.slice(0, DESCRIPTION_MAX_LENGTH + 1);
  let sentenceEnd = -1;
  for (const m of head.matchAll(/[.!?]["“”„'’)\]»]*(?=\s)/g)) {
    const end = m.index + m[0].length;
    if (end <= DESCRIPTION_MAX_LENGTH) sentenceEnd = end;
  }
  if (sentenceEnd > 0) return text.slice(0, sentenceEnd);

  const room = DESCRIPTION_MAX_LENGTH - 1;
  let cut = text.slice(0, room);
  if (!/\s/.test(text.charAt(room))) {
    const lastSpace = cut.search(/\s\S*$/);
    if (lastSpace <= 0) return '';
    cut = cut.slice(0, lastSpace);
  }
  return `${cut.replace(/[\s,;:–-]+$/, '')}…`;
}

function buildBandDescription(description: string): string {
  const prepared = removeInvisibleChars(stripMarkdownForJsonLd(description))
    .replace(/ {2,}/g, ' ')
    .trim();
  return truncateDescription(prepared);
}

/**
 * MusicGroup JSON-LD für ein Bandprofil generieren.
 *
 * Gibt nur Felder aus, für die sinnvolle Daten vorhanden sind.
 * Keine leeren Strings, keine Platzhalter.
 *
 * @id: identisch zur kanonischen Profil-URL, gleiches Muster wie beim
 * Musiker-Steckbrief (generatePersonJsonLd).
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

  // Genre: nur die Bandart (Anlässe gehören nicht in genre)
  const bandart = band.category ?? band.bandartNames[0];
  const genre = bandart ? [bandart] : [];

  const url = absoluteUrl(`/band/${band.slug}`);
  const description = band.description ? buildBandDescription(band.description) : undefined;

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
    '@id': url,
    name: band.name,
    url,
    ...(sameAs.length > 0 && { sameAs }),
    ...(genre.length > 0 && { genre }),
    ...(description && { description }),
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
 * keine gesonderte @id-Fragment-Konvention -- @id ist deshalb bewusst
 * identisch zur kanonischen Profil-URL, ohne ein neues Fragment zu
 * erfinden (generateBandJsonLd oben nutzt dasselbe Muster).
 *
 * jobTitle: uebernimmt exakt den bereits im Musiker-Hero berechneten und
 * sichtbar ausgegebenen Rollenwert (siehe app/musiker/[slug]/page.tsx,
 * `roles.join(' · ')`) -- keine eigene abweichende Rollenlogik. Wird der
 * Wert nicht uebergeben (Hero zeigt keine Rolle), bleibt jobTitle weg.
 *
 * memberOf: eine MusicGroup je oeffentlich sichtbarer Membership, mit
 * name/url aus den bestehenden Banddaten. Bewusst ohne @id (nur name/url,
 * unveraendert); die Band-@id steht auf der Bandseite selbst
 * (generateBandJsonLd oben) und ist identisch zu dieser url.
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
