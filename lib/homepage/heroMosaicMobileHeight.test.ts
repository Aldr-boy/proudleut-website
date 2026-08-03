import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Regressionsschutz fuer Codex-P1 (Re-Review PR #24): auf schmalen
// Smartphone-Breiten (320-390px) konnten die zwei Chip-Reihen auf bis zu
// sechs Zeilen umbrechen. Der Inhalt war vollstaendig absolut positioniert
// (absolute inset-0) und stand damit ausserhalb des normalen Dokument-
// flusses -- er konnte die feste min-h-[520px] der Hero-Section nicht
// strecken. Dadurch wurde der Inhalt (v. a. der CTA "Bands entdecken") von
// overflow-hidden am unteren Rand abgeschnitten.
//
// Bewusst KEIN Test, der die vollstaendige Tailwind-Klassenkette des
// Content-Wrappers festschreibt (waere bruechig gegenueber unabhaengigen
// Styling-Aenderungen) -- geprueft wird nur die strukturelle Invariante,
// die den Fehler tatsaechlich behebt: der Content-Wrapper darf mobil
// (ohne Breakpoint-Praefix) nicht mehr absolut positioniert sein, damit
// er im normalen Fluss selbst ueber seine Hoehe bestimmt und die Section
// per min-h-[520px] automatisch mitwaechst -- robust unabhaengig davon,
// auf wie viele Zeilen die Chips im Einzelfall umbrechen. Ab md bleibt das
// bisherige, unveraenderte Desktop-/Tablet-Verhalten (absolute inset-0)
// erhalten.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'components', 'homepage', 'HeroMosaic.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

function extractContentWrapperClassName(): string {
  const marker = '{/* Content --'
  const startIndex = source.indexOf(marker)
  assert.ok(startIndex >= 0, 'Content-Wrapper-Kommentar nicht gefunden')
  const divStart = source.indexOf('<div className="', startIndex)
  assert.ok(divStart >= 0, 'Content-Wrapper-<div> nicht gefunden')
  const classStart = divStart + '<div className="'.length
  const classEnd = source.indexOf('"', classStart)
  return source.slice(classStart, classEnd)
}

test('Content-Wrapper ist mobil (ohne Breakpoint-Praefix) NICHT absolut positioniert -- bestimmt seine Hoehe selbst im Dokumentfluss', () => {
  const className = extractContentWrapperClassName()
  const baseClasses = className.split(/\s+/).filter((c) => !/^[a-z0-9-]+:/.test(c))
  assert.ok(!baseClasses.includes('absolute'), `erwartet keine unbedingte "absolute"-Klasse, gefunden: ${className}`)
})

test('Content-Wrapper wird ab md wie zuvor absolut positioniert (Desktop-/Tablet-Verhalten unveraendert)', () => {
  const className = extractContentWrapperClassName()
  assert.match(className, /(^|\s)md:absolute(\s|$)/)
  assert.match(className, /(^|\s)md:inset-0(\s|$)/)
})

test('Hero-Section behaelt die bestehende Mindesthoehe/-begrenzung und overflow-hidden unveraendert', () => {
  assert.match(source, /min-h-\[520px\] md:min-h-\[680px\] lg:h-\[85svh\] lg:max-h-\[900px\]/)
  assert.match(source, /className="relative overflow-hidden bg-pl-stage/)
})
