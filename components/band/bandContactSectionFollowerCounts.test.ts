import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Follower-Zahlen-Erweiterung
// von BandContactSection.tsx ("Mehr von [Band]"). Es existiert in diesem
// Repo keine React-Testing-Infrastruktur (kein jsdom) -- die tatsaechliche
// Quelldatei wird textuell geprueft, gleiches Muster wie
// bandHeroLogoAspectRatio.test.ts.
const source = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'BandContactSection.tsx'),
  'utf8',
)

test('keine zusaetzliche Sektion/Ueberschrift -- weiterhin nur EIN <section id="band-contact-section">', () => {
  const sectionMatches = source.match(/<section\b/g) ?? []
  assert.equal(sectionMatches.length, 1, 'es darf nur die bestehende Section geben, keine neue')
  assert.doesNotMatch(source, /Social-Media-Index/i)
})

test('nutzt die zentrale Sichtbarkeitsregel, keine eigene Datums-/Schwellenwertlogik', () => {
  assert.match(source, /import \{ isFollowerCountVisible, resolveFollowerStandDisplay \} from '@\/lib\/socialLinks\/followerCountVisibility'/)
  assert.match(source, /isFollowerCountVisible\(/)
  // Keine eigene 12-Monate-/Millisekunden-Arithmetik direkt in der Komponente.
  assert.doesNotMatch(source, /getMonth\(\)\s*-\s*12/)
})

test('deutsche Zahlenformatierung (toLocaleString de-DE), keine Abkuerzungen wie "5,2k"', () => {
  assert.match(source, /toLocaleString\('de-DE'\)/)
  // Nur den JSX-Rueckgabewert der Hauptkomponente pruefen (nicht den
  // erklaerenden Kommentar oben im Modul, der die verbotene Abkuerzung
  // selbst als Beispiel nennt, und nicht die fruehen `return (` der
  // einzelnen Icon-Funktionen) -- sonst false positive durch den eigenen
  // Kommentartext.
  const componentIdx = source.indexOf('export function BandContactSection')
  assert.ok(componentIdx >= 0)
  const returnIdx = source.indexOf('return (', componentIdx)
  assert.ok(returnIdx >= 0)
  assert.doesNotMatch(source.slice(returnIdx), /\dk\b/i)
})

test('Instagram/Facebook zeigen "Follower", YouTube zeigt "Abonnenten"', () => {
  assert.match(source, /'Follower'/)
  assert.match(source, /'Abonnenten'/)
})

test('jede Zeile bleibt genau EIN Link (Icon+Label+Zahl in derselben <a>, keine verschachtelten Links)', () => {
  const liStart = source.indexOf('{links.map(')
  const liEnd = source.indexOf('</ul>', liStart)
  const body = source.slice(liStart, liEnd)
  const anchorOpenings = body.match(/<a\b/g) ?? []
  assert.equal(anchorOpenings.length, 1, 'genau ein <a>-Tag pro map()-Aufruf-Template erwartet')
})

test('Zahl ist optisch kraeftiger (font-semibold) als die Einheit (text-xs, kein font-semibold)', () => {
  assert.match(source, /font-semibold text-pl-text[^"]*"\s*>\s*\{formatFollowerCount/)
  assert.match(source, /text-xs text-pl-text-muted">\{metric\.unit\}/)
})

test('keine Following-Zahlen oder Follower\\/Following-Verhaeltnisse', () => {
  assert.doesNotMatch(source, /[Ff]ollowing/)
  assert.doesNotMatch(source, /[Vv]erh(ae|ä)ltnis/)
})

test('kein Nullwert/Platzhalter/Gedankenstrich fuer fehlende Kennzahlen -- Zeile bleibt gewoehnlicher Link ohne Metrik-Block', () => {
  assert.doesNotMatch(source, />0 Follower</)
  assert.doesNotMatch(source, /[–—]{2,}|>[–—]</)
})

test('gemeinsamer Pruefstand nur bei "shared", je Plattform nur bei "per_platform" -- niemals beides gleichzeitig', () => {
  assert.match(source, /standDisplay\.kind === 'shared'/)
  assert.match(source, /standDisplay\.kind === 'per_platform'/)
})

test('gemeinsamer Stand wird NUR aus tatsaechlich sichtbaren (bereits gefilterten) Metriken abgeleitet', () => {
  const idx = source.indexOf('resolveFollowerStandDisplay(')
  assert.ok(idx >= 0)
  const body = source.slice(idx, idx + 200)
  assert.match(body, /links\.filter\(\(l\) => l\.metric\)/)
})

test('Website und Spotify erhalten keine Kennzahl (kein metric-Feld in ihren LinkItems)', () => {
  const websiteLine = source.match(/websiteUrl \? \{[^}]*\}/)?.[0] ?? ''
  const spotifyLine = source.match(/band\.socialLinks\.spotify \? \{[^}]*\}/)?.[0] ?? ''
  assert.doesNotMatch(websiteLine, /metric:/)
  assert.doesNotMatch(spotifyLine, /metric:/)
})
