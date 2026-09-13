import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Admin-Pflege der Follower-
// Kennzahlen (updateBandAction, actions.ts). Testdatei liegt bewusst
// NICHT unter app/admin/bands/[id]/ (siehe socialLinksValidation.test.ts
// fuer die Begruendung -- "[id]" wird vom Node-Test-Runner als Glob-
// Zeichenklasse interpretiert).
const actionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[id]', 'actions.ts',
)
const actionsSource = readFileSync(actionsPath, 'utf8')

const pagePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[id]', 'page.tsx',
)
const pageSource = readFileSync(pagePath, 'utf8')

test('updateBandAction delegiert die Kennzahl-Entscheidung an resolveSocialMetricsWrite, kein Inline-Duplikat', () => {
  assert.match(
    actionsSource,
    /import \{\s*resolveSocialMetricsWrite,\s*parseNonNegativeIntOrNull,\s*parseNonFutureDateOrNull,/,
  )
  assert.match(actionsSource, /const metricsDecision = resolveSocialMetricsWrite\(/)
})

test('Format-/Bereichsvalidierung (Zahl, Datum) blockiert VOR jedem Schreibzugriff, wie die uebrigen validateEditBand-Felder', () => {
  const errorsIdx = actionsSource.indexOf('const errors = validateEditBand(data)')
  const igParsedIdx = actionsSource.indexOf('const igFollowersParsed = parseNonNegativeIntOrNull(')
  const redirectIdx = actionsSource.indexOf("redirect(`/admin/bands/${id}?${p.toString()}`)", igParsedIdx)
  const clientIdx = actionsSource.indexOf('const client = createAdminClient()')

  assert.ok(errorsIdx >= 0 && igParsedIdx > errorsIdx, 'Format-Validierung muss nach validateEditBand folgen')
  assert.ok(redirectIdx >= 0 && redirectIdx < clientIdx, 'ein Format-Fehler muss vor jedem DB-Zugriff (createAdminClient) redirecten')
})

test('Follower-Feld existiert nur fuer Instagram/Facebook/YouTube, nicht Spotify', () => {
  assert.match(actionsSource, /FOLLOWER_FIELD_BY_PLATFORM = \{\s*instagram: 'social_instagram_followers',\s*facebook: 'social_facebook_followers',\s*youtube: 'social_youtube_followers',\s*\} as const/)
  const followerBlockIdx = actionsSource.indexOf('const FOLLOWER_FIELD_BY_PLATFORM')
  const followerBlockEnd = actionsSource.indexOf('as const', followerBlockIdx) + 20
  const block = actionsSource.slice(followerBlockIdx, followerBlockEnd)
  assert.doesNotMatch(block, /spotify/)
})

test('current_following wird von diesem Feature nirgends geschrieben (nur current_followers)', () => {
  assert.doesNotMatch(actionsSource, /current_following:/)
})

test('Zahl geleert -> current_followers UND last_checked_at werden gemeinsam auf null gesetzt', () => {
  const idx = actionsSource.indexOf("metricsDecision.action === 'clear'")
  assert.ok(idx >= 0, "'clear'-Zweig nicht gefunden")
  const body = actionsSource.slice(idx, idx + 300)
  assert.match(body, /current_followers: null, last_checked_at: null/)
})

test('bei Ambiguitaet (Duplikat) oder Loeschen wird die Kennzahl nicht angefasst', () => {
  const idx = actionsSource.indexOf('if (followersField && decision.action')
  assert.ok(idx >= 0)
  const line = actionsSource.slice(idx, idx + 200)
  assert.match(line, /decision\.action !== 'delete'/)
  assert.match(line, /decision\.action !== 'skip_duplicate'/)
})

// ── page.tsx: Formularfelder ────────────────────────────────────────────

test('page.tsx rendert je Plattform ein Follower-Zahlenfeld und einen Bestaetigungs-Haken', () => {
  for (const key of ['instagram', 'facebook', 'youtube']) {
    assert.match(pageSource, new RegExp(`name=\\{\\\`social_\\$\\{key\\}_followers\\\`\\}`))
  }
  assert.match(pageSource, /name=\{`social_\$\{key\}_checked`\}/)
  assert.match(pageSource, /value="1"/)
})

test('Facebook ist eindeutig als "Seiten-Follower" beschriftet', () => {
  assert.match(pageSource, /Facebook-Seiten-Follower/)
})

test('gemeinsames Feld "Zahlen geprüft am" existiert genau einmal (nicht pro Plattform dupliziert)', () => {
  const matches = pageSource.match(/name="social_followers_checked_at"/g) ?? []
  assert.equal(matches.length, 1)
  assert.match(pageSource, />\s*Zahlen geprüft am\s*</)
})

test('Datumsfeld schlaegt das heutige Datum vor, bleibt aber ein normales, ueberschreibbares <input type="date">', () => {
  assert.match(pageSource, /defaultValue=\{todayIso\}/)
  assert.match(pageSource, /id="social_followers_checked_at"[\s\S]{0,200}type="date"/)
})
