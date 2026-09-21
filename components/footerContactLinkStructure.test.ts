import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer Paket 3 (Footer-Kontakt-Link).
const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'Footer.tsx')
const source = readFileSync(sourcePath, 'utf8')

test('Footer-Link "Kontakt" zeigt auf /kontakt, nicht mehr auf #', () => {
  assert.match(source, /<Link href="\/kontakt" className="hover:text-pl-on-stage motion-safe:transition-colors">\r?\n\s*Kontakt/)
  assert.ok(!/href="#"/.test(source), 'kein href="#" mehr im Footer')
})

test('Footer enthaelt genau einen Link "Musiker hinter den Bands" auf /musiker, direkt nach "Für Bands" (Auftrag "Musikerübersicht unter /musiker anlegen")', () => {
  const matches = source.match(/<Link href="\/musiker" className="hover:text-pl-on-stage motion-safe:transition-colors">\s*Musiker hinter den Bands\s*<\/Link>/g) ?? []
  assert.equal(matches.length, 1)
  const fuerBandsIdx = source.indexOf('Für Bands')
  const musikerIdx = source.indexOf('Musiker hinter den Bands')
  const kontaktIdx = source.indexOf('Kontakt')
  assert.ok(fuerBandsIdx < musikerIdx && musikerIdx < kontaktIdx, 'Reihenfolge muss "Für Bands" -> "Musiker hinter den Bands" -> "Kontakt" sein')
})

test('kein anderer Footer-Link wurde veraendert', () => {
  assert.match(source, /<Link href="\/" aria-label="Zur Startseite">/)
  assert.match(source, /<Link href="\/ueber-mich" className="hover:text-pl-on-stage motion-safe:transition-colors">\r?\n\s*Über Proudleut/)
  assert.match(source, /<Link href="\/fuer-bands" className="hover:text-pl-on-stage motion-safe:transition-colors">\r?\n\s*Für Bands/)
  assert.match(source, /<Link href="\/impressum" className="hover:text-pl-on-stage motion-safe:transition-colors">\r?\n\s*Impressum/)
  assert.match(source, /<Link href="\/datenschutz" className="hover:text-pl-on-stage motion-safe:transition-colors">\r?\n\s*Datenschutz/)
})
