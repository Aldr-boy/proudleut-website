import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generatePersonJsonLd, safeJsonLdString } from './jsonLd.ts'
import type { PublicPerson } from '../people/normalizePerson.ts'

// Minimale, vollstaendig getypte PublicPerson-Fixture -- alle Tests
// ueberschreiben nur die fuer sie relevanten Felder, damit jeder Test
// unabhaengig vom vollen Schema lesbar bleibt.
function person(overrides: Partial<PublicPerson> = {}): PublicPerson {
  return {
    id: 'p1',
    name: 'Testperson',
    slug: 'testperson',
    memberships: [],
    links: [],
    credits: [],
    ...overrides,
  }
}

test('generatePersonJsonLd: Person ohne Bild und ohne externe Links -- keine image/sameAs-Felder, url/@id ueber absoluteUrl gebaut', () => {
  const result = generatePersonJsonLd(person())
  assert.equal(result['@context'], 'https://schema.org')
  assert.equal(result['@type'], 'Person')
  assert.equal(result.name, 'Testperson')
  assert.equal(result.url, 'https://proudleut.com/musiker/testperson')
  assert.equal(result['@id'], result.url, '@id folgt mangels eigener Fragment-Konvention der kanonischen URL')
  assert.ok(!('image' in result))
  assert.ok(!('sameAs' in result))
  assert.ok(!('memberOf' in result))
  assert.ok(!('jobTitle' in result))
  assert.ok(!('description' in result))
})

test('generatePersonJsonLd: Person mit Bild (https), Hauptwebsite und zusaetzlichem oeffentlichen Link -- image + sameAs korrekt befuellt', () => {
  const result = generatePersonJsonLd(
    person({
      imageUrl: 'https://cdn.example.com/dominik.png',
      websiteUrl: 'https://dominikpalmer.de',
      links: [{ id: 'l1', label: 'Instagram', url: 'https://instagram.com/dominikpalmer' }],
    }),
  )
  assert.equal(result.image, 'https://cdn.example.com/dominik.png')
  assert.deepEqual(result.sameAs, ['https://dominikpalmer.de', 'https://instagram.com/dominikpalmer'])
})

test('generatePersonJsonLd: Person mit mehreren oeffentlichen Memberships -- memberOf enthaelt alle als MusicGroup', () => {
  const result = generatePersonJsonLd(
    person({
      memberships: [
        { bandId: 'b1', bandName: 'More Candy', bandSlug: 'more-candy', instruments: [] },
        { bandId: 'b2', bandName: "Smooth'n'Groove", bandSlug: 'smooth-n-groove', instruments: [] },
      ],
    }),
  )
  assert.deepEqual(result.memberOf, [
    { '@type': 'MusicGroup', name: 'More Candy', url: 'https://proudleut.com/band/more-candy' },
    { '@type': 'MusicGroup', name: "Smooth'n'Groove", url: 'https://proudleut.com/band/smooth-n-groove' },
  ])
})

test('generatePersonJsonLd: private Memberships werden nicht ausgegeben (nur bereits RLS-gefilterte person.memberships fliessen ein)', () => {
  // person.memberships kommt aus normalizePersonFromSupabase bereits RLS-
  // gefiltert (nur oeffentliche Memberships). generatePersonJsonLd fuegt
  // KEINE weitere Datenquelle hinzu -- eine leere Membership-Liste ergibt
  // deshalb kein memberOf-Feld.
  const result = generatePersonJsonLd(person({ memberships: [] }))
  assert.ok(!('memberOf' in result))
})

test('generatePersonJsonLd: private/ungueltige Links werden nicht in sameAs ausgegeben (nur absolute https-URLs, keine internen proudleut-URLs)', () => {
  const result = generatePersonJsonLd(
    person({
      websiteUrl: 'http://insecure-plain-http.example.com',
      links: [
        { id: 'l1', label: 'Intern', url: 'https://proudleut.com/band/more-candy' },
        { id: 'l2', label: 'Ungueltig', url: 'not-a-url' },
        { id: 'l3', label: 'Gueltig', url: 'https://www.davidgarrett.de' },
      ],
    }),
  )
  assert.deepEqual(result.sameAs, ['https://www.davidgarrett.de'])
})

test('generatePersonJsonLd: doppelte sameAs-URLs werden entfernt', () => {
  const result = generatePersonJsonLd(
    person({
      websiteUrl: 'https://dominikpalmer.de',
      links: [{ id: 'l1', label: 'Duplikat', url: 'https://dominikpalmer.de' }],
    }),
  )
  assert.deepEqual(result.sameAs, ['https://dominikpalmer.de'])
})

test('generatePersonJsonLd: jobTitle entspricht exakt dem uebergebenen Hero-Rollenwert, fehlt ohne Hero-Rolle', () => {
  const withRole = generatePersonJsonLd(person(), { heroRole: 'Bassist & Bandleader' })
  assert.equal(withRole.jobTitle, 'Bassist & Bandleader')

  const withoutRole = generatePersonJsonLd(person(), {})
  assert.ok(!('jobTitle' in withoutRole))

  const withEmptyRole = generatePersonJsonLd(person(), { heroRole: undefined })
  assert.ok(!('jobTitle' in withEmptyRole))
})

test('generatePersonJsonLd: memberOf uebernimmt keine erfundene Band-@id (bestehende Bandseiten setzen selbst keine)', () => {
  const result = generatePersonJsonLd(
    person({ memberships: [{ bandId: 'b1', bandName: 'More Candy', bandSlug: 'more-candy', instruments: [] }] }),
  )
  assert.ok(result.memberOf)
  for (const entry of result.memberOf!) {
    assert.ok(!('@id' in entry), 'memberOf-Eintraege duerfen keine erfundene @id enthalten')
  }
})

test('generatePersonJsonLd: description uebernimmt die Bio woertlich, ohne neue Textgenerierung', () => {
  const bio = 'Dominik ist Bassist mit Leib und Seele.\n\nEr spielt seit 2010 live.'
  const result = generatePersonJsonLd(person({ bio }))
  assert.equal(result.description, bio)
})

test('generatePersonJsonLd: Person ohne Bio -- kein description-Feld', () => {
  const result = generatePersonJsonLd(person({ bio: undefined }))
  assert.ok(!('description' in result))
})

test('generatePersonJsonLd + safeJsonLdString: Sonderzeichen und HTML-aehnliche Inhalte beschaedigen das JSON-LD nicht', () => {
  const result = generatePersonJsonLd(
    person({
      name: 'Test <script>alert(1)</script> & "Quotes"',
      bio: 'Bio mit </script> Ausbruchsversuch & <b>HTML</b>',
    }),
  )
  const serialized = safeJsonLdString(result)

  assert.ok(!serialized.includes('</script'), 'kein unverschluesseltes </script im serialisierten JSON-LD')
  assert.ok(!serialized.includes('<') && !serialized.includes('>'), 'keine rohen spitzen Klammern im serialisierten JSON-LD')

  // Nach dem Parsen (so wie ein Browser < etc. interpretiert) bleiben
  // die urspruenglichen Zeichen unveraendert erhalten -- reine
  // Ausgabe-Entschaerfung, keine Veraenderung der eigentlichen Daten.
  const parsed = JSON.parse(serialized)
  assert.equal(parsed.name, 'Test <script>alert(1)</script> & "Quotes"')
  assert.equal(parsed.description, 'Bio mit </script> Ausbruchsversuch & <b>HTML</b>')
})

test('safeJsonLdString: escaped alle drei Zeichen konsistent', () => {
  const serialized = safeJsonLdString({ a: '<b>&</b>' })
  assert.equal(serialized, '{"a":"\\u003cb\\u003e\\u0026\\u003c/b\\u003e"}')
})
