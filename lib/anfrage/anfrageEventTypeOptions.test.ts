import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { computeAvailableAnfrageEventTypes, resolveAnfrageDisplayLabel } from './anfrageEventTypeOptions.ts'
import type { BandAnfrageEventType } from '../types/band.ts'

const FIRMENFEIER: BandAnfrageEventType = { name: 'Firmenfeier & Business Event', slug: 'firmenfeier-business-event', anfrageLabel: 'Firmenfeier' }
const HOCHZEIT: BandAnfrageEventType = { name: 'Hochzeit', slug: 'hochzeit', anfrageLabel: null }
const PRIVATE_FEIERN: BandAnfrageEventType = { name: 'private Feiern', slug: 'private-feiern', anfrageLabel: 'Private Feier' }
const EXKLUSIVE_PRIVATFEIERN: BandAnfrageEventType = { name: 'exklusive Privatfeiern', slug: 'exklusive-privatfeiern', anfrageLabel: 'Exklusive Privatfeier' }
const STADTFEST: BandAnfrageEventType = { name: 'Stadt- und Bürgerfest', slug: 'stadt-und-buergerfest', anfrageLabel: 'Stadtfest' }

// ── resolveAnfrageDisplayLabel ───────────────────────────────────────

test('resolveAnfrageDisplayLabel: Event Type MIT anfrage_label verwendet das Label', () => {
  assert.equal(resolveAnfrageDisplayLabel(FIRMENFEIER), 'Firmenfeier')
})

test('resolveAnfrageDisplayLabel: Event Type OHNE anfrage_label faellt auf den kanonischen Namen zurueck', () => {
  assert.equal(resolveAnfrageDisplayLabel(HOCHZEIT), 'Hochzeit')
})

test('resolveAnfrageDisplayLabel: zwei Privatfeier-Typen bleiben ueber ihr Label unterscheidbar', () => {
  assert.equal(resolveAnfrageDisplayLabel(PRIVATE_FEIERN), 'Private Feier')
  assert.equal(resolveAnfrageDisplayLabel(EXKLUSIVE_PRIVATFEIERN), 'Exklusive Privatfeier')
  assert.notEqual(resolveAnfrageDisplayLabel(PRIVATE_FEIERN), resolveAnfrageDisplayLabel(EXKLUSIVE_PRIVATFEIERN))
})

// ── computeAvailableAnfrageEventTypes ────────────────────────────────

test('computeAvailableAnfrageEventTypes: eine Band -> deren zugeordnete Event Types (dedupliziert)', () => {
  const bands = [{ anfrageEventTypes: [FIRMENFEIER, HOCHZEIT, FIRMENFEIER] }]
  const result = computeAvailableAnfrageEventTypes(bands)
  assert.deepEqual(result.map((t) => t.slug), ['firmenfeier-business-event', 'hochzeit'])
})

test('computeAvailableAnfrageEventTypes: mehrere Bands -> Schnittmenge ueber die kanonische Identitaet (slug)', () => {
  const bands = [
    { anfrageEventTypes: [FIRMENFEIER, HOCHZEIT, STADTFEST] },
    { anfrageEventTypes: [FIRMENFEIER, STADTFEST] },
    { anfrageEventTypes: [FIRMENFEIER, STADTFEST, PRIVATE_FEIERN] },
  ]
  const result = computeAvailableAnfrageEventTypes(bands)
  assert.deepEqual(
    result.map((t) => t.slug).sort(),
    ['firmenfeier-business-event', 'stadt-und-buergerfest']
  )
})

test('computeAvailableAnfrageEventTypes: Schnittmenge bildet sich ueber slug, nicht ueber das Anfrage-Label', () => {
  // Zwei Bands mit demselben Event Type (gleicher slug), aber technisch
  // unterschiedlich befuellten Objektinstanzen -- die Identitaet darf sich
  // nicht am Label, sondern ausschliesslich am slug entscheiden.
  const bands = [
    { anfrageEventTypes: [{ ...PRIVATE_FEIERN }] },
    { anfrageEventTypes: [{ ...PRIVATE_FEIERN }] },
  ]
  const result = computeAvailableAnfrageEventTypes(bands)
  assert.deepEqual(result, [PRIVATE_FEIERN])
})

test('computeAvailableAnfrageEventTypes: keine gemeinsamen Event Types -> leeres Array', () => {
  const bands = [
    { anfrageEventTypes: [HOCHZEIT] },
    { anfrageEventTypes: [FIRMENFEIER] },
  ]
  assert.deepEqual(computeAvailableAnfrageEventTypes(bands), [])
})

test('computeAvailableAnfrageEventTypes: keine Bands -> leeres Array', () => {
  assert.deepEqual(computeAvailableAnfrageEventTypes([]), [])
})

test('computeAvailableAnfrageEventTypes: Reihenfolge/Label-Aufloesung fuer alle vier freigegebenen V1-Labels', () => {
  const bands = [{ anfrageEventTypes: [FIRMENFEIER, PRIVATE_FEIERN, EXKLUSIVE_PRIVATFEIERN, STADTFEST, HOCHZEIT] }]
  const labels = computeAvailableAnfrageEventTypes(bands).map(resolveAnfrageDisplayLabel)
  assert.deepEqual(labels, ['Firmenfeier', 'Private Feier', 'Exklusive Privatfeier', 'Stadtfest', 'Hochzeit'])
})

// ── "Sonstiges"-Pfad in components/band/AnfrageModal.tsx unveraendert ──
// Strukturelle Regressionspruefung per readFileSync (identisches, bereits
// etabliertes Muster wie lib/homepage/heroMosaicChips.test.ts) -- dieses
// Repo nutzt bewusst keine React-Komponenten-Test-Infrastruktur.

const anfrageModalSource = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'components', 'band', 'AnfrageModal.tsx'),
  'utf8'
)

test('AnfrageModal: "Sonstiges"-Freitext-Pfad bleibt unveraendert (Block "Event-Type-Anfrage-Label V1" betrifft nur normale Optionen)', () => {
  assert.match(
    anfrageModalSource,
    /anlass: form\.eventtyp === 'sonstiges' \? form\.eventtyp_custom : form\.eventtyp,/
  )
  assert.match(anfrageModalSource, /<option value="sonstiges">Sonstiges<\/option>/)
})
