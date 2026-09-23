import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer den Fix "fest positionierte Leisten
// ueberdecken den Footer" (Auftrag "Fix fest positionierte Leisten"). Ein
// echter Rendertest ist in diesem Projekt ohne React-Test-Harness nicht
// eingerichtet -- identisches Prinzip wie components/band/
// BandFloatingCta.test.ts. Die Ueberdeckung der Footer-Rechtszeile wurde
// zusaetzlich real im Browser per Playwright verifiziert (siehe
// Abschlussbericht). Der bestehende components/band/
// merklisteFlowStructure.test.ts deckt ausschliesslich MerklisteFlow.tsx/
// AnfrageModal.tsx ab, nicht die Positionierung dieser Datei.
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'MerklisteBar.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('Platzhalter im normalen Fluss reserviert die Leistenhoehe, aria-hidden, direkt neben der fixen Leiste', () => {
  assert.match(source, /<div aria-hidden="true" style=\{\{ height: placeholderHeight \}\} \/>/)
})

test('Platzhalter-Hoehe wird live per ResizeObserver auf die tatsaechliche Leistenhoehe gemessen', () => {
  assert.match(source, /const ro = new ResizeObserver\(\(\) => setPlaceholderHeight\(el\.offsetHeight\)\)/)
  assert.match(source, /ro\.observe\(el\)/)
  assert.match(source, /return \(\) => ro\.disconnect\(\)/)
})

test('Platzhalter nur wirksam, wenn die Leiste tatsaechlich sichtbar ist (hasBands), sonst Hoehe 0', () => {
  assert.match(source, /const hasBands = bands\.length > 0;/)
  assert.match(source, /\}, \[hasBands\]\)/)
  assert.match(source, /if \(!el\) \{\s*\r?\n\s*setPlaceholderHeight\(0\);/)
  assert.match(source, /if \(!hasBands\) return null;/)
})

test('env(safe-area-inset-bottom) ergaenzt, keine neuen Farb-Token oder Hex-Werte', () => {
  assert.match(source, /pb-\[env\(safe-area-inset-bottom\)\]/)
  assert.ok(!/#[0-9a-fA-F]{3,6}/.test(source), 'keine neuen hartcodierten Hex-Farben')
})

test('layout.tsx und Footer.tsx werden nicht importiert -- Fix bleibt vollstaendig innerhalb dieser Datei', () => {
  assert.ok(!/^import .*layout['"]/m.test(source))
  assert.ok(!/^import .*Footer['"]/m.test(source))
})

test('Merklisten-Funktion, Inhalt und Animation bleiben unveraendert', () => {
  assert.match(source, /motion-safe:animate-\[slideUp_0\.2s_ease\]/)
  assert.match(source, /Merkliste ansehen/)
  assert.match(source, /bands\.length === 1 \? '1 Band gemerkt' : `\$\{bands\.length\} Bands gemerkt`/)
  assert.match(source, /<MerklisteFlow isOpen=\{modalOpen\} onClose=\{\(\) => setModalOpen\(false\)\} \/>/)
})
