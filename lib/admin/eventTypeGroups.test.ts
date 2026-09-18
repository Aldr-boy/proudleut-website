import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EVENT_TYPE_GROUPS, UNGROUPED_TITLE, groupEventTypesForAdmin } from './eventTypeGroups.ts'

type Fixture = { id: string; slug: string; name: string }

function fx(slug: string): Fixture {
  return { id: `id-${slug}`, slug, name: `Name ${slug}` }
}

test('EVENT_TYPE_GROUPS: kein Slug kommt in der Konfiguration mehr als einmal vor', () => {
  const seen = new Map<string, string>()
  for (const group of EVENT_TYPE_GROUPS) {
    for (const slug of group.slugs) {
      assert.equal(
        seen.has(slug), false,
        `Slug "${slug}" ist sowohl in "${seen.get(slug)}" als auch in "${group.title}" gelistet`
      )
      seen.set(slug, group.title)
    }
  }
})

test('EVENT_TYPE_GROUPS: keine leeren Gruppen in der Konfiguration selbst', () => {
  for (const group of EVENT_TYPE_GROUPS) {
    assert.ok(group.slugs.length > 0, `Gruppe "${group.title}" hat keine Slugs`)
  }
})

test('groupEventTypesForAdmin: jeder Eingabetyp erscheint in der Ausgabe genau einmal', () => {
  const allSlugs = EVENT_TYPE_GROUPS.flatMap((g) => g.slugs)
  const input = [...allSlugs, 'irgendein-unbekannter-slug'].map(fx)
  const result = groupEventTypesForAdmin(input)

  const outputIds = result.flatMap((g) => g.types.map((t) => t.id))
  assert.equal(outputIds.length, input.length, 'Anzahl der ausgegebenen Typen weicht von der Eingabe ab')
  assert.deepEqual(
    [...outputIds].sort(),
    input.map((t) => t.id).sort(),
    'jede Eingabe-ID muss genau einmal in der Ausgabe vorkommen'
  )
})

test('groupEventTypesForAdmin: Gruppenreihenfolge und Reihenfolge innerhalb einer Gruppe folgen der Konfiguration, nicht der Eingabereihenfolge', () => {
  // Eingabe absichtlich in einer anderen Reihenfolge als die Konfiguration.
  const input = [fx('empfang'), fx('ball'), fx('brautentfuehrung'), fx('hochzeit'), fx('tanzveranstaltung')]
  const result = groupEventTypesForAdmin(input)

  assert.deepEqual(result.map((g) => g.title), ['Hochzeit', 'Ball, Tanz & Empfang'])
  assert.deepEqual(result[0].types.map((t) => t.slug), ['hochzeit', 'brautentfuehrung'])
  assert.deepEqual(result[1].types.map((t) => t.slug), ['ball', 'tanzveranstaltung', 'empfang'])
})

test('groupEventTypesForAdmin: unbekannter/neuer Slug landet gesammelt im Auffangabschnitt, bestehende Gruppen bleiben unberuehrt', () => {
  const input = [fx('hochzeit'), fx('ein-ganz-neuer-typ')]
  const result = groupEventTypesForAdmin(input)

  const fallback = result.find((g) => g.title === UNGROUPED_TITLE)
  assert.ok(fallback, 'Auffangabschnitt fehlt')
  assert.deepEqual(fallback!.types.map((t) => t.slug), ['ein-ganz-neuer-typ'])

  const hochzeitGroup = result.find((g) => g.title === 'Hochzeit')
  assert.ok(hochzeitGroup)
  assert.deepEqual(hochzeitGroup!.types.map((t) => t.slug), ['hochzeit'])
})

test('groupEventTypesForAdmin: leere Gruppen (kein passender Eingabetyp) werden nicht zurueckgegeben', () => {
  const input = [fx('hochzeit')]
  const result = groupEventTypesForAdmin(input)
  assert.deepEqual(result.map((g) => g.title), ['Hochzeit'])
})

test('groupEventTypesForAdmin: leere Eingabe ergibt leere Ausgabe, kein Auffangabschnitt', () => {
  assert.deepEqual(groupEventTypesForAdmin([]), [])
})

test('groupEventTypesForAdmin: "Ball & Gala" und "Empfang & Dinner" werden weiterhin ueber ihre stabilen Slugs "ball"/"empfang" gefunden, unabhaengig vom Anzeigenamen', () => {
  const input = [
    { id: 'id-ball', slug: 'ball', name: 'Ball & Gala' },
    { id: 'id-empfang', slug: 'empfang', name: 'Empfang & Dinner' },
  ]
  const result = groupEventTypesForAdmin(input)
  const group = result.find((g) => g.title === 'Ball, Tanz & Empfang')
  assert.ok(group)
  assert.deepEqual(group!.types.map((t) => t.name), ['Ball & Gala', 'Empfang & Dinner'])
})

test('groupEventTypesForAdmin: wirft nicht bei doppeltem Slug in der Eingabe (event_types.slug ist in der DB UNIQUE, dieser Fall ist defensiv abgesichert, kein Crash/keine Endlosschleife)', () => {
  const input = [fx('hochzeit'), fx('hochzeit')]
  assert.doesNotThrow(() => groupEventTypesForAdmin(input))
})

test('EVENT_TYPE_GROUPS: "Hochzeit" listet trauung an zweiter Stelle zwischen hochzeit und brautentfuehrung', () => {
  const hochzeit = EVENT_TYPE_GROUPS.find((g) => g.title === 'Hochzeit')
  assert.ok(hochzeit)
  assert.deepEqual(hochzeit!.slugs, ['hochzeit', 'trauung', 'brautentfuehrung'])
})

test('groupEventTypesForAdmin: sobald "trauung" im Katalog existiert, erscheint es in der Hochzeit-Gruppe zwischen Hochzeit und Brautentführung, unabhaengig von der Eingabereihenfolge', () => {
  const input = [fx('brautentfuehrung'), fx('trauung'), fx('hochzeit')]
  const result = groupEventTypesForAdmin(input)
  const hochzeitGroup = result.find((g) => g.title === 'Hochzeit')
  assert.ok(hochzeitGroup)
  assert.deepEqual(hochzeitGroup!.types.map((t) => t.slug), ['hochzeit', 'trauung', 'brautentfuehrung'])
})

test('groupEventTypesForAdmin: ohne vorhandenen "trauung"-Katalogeintrag bleibt die Hochzeit-Gruppe mit den uebrigen zwei Typen normal funktionsfaehig (kein Platzhalter, kein Fehler)', () => {
  const input = [fx('hochzeit'), fx('brautentfuehrung')]
  const result = groupEventTypesForAdmin(input)
  const hochzeitGroup = result.find((g) => g.title === 'Hochzeit')
  assert.ok(hochzeitGroup)
  assert.deepEqual(hochzeitGroup!.types.map((t) => t.slug), ['hochzeit', 'brautentfuehrung'])
})
