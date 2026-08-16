import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regressionsschutz fuer Codex-P1 (urspruenglich PR #24, seither bei jedem
// Hero-Redesign erneut geprueft): Inhalt darf mobil NICHT absolut
// positioniert sein, sonst kann er von overflow-hidden abgeschnitten
// werden, sobald die Anlass-Buttons auf schmalen Breiten umbrechen.
//
// Seit dem "finales Claude-Design"-Redesign (dieser Auftrag) besteht der
// Hero aus zwei getrennten, sich gegenseitig ausschliessenden Baeumen
// (`hidden md:block` fuer Desktop, `md:hidden` fuer Mobil) statt einem
// einzelnen Content-Wrapper mit responsiven Breakpoint-Praefixen -- die
// Pruefung testet deshalb beide Baeume separat.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'homepage', 'HeroMosaic.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

// className robust extrahieren, unabhaengig davon, ob weitere Attribute
// (z. B. ref=) vor className auf demselben <div> stehen.
function extractDivClassName(marker: string): string {
  const markerIndex = source.indexOf(marker)
  assert.ok(markerIndex >= 0, `Marker nicht gefunden: ${marker}`)
  const divStart = source.indexOf('<div', markerIndex)
  assert.ok(divStart >= 0, `<div> nach Marker nicht gefunden: ${marker}`)
  const tagEnd = source.indexOf('>', divStart)
  const tag = source.slice(divStart, tagEnd)
  const classMatch = tag.match(/className="([^"]*)"/)
  assert.ok(classMatch, `className auf <div> nach Marker nicht gefunden: ${marker}`)
  return classMatch[1]
}

test('Mobiler Baum ist ausschliesslich <md sichtbar und NICHT absolut positioniert', () => {
  const className = extractDivClassName('{/* Mobil:')
  assert.match(className, /(^|\s)md:hidden(\s|$)/)
  const baseClasses = className.split(/\s+/).filter((c) => !/^[a-z0-9-]+:/.test(c))
  assert.ok(!baseClasses.includes('absolute'), `erwartet keine unbedingte "absolute"-Klasse, gefunden: ${className}`)
})

test('Desktop-Baum ist ausschliesslich ab md sichtbar (hidden md:block)', () => {
  const className = extractDivClassName('{/* Desktop:')
  assert.match(className, /(^|\s)hidden(\s|$)/)
  assert.match(className, /(^|\s)md:block(\s|$)/)
})

test('Desktop-Hero behaelt die bestehende Mindesthoehe/-begrenzung', () => {
  assert.match(source, /h-\[max\(660px,85svh\)\] max-h-\[900px\]/)
})

test('prefers-reduced-motion wird fuer die Schwebe-Animation respektiert (globals.css)', () => {
  const cssPath = path.join(path.dirname(sourcePath), '..', '..', 'app', 'globals.css')
  const css = readFileSync(cssPath, 'utf8')
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /\.pl-hero-float\s*\{\s*animation:\s*none\s*!important;?\s*\}/)
})
