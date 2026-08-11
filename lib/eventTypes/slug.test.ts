import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugifyEventTypeName } from './slug.ts'

test('reproduziert real bestehende, kuratierte Production-Slugs exakt', () => {
  assert.equal(slugifyEventTypeName('Stadt- und Bürgerfest'), 'stadt-und-buergerfest')
  assert.equal(slugifyEventTypeName('Firmenfeier & Business Event'), 'firmenfeier-business-event')
  assert.equal(slugifyEventTypeName('exklusive Privatfeiern'), 'exklusive-privatfeiern')
})

test('transliteriert Umlaute wie das bestehende Mood-/Repertoire-Style-Slug-Muster (ae/oe/ue/ss)', () => {
  assert.equal(slugifyEventTypeName('Frühschoppen'), 'fruehschoppen')
  assert.equal(slugifyEventTypeName('Öffentliches Straßenfest'), 'oeffentliches-strassenfest')
})

test('erzeugte Slugs erfuellen immer die DB-Constraint ^[a-z0-9-]+$', () => {
  const inputs = ['Gala', 'Award-Show', 'Kinder- & Familienevent', '  Vernissage  ', 'Bar/Lounge']
  for (const input of inputs) {
    const slug = slugifyEventTypeName(input)
    assert.match(slug, /^[a-z0-9-]+$/, `Slug fuer "${input}" ist "${slug}"`)
  }
})

test('ist deterministisch (gleiche Eingabe -> gleiche Ausgabe)', () => {
  assert.equal(slugifyEventTypeName('Sommerfest'), slugifyEventTypeName('Sommerfest'))
})

test('kollabiert mehrfache Trenner und entfernt fuehrende/abschliessende Bindestriche', () => {
  assert.equal(slugifyEventTypeName('  -- Test   Event -- '), 'test-event')
})

test('leere oder nur aus Trennern bestehende Eingabe ergibt leeren String (Validierung erfolgt in der Server Action/RPC, nicht hier)', () => {
  assert.equal(slugifyEventTypeName(''), '')
  assert.equal(slugifyEventTypeName('   '), '')
  assert.equal(slugifyEventTypeName('---'), '')
})
