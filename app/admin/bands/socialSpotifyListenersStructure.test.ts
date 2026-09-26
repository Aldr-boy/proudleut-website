import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Admin-Pflege von Spotify
// "Monatliche Hoerer*innen" (updateBandAction in actions.ts, Formular in
// page.tsx). Testdatei liegt bewusst NICHT unter app/admin/bands/[id]/
// (siehe socialFollowersActionsStructure.test.ts).
const dir = path.dirname(fileURLToPath(import.meta.url))
const actionsSource = readFileSync(path.join(dir, '[id]', 'actions.ts'), 'utf8')
const pageSource = readFileSync(path.join(dir, '[id]', 'page.tsx'), 'utf8')

test('Action delegiert die Entscheidung an resolveSpotifyListenersWrite, kein Inline-Duplikat', () => {
  assert.match(actionsSource, /import \{ resolveSpotifyListenersWrite \} from '@\/lib\/socialLinks\/resolveSpotifyListenersWrite'/)
  assert.match(actionsSource, /const listenersDecision = resolveSpotifyListenersWrite\(/)
})

test('Format-/Bereichsvalidierung (Zahl, Datum) blockiert VOR jedem Schreibzugriff', () => {
  const parsedIdx = actionsSource.indexOf('const spotifyListenersParsed = parseNonNegativeIntOrNull(')
  const clientIdx = actionsSource.indexOf('const client = createAdminClient()')
  const redirectIdx = actionsSource.indexOf("redirect(`/admin/bands/${id}?${p.toString()}`)", parsedIdx)
  assert.ok(parsedIdx >= 0 && clientIdx > parsedIdx, 'Validierung muss vor createAdminClient stehen')
  assert.ok(redirectIdx >= 0 && redirectIdx < clientIdx, 'Formatfehler muss vor jedem DB-Zugriff redirecten')
})

test('Wert und Datum werden immer gemeinsam gesetzt bzw. gemeinsam geleert', () => {
  assert.match(
    actionsSource,
    /monthly_listeners: listenersDecision\.monthly_listeners,\s*monthly_listeners_as_of: listenersDecision\.monthly_listeners_as_of,/,
  )
  assert.match(actionsSource, /\.update\(\{ monthly_listeners: null, monthly_listeners_as_of: null \}\)/)
})

test('Spotify-Kennzahl wird ausschliesslich auf der Zeile mit platform spotify geschrieben', () => {
  const idx = actionsSource.indexOf('Spotify "Monatliche Hörer*innen" (nur Plattform spotify)')
  assert.ok(idx >= 0)
  const block = actionsSource.slice(idx)
  assert.match(block, /\.eq\('platform', 'spotify'\)/)
})

test('Kein Wert ohne Spotify-Link: Hinweis, zuerst den Link zu erfassen', () => {
  assert.match(actionsSource, /Bitte zuerst den Spotify-Link erfassen/)
})

test('Kennzahl ist getrennt von Follower-Feldern: Follower-Lookup enthaelt kein Spotify, keine Vermischung im Schreibpfad', () => {
  const idx = actionsSource.indexOf('const FOLLOWER_FIELD_BY_PLATFORM')
  const block = actionsSource.slice(idx, actionsSource.indexOf('as const', idx) + 8)
  assert.doesNotMatch(block, /spotify/)
  // Spotify-Schreibpfad beruehrt current_followers/last_checked_at nie.
  const spIdx = actionsSource.indexOf('Spotify "Monatliche Hörer*innen" (nur Plattform spotify)')
  const spEnd = actionsSource.indexOf('redirect(`/admin/bands/${id}?saved=1`)', spIdx)
  assert.ok(spIdx >= 0 && spEnd > spIdx)
  const spCode = actionsSource.slice(spIdx, spEnd).replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(spCode, /current_followers|last_checked_at/)
})

test('Formular: eigenes Feld + eigenes Datum, Vorbelegung heute, nur bei Spotify', () => {
  assert.match(pageSource, /name="social_spotify_monthly_listeners"/)
  assert.match(pageSource, /name="social_spotify_monthly_listeners_as_of"/)
  assert.match(pageSource, /: todayIso\}/)
  assert.match(pageSource, /key === 'spotify' && !isDuplicate/)
  assert.match(pageSource, /Zuerst den Spotify-Link speichern/)
  assert.match(pageSource, /Zahl leeren entfernt Wert und Datum/)
})
