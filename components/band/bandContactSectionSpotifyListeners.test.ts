import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Spotify-Kennzahl "Monatliche
// Hoerer*innen" in BandContactSection.tsx (kein jsdom vorhanden, gleiches
// Muster wie bandContactSectionFollowerCounts.test.ts).
const dir = path.dirname(fileURLToPath(import.meta.url))
const source = readFileSync(path.join(dir, 'BandContactSection.tsx'), 'utf8')

test('eigene Zeile mit Bezeichnung "Monatliche Hörer*innen", nie als Follower/Abonnenten bezeichnet', () => {
  assert.match(source, />Monatliche Hörer\*innen</)
  const idx = source.indexOf('{listeners && (')
  assert.ok(idx >= 0, 'Listeners-Block nicht gefunden')
  const block = source.slice(idx, source.indexOf('</a>', idx))
  // formatFollowerCount ist nur der Name der (wiederverwendeten) Zahlenformatierung.
  assert.doesNotMatch(block, /Follower(?!Count)|Abonnenten/)
})

test('eigenes Spotify-Datum nur ueber die Anzeigeregel shouldShowOwnListenersStand (keine Doppelung mit dem gemeinsamen Stand)', () => {
  const idx = source.indexOf('{listeners && (')
  const block = source.slice(idx, source.indexOf('</a>', idx))
  assert.match(block, /\{showListenersOwnStand && \(/)
  assert.match(block, /Stand: \{formatStandDate\(listeners\.asOf\)\}/)
  assert.match(source, /shouldShowOwnListenersStand\(spotifyListeners\.asOf, standDisplay\)/)
  // Die Regel selbst haengt nicht am Follower-Stand-Ergebnis im JSX-Block.
  assert.doesNotMatch(block, /standDisplay/)
})

test('Spotify fliesst nicht in resolveFollowerStandDisplay ein (nur Follower-Metriken)', () => {
  const idx = source.indexOf('resolveFollowerStandDisplay(\n')
  const idxCrlf = source.indexOf('resolveFollowerStandDisplay(\r\n')
  const start = idx >= 0 ? idx : idxCrlf
  assert.ok(start >= 0)
  const call = source.slice(start, source.indexOf(');', start))
  assert.match(call, /l\.metric/)
  assert.doesNotMatch(call, /listeners/)
})

test('12-Monats-Regel unveraendert ueber die zentrale Sichtbarkeitsfunktion', () => {
  assert.match(source, /isFollowerCountVisible\(\s*spotifyListenersRaw\?\.count,\s*spotifyListenersRaw\?\.asOf,\s*\)/)
})

test('Spotify-Zeile bleibt genau EIN Link (keine verschachtelten <a>)', () => {
  const liStart = source.indexOf('{links.map(')
  const liEnd = source.indexOf('</ul>', liStart)
  assert.equal((source.slice(liStart, liEnd).match(/<a\b/g) ?? []).length, 1)
})
