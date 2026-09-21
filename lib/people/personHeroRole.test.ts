import { test } from 'node:test'
import assert from 'node:assert/strict'
import { derivePersonHeroRole } from './personHeroRole.ts'
import type { PublicPersonMembership } from './normalizePerson.ts'

function membership(overrides: Partial<PublicPersonMembership> = {}): PublicPersonMembership {
  return {
    bandId: 'b1',
    bandName: 'Band',
    bandSlug: 'band',
    instruments: [],
    ...overrides,
  }
}

test('derivePersonHeroRole: keine Memberships -> undefined', () => {
  assert.equal(derivePersonHeroRole({ memberships: [] }), undefined)
})

test('derivePersonHeroRole: eine Rolle -> unveraendert uebernommen', () => {
  assert.equal(derivePersonHeroRole({ memberships: [membership({ role: 'Sängerin' })] }), 'Sängerin')
})

test('derivePersonHeroRole: "&"-Rolle wird auf den Teil vor dem "&" gekuerzt', () => {
  assert.equal(
    derivePersonHeroRole({ memberships: [membership({ role: 'Bassist & Bandleader' })] }),
    'Bassist',
  )
})

test('derivePersonHeroRole: mehrere Memberships mit unterschiedlichen Rollen -> eindeutige Rollen, per " · " verbunden', () => {
  const result = derivePersonHeroRole({
    memberships: [
      membership({ bandId: 'b1', role: 'Bassist & Bandleader' }),
      membership({ bandId: 'b2', role: 'Bassist' }),
      membership({ bandId: 'b3', role: 'Sänger' }),
    ],
  })
  // "Bassist & Bandleader" -> "Bassist" ist identisch zur zweiten Rolle
  // "Bassist" -> Set dedupliziert, es bleiben zwei eindeutige Rollen.
  assert.equal(result, 'Bassist · Sänger')
})

test('derivePersonHeroRole: Memberships ohne Rolle werden ignoriert', () => {
  const result = derivePersonHeroRole({
    memberships: [membership({ role: undefined }), membership({ bandId: 'b2', role: 'Sängerin' })],
  })
  assert.equal(result, 'Sängerin')
})
