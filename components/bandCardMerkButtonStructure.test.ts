import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Merkfunktion auf BandCard
// (Auftrag "Bandfinder-Redesign").
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandCard.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('Merk-Button ist ein Optin (showMerkButton-Prop), Standard bleibt unveraendert (Homepage/"Aehnliche Baender")', () => {
  assert.match(source, /showMerkButton\?:\s*boolean;/)
  assert.match(source, /\{showMerkButton && \(/)
})

test('nutzt den bestehenden globalen Merkliste-Store, kein neuer State', () => {
  assert.match(source, /import \{ useAnfrageStore \} from ['"]@\/stores\/anfrageStore['"]/)
  assert.match(source, /useAnfrageStore\(\(s\) => s\.isSelected\)/)
  assert.match(source, /useAnfrageStore\(\(s\) => s\.addBand\)/)
  assert.match(source, /useAnfrageStore\(\(s\) => s\.removeBand\)/)
})

test('Merk-Button und Bandprofil-Link sind unabhaengig bedienbar: kein <button> mehr innerhalb eines <a> verschachtelt', () => {
  // Aeusseres Element ist jetzt ein <div>, nicht mehr <Link>
  assert.match(source, /<div\s*\r?\n\s*className="group relative rounded-xl/)
  assert.ok(!/<Link[^>]*>\s*\r?\n[\s\S]*?<button/.test(source), 'Button darf nicht mehr innerhalb von <Link> liegen')
  assert.match(source, /handleMerken\(e: MouseEvent\)/)
  assert.match(source, /e\.preventDefault\(\);\s*\r?\n\s*e\.stopPropagation\(\);/)
})

test('gestreckter Profil-Link bleibt ueber die ganze Karte klickbar und eindeutig beschriftet', () => {
  assert.match(source, /<Link\s*\r?\n\s*href=\{`\/band\/\$\{band\.slug\}`\}\s*\r?\n\s*aria-label=\{`Zum Bandprofil: \$\{band\.name\}`\}\s*\r?\n\s*className="absolute inset-0 z-0/)
})

test('Herz-Zustand spiegelt isSelected() wider (gefuellt = gemerkt)', () => {
  assert.match(source, /fill=\{isGemerkt \? 'var\(--pl-accent\)' : 'none'\}/)
  assert.match(source, /aria-pressed=\{isGemerkt\}/)
})
