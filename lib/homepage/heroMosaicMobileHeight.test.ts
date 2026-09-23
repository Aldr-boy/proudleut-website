import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regressionsschutz fuer Codex-P1 (urspruenglich PR #24, seither bei jedem
// Hero-Redesign erneut geprueft): Content darf NICHT absolut positioniert
// sein, sonst kann er von overflow-hidden abgeschnitten werden, sobald die
// Anlass-Buttons auf schmalen Breiten umbrechen.
//
// Seit "Dichtes Mosaik + klarer Einstieg" (dieser Auftrag) gibt es nur noch
// EINEN gemeinsamen Content-Block fuer alle Breiten (kein getrennter
// Mobil-/Desktop-Baum mehr) -- nur das Bildraster im Hintergrund
// unterscheidet sich responsiv (hidden lg:grid / lg:hidden). Der Grundsatz
// "Content nie absolute" gilt unveraendert und wird hier weiterhin explizit
// geprueft.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'homepage', 'HeroMosaic.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

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

test('Content-Block ist NICHT absolut positioniert (Codex-P1: darf durch overflow-hidden nie abgeschnitten werden)', () => {
  const className = extractDivClassName('{/* Content --')
  const baseClasses = className.split(/\s+/).filter((c) => !/^[a-z0-9-]+:/.test(c))
  assert.ok(!baseClasses.includes('absolute'), `erwartet keine unbedingte "absolute"-Klasse, gefunden: ${className}`)
  assert.ok(baseClasses.includes('relative'), 'Content-Block sollte "relative" sein (fuer z-index gegenueber dem Bildraster)')
})

test('Desktop-Bilderwand ist erst ab lg (1024px) sichtbar, Mobil-Bilderwand nur darunter', () => {
  // Beide Spaltenstaende rendern ueber die gemeinsame
  // <MosaicColumns>-Hilfskomponente (Masonry-Flex-Spalten, Auftrag
  // "Webflow-Prinzip + Next.js-Einstieg"); die responsiven Klassen werden
  // als className-Prop am jeweiligen Aufruf uebergeben (kein literales
  // <div> an dieser Stelle im JSX).
  function extractMosaicColumnsClassName(columnsProp: string): string {
    const callStart = source.indexOf(`<MosaicColumns\n        columns={${columnsProp}}`)
    assert.ok(callStart >= 0, `<MosaicColumns columns={${columnsProp}} .../> nicht gefunden`)
    const callEnd = source.indexOf('/>', callStart)
    const call = source.slice(callStart, callEnd)
    const classMatch = call.match(/className="([^"]*)"/)
    assert.ok(classMatch, `className-Prop am <MosaicColumns columns={${columnsProp}}>-Aufruf nicht gefunden`)
    return classMatch[1]
  }

  const desktopClassName = extractMosaicColumnsClassName('DESKTOP_COLUMNS')
  assert.match(desktopClassName, /(^|\s)hidden(\s|$)/)
  assert.match(desktopClassName, /(^|\s)lg:flex(\s|$)/)

  const mobileClassName = extractMosaicColumnsClassName('MOBILE_COLUMNS')
  assert.match(mobileClassName, /(^|\s)lg:hidden(\s|$)/)
})

test('Section hat keine feste Hoehe, sondern nur einen Mindesthoehen-Bodensatz (Hoehe folgt dem Content, nicht umgekehrt)', () => {
  const sectionStart = source.indexOf('<section')
  const sectionTagEnd = source.indexOf('>', sectionStart)
  const sectionTag = source.slice(sectionStart, sectionTagEnd)
  assert.match(sectionTag, /min-h-\[600px\]/)
  assert.doesNotMatch(sectionTag, /(^|\s)h-\[/, 'Section darf keine feste Hoehe erzwingen -- Content bestimmt die tatsaechliche Hoehe')
})

test('keine automatische Schwebe-Animation mehr vorhanden (globals.css und Komponente bereinigt)', () => {
  const cssPath = path.join(path.dirname(sourcePath), '..', '..', 'app', 'globals.css')
  const css = readFileSync(cssPath, 'utf8')
  assert.doesNotMatch(css, /pl-hero-float/, 'pl-hero-float-Keyframes/Klasse muessen aus globals.css entfernt sein')
  assert.doesNotMatch(source, /pl-hero-float/, 'HeroMosaic.tsx darf pl-hero-float nicht mehr referenzieren')
})
