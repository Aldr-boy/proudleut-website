import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugifyPersonName } from './slug.ts'

test('transliteriert Umlaute wie das bestehende Slug-Muster (ae/oe/ue/ss)', () => {
  assert.equal(slugifyPersonName('Dominik Palmer'), 'dominik-palmer')
  assert.equal(slugifyPersonName('Jörg Müller'), 'joerg-mueller')
  assert.equal(slugifyPersonName('Straßenmusiker Groß'), 'strassenmusiker-gross')
})

test('erzeugte Slugs erfuellen immer die DB-Constraint ^[a-z0-9-]+$', () => {
  const inputs = ['PL Admin Test Person', 'Anna-Lena Ö.', '  Vorname Nachname  ', "O'Brien"]
  for (const input of inputs) {
    const slug = slugifyPersonName(input)
    assert.match(slug, /^[a-z0-9-]+$/, `Slug fuer "${input}" ist "${slug}"`)
  }
})

test('ist deterministisch (gleiche Eingabe -> gleiche Ausgabe)', () => {
  assert.equal(slugifyPersonName('Testperson'), slugifyPersonName('Testperson'))
})

test('kollabiert mehrfache Trenner und entfernt fuehrende/abschliessende Bindestriche', () => {
  assert.equal(slugifyPersonName('  -- Test   Person -- '), 'test-person')
})

test('leere oder nur aus Trennern bestehende Eingabe ergibt leeren String (Validierung erfolgt in der Server Action, nicht hier)', () => {
  assert.equal(slugifyPersonName(''), '')
  assert.equal(slugifyPersonName('   '), '')
  assert.equal(slugifyPersonName('---'), '')
})
