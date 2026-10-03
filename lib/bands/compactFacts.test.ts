import { test } from 'node:test'
import assert from 'node:assert/strict'
import { endStateOf, layoutCompactFacts, FACT_SEPARATOR, HERKUNFT_MIN } from './compactFacts.ts'

// Wertetabelle fuer die Fakten-Anzeige der kompakten Pille. Breiten sind die
// natuerlichen Breiten (px). Trenner 41 px, Untergrenze Herkunft 160 px.
const S = FACT_SEPARATOR
const M = HERKUNFT_MIN

test('Konstanten: Trenner 41 px, Untergrenze der Herkunft 160 px', () => {
  assert.equal(S, 41)
  assert.equal(M, 160)
})

type Case = {
  name: string
  available: number
  widths: { herkunft?: number; besetzung?: number; stil?: number }
  expected: ReturnType<typeof layoutCompactFacts>
  state: number
}

const H = 231, B = 77, ST = 172
// alles passt mit gekuerzter Herkunft: Untergrenze 160 + 77 + 172 + 2*41 = 491
const ALL_MIN = M + B + ST + 2 * S
// alles passt mit voller Herkunft: 231 + 77 + 172 + 82 = 562
const ALL_FULL = H + B + ST + 2 * S

const table: Case[] = [
  // ---- Endzustand 7: alles vollstaendig
  { name: '7: genau passend (alles vollstaendig)', available: ALL_FULL, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'full', herkunftWidth: H, besetzung: 'shown', stil: 'shown' }, state: 7 },
  { name: '7: reichlich Platz', available: 900, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'full', herkunftWidth: H, besetzung: 'shown', stil: 'shown' }, state: 7 },
  { name: '7: nur Herkunft vorhanden und passend', available: 300, widths: { herkunft: H }, expected: { herkunft: 'full', herkunftWidth: H, besetzung: 'absent', stil: 'absent' }, state: 7 },
  { name: '7: Herkunft und Stil vorhanden (ohne Besetzung), passend', available: H + ST + S, widths: { herkunft: H, stil: ST }, expected: { herkunft: 'full', herkunftWidth: H, besetzung: 'absent', stil: 'shown' }, state: 7 },
  // ---- Endzustand 6: alles angezeigt, Herkunft gekuerzt
  { name: '6: 1 px weniger als voll -> Herkunft 1 px gekuerzt', available: ALL_FULL - 1, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'truncated', herkunftWidth: H - 1, besetzung: 'shown', stil: 'shown' }, state: 6 },
  { name: '6: genau an der Untergrenze (Herkunft = 160)', available: ALL_MIN, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'truncated', herkunftWidth: M, besetzung: 'shown', stil: 'shown' }, state: 6 },
  { name: '6: nur Herkunft vorhanden, zu schmal (gekuerzt)', available: 200, widths: { herkunft: H }, expected: { herkunft: 'truncated', herkunftWidth: 200, besetzung: 'absent', stil: 'absent' }, state: 6 },
  // ---- Endzustand 5/4: Stil entfaellt
  { name: '5: 1 px zu wenig fuer alles mit Untergrenze -> Stil entfaellt, Herkunft vollstaendig', available: ALL_MIN - 1, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'full', herkunftWidth: H, besetzung: 'shown', stil: 'hidden' }, state: 5 },
  { name: '4: ohne Stil, Herkunft gekuerzt', available: H + B + S - 1, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'truncated', herkunftWidth: H - 1, besetzung: 'shown', stil: 'hidden' }, state: 4 },
  { name: '4: ohne Stil, genau Untergrenze der Herkunft + Besetzung', available: M + B + S, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'truncated', herkunftWidth: M, besetzung: 'shown', stil: 'hidden' }, state: 4 },
  { name: '5: Herkunft + Stil ohne Besetzung, Stil entfaellt, Herkunft passt vollstaendig', available: H + S - 1, widths: { herkunft: H, stil: ST }, expected: { herkunft: 'full', herkunftWidth: H, besetzung: 'absent', stil: 'hidden' }, state: 5 },
  // ---- Endzustand 3: nur Besetzung
  { name: '3: 1 px zu wenig fuer Herkunft(160) + Besetzung -> nur Besetzung', available: M + B + S - 1, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'hidden', herkunftWidth: null, besetzung: 'shown', stil: 'hidden' }, state: 3 },
  { name: '3: nur Besetzung passt gerade (Breite = Platz)', available: B, widths: { herkunft: H, besetzung: B }, expected: { herkunft: 'hidden', herkunftWidth: null, besetzung: 'shown', stil: 'absent' }, state: 3 },
  // ---- Endzustand 2: nichts angezeigt
  { name: '2: Besetzung passt nicht allein -> nichts', available: B - 1, widths: { herkunft: H, besetzung: B, stil: ST }, expected: { herkunft: 'hidden', herkunftWidth: null, besetzung: 'hidden', stil: 'hidden' }, state: 2 },
  { name: '2: nur Herkunft vorhanden, nicht einmal die Untergrenze (160) passt -> nichts', available: M - 1, widths: { herkunft: H }, expected: { herkunft: 'hidden', herkunftWidth: null, besetzung: 'absent', stil: 'absent' }, state: 2 },
  { name: '2: Herkunft + Stil ohne Besetzung, Platz 100 < Untergrenze 160 -> nichts', available: 100, widths: { herkunft: H, stil: ST }, expected: { herkunft: 'hidden', herkunftWidth: null, besetzung: 'absent', stil: 'hidden' }, state: 2 },
  // ---- Endzustand 1: keine Fakten vorhanden
  { name: '1: keine Fakten vorhanden', available: 500, widths: {}, expected: { herkunft: 'absent', herkunftWidth: null, besetzung: 'absent', stil: 'absent' }, state: 1 },
]

for (const c of table) {
  test(`Fakten: ${c.name}`, () => {
    const layout = layoutCompactFacts(c.available, c.widths)
    assert.deepEqual(layout, c.expected)
    assert.equal(endStateOf(layout), c.state)
  })
}

test('Fixture fuer jeden der sieben Endzustaende vorhanden', () => {
  // Zustand 2 entsteht nur, wenn nichts mehr passt: Besetzung allein breiter als der Platz
  const two = layoutCompactFacts(40, { herkunft: 120, besetzung: 90 })
  assert.equal(endStateOf(two), 2)
  const states = new Set<number>([...table.map((c) => c.state), endStateOf(two)])
  for (const s of [1, 2, 3, 4, 5, 6, 7]) assert.ok(states.has(s), `Endzustand ${s} fehlt`)
})

test('Besetzung wird nie gekuerzt: sie ist entweder angezeigt oder entfaellt, nie mit anderer Breite', () => {
  for (let avail = 0; avail <= 700; avail += 7) {
    const l = layoutCompactFacts(avail, { herkunft: H, besetzung: B, stil: ST })
    assert.ok(l.besetzung === 'shown' || l.besetzung === 'hidden')
    if (l.besetzung === 'shown') assert.ok(avail >= B, 'Besetzung nur angezeigt, wenn sie voll passt')
  }
})

test('Prioritaet: Stil entfaellt vor der Herkunft, Herkunft vor der Besetzung (monoton ueber die Breite)', () => {
  const rank = (l: ReturnType<typeof layoutCompactFacts>) =>
    (l.besetzung === 'shown' ? 1 : 0) + (l.herkunft === 'full' || l.herkunft === 'truncated' ? 2 : 0) + (l.stil === 'shown' ? 4 : 0)
  let prev = -1
  for (let avail = 0; avail <= 700; avail++) {
    const l = layoutCompactFacts(avail, { herkunft: H, besetzung: B, stil: ST })
    const r = rank(l)
    // mit wachsender Breite kommen nur Fakten hinzu, nie weg
    assert.ok(r >= prev, 'Rang faellt bei Breite ' + avail)
    if (l.stil === 'shown') assert.ok(l.herkunft !== 'hidden' && l.besetzung === 'shown')
    if (l.herkunft === 'hidden' && l.besetzung === 'hidden') assert.equal(l.stil, 'hidden')
    prev = r
  }
})

test('Sichtbare Reihenfolge ist fest (Herkunft, Besetzung, Stil): die Ausgabe enthaelt nur Zustaende, keine Reihenfolge', () => {
  const l = layoutCompactFacts(900, { herkunft: H, besetzung: B, stil: ST })
  assert.deepEqual(Object.keys(l), ['herkunft', 'herkunftWidth', 'besetzung', 'stil'])
})
