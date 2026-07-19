import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugifyMoodName } from './slug.ts'

test('reproduziert bestehende, bereits kuratierte Mood-Slugs exakt (reine Zeichentransliteration, keine Woerter werden entfernt)', () => {
  assert.equal(slugifyMoodName('Emotional & berührend'), 'emotional-beruehrend')
  assert.equal(slugifyMoodName('Rockig & mitreißend'), 'rockig-mitreissend')
  assert.equal(slugifyMoodName('Bayerisch & frech'), 'bayerisch-frech')
  assert.equal(slugifyMoodName('Konzertant & hochwertig'), 'konzertant-hochwertig')
  assert.equal(slugifyMoodName('Tanzflächen-Garantie'), 'tanzflaechen-garantie')
  // Hinweis: "Festlich und ausgelassen" hat als bestehenden, historisch
  // hand-kuratierten Slug "festlich-ausgelassen" (ohne "und") -- das ist
  // eine redaktionelle Abkuerzung, keine reine Zeichentransliteration,
  // und wird von dieser Funktion bewusst NICHT nachgebildet (kein
  // Stoppwort-Raten). Mechanisch korrekt und fuer neue Moods erwartet:
  assert.equal(slugifyMoodName('Festlich und ausgelassen'), 'festlich-und-ausgelassen')
})

test('erzeugte Slugs erfuellen immer die DB-Constraint ^[a-z0-9-]+$', () => {
  const inputs = [
    'Emotional & berührend',
    '  Vorne und hinten Leerzeichen  ',
    'Mehrfach---Bindestrich',
    'Sonderzeichen!?%&/()',
    'ÄÖÜß Test',
  ]
  const re = /^[a-z0-9-]+$/
  for (const input of inputs) {
    const slug = slugifyMoodName(input)
    assert.match(slug, re, `Slug "${slug}" aus "${input}" verletzt die Konvention`)
  }
})

test('ist deterministisch (gleiche Eingabe -> gleiche Ausgabe)', () => {
  const name = 'Herzlich & nahbar'
  assert.equal(slugifyMoodName(name), slugifyMoodName(name))
})

test('kollabiert mehrfache Trenner und entfernt fuehrende/abschliessende Bindestriche', () => {
  assert.equal(slugifyMoodName('  --Test--  '), 'test')
  assert.equal(slugifyMoodName('A   B'), 'a-b')
})
