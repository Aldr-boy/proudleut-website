import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regressionsschutz fuer Codex-P1 (Filterleiste bricht bei schmalen
// Desktop-/Tablet-/Split-Screen-Breiten nicht um und schneidet Suche/
// "Klingt nach" ab): der Zeilenmodus der Finder-Bar in
// components/bands/BandExplorer.tsx aktivierte sich bislang zu frueh
// (sm:flex-row, 640px) fuer fuenf Segmente mit zusammen 652px festen
// Mindestbreiten -- bei overflow-hidden und ohne flex-wrap wurde der
// Ueberschuss abgeschnitten statt umzubrechen. Bewusst KEIN Test, der
// die vollstaendige Tailwind-Klassenkette pro Segment festschreibt
// (waere brueckig gegenueber unabhaengigen Styling-Aenderungen) --
// stattdessen wird die strukturelle Invariante geprueft, die den
// Fehler tatsaechlich verursacht hat: Container und alle vier
// mindestbreiten-tragenden Segmente muessen denselben Breakpoint fuer
// den Zeilenmodus verwenden, und dieser darf nicht mehr "sm" sein.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'bands', 'BandExplorer.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

const barStart = source.indexOf('{/* ── Finder-Bar')
const barEnd = source.indexOf('{/* ── Ende Finder-Bar')
assert.ok(barStart >= 0 && barEnd > barStart, 'Finder-Bar-Block nicht gefunden')
const bar = source.slice(barStart, barEnd)

function extractRowModeBreakpoint(): string {
  const match = bar.match(/flex flex-col (\w+):flex-row/)
  assert.ok(match, 'Zeilenmodus-Umschaltung (flex-col ...:flex-row) nicht gefunden')
  return match![1]
}

test('Zeilenmodus der Finder-Bar aktiviert sich nicht mehr beim zu fruehen "sm"-Breakpoint (640px)', () => {
  const bp = extractRowModeBreakpoint()
  assert.notEqual(bp, 'sm', 'sm (640px) reicht fuer fuenf Segmente nachweislich nicht aus (Codex P1)')
})

test('Zeilenmodus aktiviert sich bei "lg" (1024px) -- ausreichend Platz fuer alle fuenf Segmente laut Breitenanalyse', () => {
  assert.equal(extractRowModeBreakpoint(), 'lg')
})

test('alle vier mindestbreiten-tragenden Segmente (Anlass/Region/Bandtyp/Klingt nach) verwenden denselben Breakpoint wie der Container', () => {
  const bp = extractRowModeBreakpoint()
  const segmentLabels = ['Segment 2', 'Segment 3', 'Segment 4', 'Segment 5']
  for (const label of segmentLabels) {
    const segStart = bar.indexOf(label)
    assert.ok(segStart >= 0, `${label} nicht gefunden`)
    const segEnd = bar.indexOf('</button>', segStart)
    const seg = bar.slice(segStart, segEnd)
    assert.match(
      seg,
      new RegExp(`${bp}:min-w-\\[`),
      `${label}: erwartet ${bp}:min-w-[...] (gleicher Breakpoint wie Container)`
    )
  }
})

test('kein Segment traegt noch eine verwaiste "sm:"-Mindestbreiten- oder Border-Umschaltung (alter, zu frueher Breakpoint vollstaendig entfernt)', () => {
  assert.doesNotMatch(bar, /sm:min-w-\[/)
  assert.doesNotMatch(bar, /sm:border-l/)
  assert.doesNotMatch(bar, /sm:border-b-0/)
  assert.doesNotMatch(bar, /sm:py-4/)
})

// Auftrag "Bandfinder-Redesign -- Layout-Nachgang": die Suche wird auf
// Desktop ans rechte Ende der Bar verschoben und dafuer bewusst zweimal
// gerendert (mobile Kopfzeile links neben dem Filter-Zugang, Desktop als
// Segment 6 rechts aussen) -- siehe renderSearchField()-Kommentar in
// BandExplorer.tsx. Beide Instanzen bleiben ohne eigene Mindestbreite.
test('beide Such-Instanzen (mobile Kopfzeile, Desktop-Segment 6) bleiben ohne eigene Mindestbreite (flex-1 min-w-0) -- bewusst die einzigen schrumpfenden Segmente', () => {
  const mobileStart = bar.indexOf('Mobile Kopfzeile')
  assert.ok(mobileStart >= 0, 'Mobile Kopfzeile nicht gefunden')
  const mobileEnd = bar.indexOf('</div>', bar.indexOf('renderSearchField()', mobileStart))
  const mobileSeg = bar.slice(mobileStart, mobileEnd)
  assert.match(mobileSeg, /flex-1 min-w-0/)
  assert.doesNotMatch(mobileSeg, /min-w-\[\d/)

  const desktopStart = bar.indexOf('Segment 6')
  assert.ok(desktopStart >= 0, 'Segment 6 (Desktop-Suche) nicht gefunden')
  const desktopEnd = bar.indexOf('</div>', bar.indexOf('renderSearchField()', desktopStart))
  const desktopSeg = bar.slice(desktopStart, desktopEnd)
  assert.match(desktopSeg, /flex-1 min-w-0/)
  assert.doesNotMatch(desktopSeg, /min-w-\[\d/)
})

test('nie zwei fokussierbare Sucheingaben gleichzeitig -- mobile Instanz ist ab lg ausgeblendet, Desktop-Instanz ist unterhalb lg ausgeblendet', () => {
  const mobileStart = bar.indexOf('Mobile Kopfzeile')
  const mobileWrapperEnd = bar.indexOf('>', bar.indexOf('<div', mobileStart)) + 1
  const mobileWrapperOpenTag = bar.slice(bar.indexOf('<div', mobileStart), mobileWrapperEnd)
  assert.match(mobileWrapperOpenTag, /flex lg:hidden/)

  const desktopStart = bar.indexOf('Segment 6')
  const desktopWrapperEnd = bar.indexOf('>', bar.indexOf('<div', desktopStart)) + 1
  const desktopWrapperOpenTag = bar.slice(bar.indexOf('<div', desktopStart), desktopWrapperEnd)
  assert.match(desktopWrapperOpenTag, /hidden lg:flex/)
})

test('Segment 4 (Bandtyp) hat im gestapelten Modus einen unteren Trenner, da es dort nicht mehr das letzte Segment ist', () => {
  const segStart = bar.indexOf('Segment 4')
  const segEnd = bar.indexOf('</button>', segStart)
  const seg = bar.slice(segStart, segEnd)
  assert.match(seg, /border-b border-pl-soft/)
})
