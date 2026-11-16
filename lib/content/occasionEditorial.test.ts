import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getOccasionEditorial } from './occasionEditorial.ts'
import { CATEGORIES } from '../categories.ts'

test('Weihnachtsfeier hat vier Abschnittstitel (drei Abschnitte plus Haeufige Fragen) und fuenf Fragen', () => {
  const e = getOccasionEditorial('weihnachtsfeier')
  assert.ok(e)
  assert.deepEqual(
    [...e.sections.map((s) => s.heading), e.faq?.heading],
    [
      'Band statt DJ: Livemusik für eure Weihnachtsfeier',
      'Das gehört in eure Anfrage',
      'Was kostet eine Band für die Weihnachtsfeier?',
      'Häufige Fragen',
    ],
  )
  assert.equal(e.faq?.items.length, 5)
})

test('Anlassseiten ohne Text bleiben ohne Eintrag', () => {
  for (const c of CATEGORIES.filter((c) => c.slug !== 'weihnachtsfeier')) {
    assert.equal(getOccasionEditorial(c.slug), undefined, c.slug)
  }
})
