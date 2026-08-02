import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die zwei Startseiten-Chip-Gruppen
// ("Nach Anlass" / "Klingt nach", ohne sichtbare Gruppenueberschriften --
// UI-Nachtrag) in components/homepage/HeroMosaic.tsx. Identisches, bereits
// etabliertes
// Muster wie lib/bands/bandExplorerMoodUrlState.test.ts -- echte
// Quelldatei per readFileSync lesen, keine React-Testing-Infrastruktur
// noetig, da nur auf exakte, statische href-Werte und Gruppenlabels
// geprueft wird.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'homepage', 'HeroMosaic.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('Chips bleiben in zwei Reihen gruppiert, ohne sichtbare Gruppenueberschriften im Markup', () => {
  const wrapperStart = source.indexOf('mb-8 md:mb-10 space-y-4')
  assert.ok(wrapperStart >= 0, 'Chip-Wrapper nicht gefunden')
  const wrapperEnd = source.indexOf('Bands entdecken', wrapperStart)
  const wrapper = source.slice(wrapperStart, wrapperEnd)

  const rowMatches = wrapper.match(/flex flex-wrap justify-center gap-2/g) ?? []
  assert.equal(rowMatches.length, 2, 'erwartet genau zwei Chip-Reihen (Anlass, Klingt nach)')

  assert.doesNotMatch(wrapper, />\s*Nach Anlass\s*</)
  assert.doesNotMatch(wrapper, />\s*Klingt nach\s*</)
})

test('"Nach Anlass" enthaelt genau die drei festgelegten Kategorien in dieser Reihenfolge', () => {
  assert.match(
    source,
    /const ANLASS_CHIP_SLUGS = \['hochzeit', 'firmenfeier', 'festzelt'\];/
  )
})

test('Anlass-Chips fuehren weiterhin zum bestehenden funktionierenden Zielpfad /veranstaltung/[slug]', () => {
  assert.match(source, /href=\{`\/veranstaltung\/\$\{cat\.slug\}`\}/)
})

test('"Klingt nach" enthaelt exakt die drei festgelegten Mood-Chips mit den drei verbindlichen Ziel-URLs', () => {
  const startMarker = 'const KLINGT_NACH_CHIPS: { title: string; slug: string }[] = ['
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, 'KLINGT_NACH_CHIPS nicht gefunden')
  const endIndex = source.indexOf('];', startIndex)
  const arrayLiteral = source.slice(startIndex + startMarker.length - 1, endIndex + 1)
  const fn = new Function(`return ${arrayLiteral}`)
  const chips = fn() as { title: string; slug: string }[]

  assert.deepEqual(chips, [
    { title: 'Tanzflächen-Garantie', slug: 'tanzflaechen-garantie' },
    { title: 'Authentisch und handgemacht', slug: 'authentisch-handgemacht' },
    { title: 'Generationenverbindend', slug: 'generationenverbindend' },
  ])

  const targetUrls = chips.map((c) => `/bands?mood=${c.slug}`)
  assert.deepEqual(targetUrls, [
    '/bands?mood=tanzflaechen-garantie',
    '/bands?mood=authentisch-handgemacht',
    '/bands?mood=generationenverbindend',
  ])
})

test('Mood-Chips verlinken direkt in den Explorer (/bands?mood=...), keine eigene Landingpage', () => {
  assert.match(source, /href=\{`\/bands\?mood=\$\{mood\.slug\}`\}/)
  assert.doesNotMatch(source, /\/klingt-nach\//)
})
