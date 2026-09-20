import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatBandPersonCreditsLine } from './bandPersonCreditsLine.ts'

// Innerhalb von "u. a." und "u. v. m." verwendet formatBandPersonCreditsLine
// geschuetzte Leerzeichen (NBSP), damit die Abkuerzung beim Zeilenumbruch
// auf Mobile nicht mitten auseinandergerissen wird -- Erwartungswerte hier
// bauen die Abkuerzungen deshalb ueber dieselbe NBSP-Konstante zusammen,
// statt sie literal mit normalen Leerzeichen zu tippen.
const NBSP = ' '
const U_A_MIT = `u.${NBSP}a.${NBSP}mit`
const U_V_M = `u.${NBSP}v.${NBSP}m.`

test('formatBandPersonCreditsLine: keine Credits -> null (keine leere Referenzzeile)', () => {
  assert.equal(formatBandPersonCreditsLine([]), null)
})

test('formatBandPersonCreditsLine: ein Credit -> ohne "u. v. m."', () => {
  assert.equal(formatBandPersonCreditsLine([{ name: 'Paul Young' }]), `${U_A_MIT} Paul Young`)
})

test('formatBandPersonCreditsLine: zwei Credits -> ohne "u. v. m."', () => {
  assert.equal(
    formatBandPersonCreditsLine([{ name: 'Paul Young' }, { name: 'Nik Kershaw' }]),
    `${U_A_MIT} Paul Young, Nik Kershaw`,
  )
})

test('formatBandPersonCreditsLine: genau drei Credits -> alle drei, ohne "u. v. m."', () => {
  assert.equal(
    formatBandPersonCreditsLine([{ name: 'Paul Young' }, { name: 'Nik Kershaw' }, { name: 'Mel C' }]),
    `${U_A_MIT} Paul Young, Nik Kershaw, Mel C`,
  )
})

test('formatBandPersonCreditsLine: mehr als drei Credits -> nur die ersten drei in bestehender Reihenfolge, plus "u. v. m."', () => {
  const credits = [
    { name: 'Paul Young' },
    { name: 'Nik Kershaw' },
    { name: 'Mel C' },
    { name: 'David Garrett' },
    { name: 'Andreas Bourani' },
  ]
  assert.equal(
    formatBandPersonCreditsLine(credits),
    `${U_A_MIT} Paul Young, Nik Kershaw, Mel C, ${U_V_M}`,
  )
})

test('formatBandPersonCreditsLine: bestehende Reihenfolge bleibt erhalten -- keine eigene Sortierung', () => {
  const credits = [{ name: 'Zzz Zuletzt' }, { name: 'Aaa Zuerst' }]
  assert.equal(formatBandPersonCreditsLine(credits), `${U_A_MIT} Zzz Zuletzt, Aaa Zuerst`)
})

test('formatBandPersonCreditsLine: ein bereits vorhandenes woertliches "u. v. m." wird nicht doppelt ausgegeben', () => {
  const credits = [
    { name: 'Paul Young' },
    { name: 'Nik Kershaw' },
    { name: 'Mel C' },
    { name: 'David Garrett' },
    { name: 'u. v. m.' },
  ]
  const result = formatBandPersonCreditsLine(credits)
  assert.equal(result, `${U_A_MIT} Paul Young, Nik Kershaw, Mel C, ${U_V_M}`)
  assert.equal((result?.match(/u\. v\. m\./g) ?? []).length, 1)
})

test('formatBandPersonCreditsLine: ausschliesslich ein woertliches "u. v. m." als einziger Credit -> null', () => {
  assert.equal(formatBandPersonCreditsLine([{ name: 'u. v. m.' }]), null)
})
