import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regressionspruefung fuer einen React-Key-Kollisionsfehler in
// MarkdownText.tsx, live an einem echten Bandprofil entdeckt (Konsole:
// "Encountered two children with the same key, `0-0`"): renderInline()
// wurde separat pro Zeile eines mehrzeiligen Absatzes (einfaches \n, kein
// neuer Absatz) aufgerufen, matchCount startete dabei jedes Mal wieder bei
// 0 -- zwei **fett**/[Link]-Treffer auf unterschiedlichen Zeilen desselben
// Absatzes erhielten dadurch denselben Key (`${paraIndex}-${matchCount}`)
// innerhalb desselben <p>. Kein jsdom in diesem Repo -- strukturelle
// Pruefung des Fixes: lineIndex muss Teil des Keys sein.
const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'MarkdownText.tsx'),
  'utf8',
)

test('renderInline() erhaelt lineIndex als eigenen Parameter (nicht nur paraIndex)', () => {
  assert.match(source, /function renderInline\(segment: string, paraIndex: number, lineIndex: number\)/)
})

test('der Inline-Element-Key enthaelt paraIndex, lineIndex UND einen laufenden Zaehler -- keine zwei Zeilen desselben Absatzes koennen mehr denselben Key erzeugen', () => {
  assert.match(source, /const key = `\$\{paraIndex\}-\$\{lineIndex\}-\$\{matchCount\+\+\}`/)
})

test('renderParagraph ruft renderInline mit lineIndex auf (nicht nur mit line, paraIndex)', () => {
  assert.match(source, /renderInline\(line, paraIndex, lineIndex\)/)
})
