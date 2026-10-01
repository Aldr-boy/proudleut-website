import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getBandFacts, BESETZUNG_FALLBACK_MAX_LENGTH } from './bandFacts.ts'

type FactsInput = Parameters<typeof getBandFacts>[0]

function band(weddingInfo: { bandSize?: string; constellation?: string } | undefined): FactsInput {
  return {
    location: { city: 'Hemau', district: 'Landkreis Regensburg' },
    weddingInfo,
    musikalischVerortet: ['Volksmusik bis Charts'],
  } as unknown as FactsInput
}

const besetzung = (b: FactsInput) => getBandFacts(b).find((f) => f.label === 'Besetzung')?.value

test('Besetzung: bandSize hat Vorrang vor wedding_constellation', () => {
  assert.equal(besetzung(band({ bandSize: '6 Personen', constellation: 'Quartett | Sextett' })), '6 Personen')
})

test('Besetzung: fehlt bandSize, dient ein kurzer constellation-Text als Fallback', () => {
  assert.equal(besetzung(band({ constellation: 'Quartett | Sextett' })), 'Quartett | Sextett')
})

test(`Besetzung: constellation genau an der Grenze (${BESETZUNG_FALLBACK_MAX_LENGTH} Zeichen) wird noch gezeigt`, () => {
  const value = 'Unplugged-Set (Quartett)'
  assert.equal(value.length, BESETZUNG_FALLBACK_MAX_LENGTH)
  assert.equal(besetzung(band({ constellation: value })), value)
})

test('Besetzung: constellation laenger als die Grenze entfaellt (keine leere Zelle)', () => {
  const facts = getBandFacts(band({ constellation: 'Duo | Trio | Full Band (7 Musiker) | Alphornbläser' }))
  assert.ok(!facts.some((f) => f.label === 'Besetzung'))
  assert.deepEqual(facts.map((f) => f.label), ['Herkunft', 'Stil'])
})

test('Besetzung: der Platzhalter "fix" (case-insensitiv, nach trim) zaehlt als leer', () => {
  for (const value of ['fix', 'Fix', ' FIX ']) {
    assert.equal(besetzung(band({ constellation: value })), undefined)
  }
})

test('Besetzung: "variabel" und andere kurze Werte bleiben; "fix" gilt nur fuer den exakten Wert, bandSize behaelt Vorrang', () => {
  assert.equal(besetzung(band({ constellation: 'variabel' })), 'variabel')
  assert.equal(besetzung(band({ constellation: 'fix besetzt' })), 'fix besetzt')
  assert.equal(besetzung(band({ bandSize: '4 Personen', constellation: 'fix' })), '4 Personen')
})

test('Besetzung: nur Leerzeichen oder fehlende weddingInfo -> keine Besetzung', () => {
  assert.equal(besetzung(band({ constellation: '   ' })), undefined)
  assert.equal(besetzung(band(undefined)), undefined)
})
