import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugifyRepertoireStyleName } from './slug.ts'

test('reproduziert einen bestehenden, per Production-Import kuratierten Repertoire-Style-Slug exakt', () => {
  // Exakter Slug aus supabase/musikalisch_verortet_import_v2.sql
  assert.equal(slugifyRepertoireStyleName('Charts-Decades & Tanzstandards'), 'charts-decades-tanzstandards')
})

test('transliteriert Umlaute wie das bestehende Mood-Slug-Muster (ae/oe/ue/ss)', () => {
  assert.equal(slugifyRepertoireStyleName('Bläserklänge & Blasmusik'), 'blaeserklaenge-blasmusik')
  assert.equal(slugifyRepertoireStyleName('Straußwalzer'), 'strausswalzer')
})

test('erzeugte Slugs erfuellen immer die DB-Constraint ^[a-z0-9-]+$', () => {
  const inputs = [
    'Charts-Decades & Tanzstandards',
    '  Vorne und hinten Leerzeichen  ',
    'Mehrfach---Bindestrich',
    'Sonderzeichen!?%&/()',
    'ÄÖÜß Test',
  ]
  const re = /^[a-z0-9-]+$/
  for (const input of inputs) {
    const slug = slugifyRepertoireStyleName(input)
    assert.match(slug, re, `Slug "${slug}" aus "${input}" verletzt die Konvention`)
  }
})

test('ist deterministisch (gleiche Eingabe -> gleiche Ausgabe)', () => {
  const name = 'Volksmusik bis Charts'
  assert.equal(slugifyRepertoireStyleName(name), slugifyRepertoireStyleName(name))
})

test('kollabiert mehrfache Trenner und entfernt fuehrende/abschliessende Bindestriche', () => {
  assert.equal(slugifyRepertoireStyleName('  --Test--  '), 'test')
  assert.equal(slugifyRepertoireStyleName('A   B'), 'a-b')
})
