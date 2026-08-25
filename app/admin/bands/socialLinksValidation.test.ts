import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { isValidUrl } from '../../../lib/bandIntro/validation.ts'

// Testdatei liegt bewusst NICHT unter app/admin/bands/[id]/ selbst: `node
// --test` interpretiert "[id]" im Dateipfad als Glob-Zeichenklasse
// (bestaetigtes Verhalten, siehe app/admin/moods/moodBandsEditorStructure.test.ts)
// und findet die Datei dort nicht -- unabhaengig von der Shell. Der
// Quellpfad wird stattdessen relativ von hier aus referenziert (kein
// Glob, `readFileSync` ist davon nicht betroffen).
const actionsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[id]', 'actions.ts',
)
const source = readFileSync(actionsPath, 'utf8')

// ─────────────────────────────────────────
// 1. Die geforderte Validierungs-Matrix (Auftrag "Social-Media-Links im
// Band-Admin editierbar machen", Abschnitt Tests) direkt gegen die
// wiederverwendete, bereits bestehende URL-Validierung (isValidUrl)
// pruefen -- das ist exakt die Funktion, die validateEditBand fuer die
// vier neuen Social-Felder aufruft (strukturell unten bestaetigt).
// ─────────────────────────────────────────

test('Validierungs-Matrix: https/http erlaubt', () => {
  assert.equal(isValidUrl('https://instagram.com/example', 500), true)
  assert.equal(isValidUrl('http://instagram.com/example', 500), true)
})

test('Validierungs-Matrix: javascript:/data:/file: abgelehnt', () => {
  assert.equal(isValidUrl('javascript:alert(1)', 500), false)
  assert.equal(isValidUrl('data:text/html,<script>alert(1)</script>', 500), false)
  assert.equal(isValidUrl('file:///etc/passwd', 500), false)
})

test('Validierungs-Matrix: syntaktisch ungueltiger Text abgelehnt', () => {
  assert.equal(isValidUrl('nicht-mal-eine-url', 500), false)
  assert.equal(isValidUrl('www.instagram.com/example', 500), false) // ohne Schema
})

test('Validierungs-Matrix: "leer" wird NICHT durch isValidUrl selbst geprueft -- der Aufrufer muss leer separat als erlaubt behandeln', () => {
  // isValidUrl('') ist bewusst false (kein gueltiges URL-Format) -- die
  // Erlaubtheit von "leer" wird in validateEditBand VOR dem Aufruf von
  // isValidUrl behandelt (siehe struktureller Test unten). Dieser Test
  // dokumentiert diese Grenze explizit, damit sie nicht stillschweigend
  // falsch angenommen wird.
  assert.equal(isValidUrl('', 500), false)
})

// ─────────────────────────────────────────
// 2. Strukturelle Bestaetigung, dass actions.ts diese Regeln tatsaechlich
// so verdrahtet (leer erlaubt, sonst isValidUrl) -- 'use server'-Dateien
// mit next/navigation-Import lassen sich nicht direkt unter plain `node
// --test` ausfuehren (identisches, bereits etabliertes Problem wie bei
// 'use client'-Komponenten, siehe lib/bands/bandExplorerMoodUrlState.test.ts).
// ─────────────────────────────────────────

test('validateEditBand: leeres Social-Feld wird nicht an isValidUrl uebergeben (leer = erlaubt)', () => {
  assert.match(source, /if \(value !== '' && !isValidUrl\(value, MAX_LENGTHS\.websiteUrl\)\) \{/)
})

test('validateEditBand: alle vier neuen Social-Felder werden validiert', () => {
  assert.match(
    source,
    /const SOCIAL_URL_FIELDS = \['social_instagram', 'social_facebook', 'social_youtube', 'social_spotify'\] as const/,
  )
})

test('updateBandAction: Social-Schreibentscheidung wird an resolveSocialLinkWrite delegiert, kein Inline-Duplikat der Fall-Logik', () => {
  assert.match(source, /import \{ resolveSocialLinkWrite \} from '@\/lib\/socialLinks\/resolveSocialLinkWrite'/)
  assert.match(source, /const decision = resolveSocialLinkWrite\(existingRows \?\? \[\], submittedUrl\)/)
})

test('updateBandAction: social_profiles wird NICHT blind per upsert geschrieben (kein upsert(...) fuer social_profiles)', () => {
  const socialSectionStart = source.indexOf('SOCIAL_PLATFORM_FIELDS')
  assert.ok(socialSectionStart >= 0, 'Social-Links-Abschnitt nicht gefunden')
  const socialSection = source.slice(socialSectionStart)
  assert.doesNotMatch(socialSection, /from\('social_profiles'\)\s*\n?\s*\.upsert/)
})

test('updateBandAction: blocked_has_metadata setzt eine sichtbare Fehlermeldung statt stillem Verwerfen', () => {
  assert.match(source, /case 'blocked_has_metadata':/)
  const idx = source.indexOf("case 'blocked_has_metadata':")
  const body = source.slice(idx, idx + 800)
  assert.match(body, /socialErrors\[field\] =/)
  assert.match(body, /konnte nicht entfernt werden/)
})

test('YouTube-Video-Link bleibt unberuehrt: Social-Schreiblogik referenziert ausschliesslich social_profiles, nicht videos/getYouTubeEmbedUrl', () => {
  const socialSectionStart = source.indexOf('SOCIAL_PLATFORM_FIELDS')
  const socialSectionEnd = source.indexOf('redirect(`/admin/bands/${id}?saved=1`)', socialSectionStart)
  const socialSection = source.slice(socialSectionStart, socialSectionEnd)
  assert.doesNotMatch(socialSection, /getYouTubeEmbedUrl|from\('videos'\)/)
})
