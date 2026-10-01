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

test('nutzt die zentrale, ausgelagerte Zahlenformatierung statt einer eigenen -- keine Abkuerzungen wie "5,2k"', () => {
  // formatFollowerCount/formatStandDate/formatStandMonthYear leben seit
  // "Section 03 erweitern" in lib/socialLinks/formatFollowerMetrics.ts
  // (auch von components/homepage/BandEinschaetzen.tsx genutzt) --
  // BandContactSection.tsx importiert sie nur noch, statt sie selbst zu
  // definieren.
  assert.match(
    source,
    /import \{ formatFollowerCount, formatStandDate, formatStandMonthYear \} from '@\/lib\/socialLinks\/formatFollowerMetrics'/
  )
  assert.doesNotMatch(source, /function formatFollowerCount/)
  assert.doesNotMatch(source, /toLocaleString\('de-DE'\)/)
  // Nur den JSX-Rueckgabewert der Hauptkomponente pruefen (nicht die
  // fruehen `return (` der einzelnen Icon-Funktionen) -- sonst false
  // positive durch unabhaengigen Text.
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

test('jede Pill bleibt genau EIN Link (Label+Zahl in derselben <a>, keine verschachtelten Links)', () => {
  const liStart = source.indexOf('{links.map(')
  const liEnd = source.indexOf('</ul>', liStart)
  const body = source.slice(liStart, liEnd)
  const anchorOpenings = body.match(/<a\b/g) ?? []
  assert.equal(anchorOpenings.length, 1, 'genau ein <a>-Tag pro map()-Aufruf-Template erwartet')
})

test('Pill (Prototyp E): Label fett, Zahl und Einheit gedaempft (text-pl-text-muted), ohne Icons', () => {
  assert.match(source, /<strong className="font-bold">\{label\}<\/strong>/)
  assert.match(source, /text-pl-text-muted">\s*<span>\s*\{formatFollowerCount\(metric\.count\)\} \{metric\.unit\}/)
  assert.doesNotMatch(source, /<svg|Icon\b/)
})

test('ohne jeden Link entfaellt die Zeile komplett (return null), keine leere Zeile', () => {
  assert.match(source, /if \(links\.length === 0\) return null;/)
})

test('"Mehr von [Band]" ist eine BandRow mit h2-Label (Zwischenueberschrift bleibt semantisch erhalten)', () => {
  assert.match(source, /<BandRow label=\{`Mehr von \$\{band\.name\}`\} labelAs="h2"/)
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

test('bei "shared" wird strukturell genau EINE gemeinsame Datumszeile ausserhalb der <ul> gerendert -- nicht je Metrik eine', () => {
  // resolveFollowerStandDisplay liefert bei 'shared' genau einen
  // checkedAt-Wert (kein Array) und es gibt im Quelltext nur EINE
  // Stelle, die auf standDisplay.kind === 'shared' prueft und dabei ein
  // <p> rendert -- das schliesst strukturell aus, dass bei mehreren
  // Plattformen mit identischem Pruefdatum mehrere Zeilen entstehen.
  const sharedGuardMatches = source.match(/standDisplay\.kind === 'shared'/g) ?? []
  assert.equal(sharedGuardMatches.length, 1, 'genau eine "shared"-Pruefstelle erwartet')

  const ulEnd = source.indexOf('</ul>')
  assert.ok(ulEnd >= 0)
  const afterUl = source.slice(ulEnd)
  const sharedBlock = afterUl.match(/standDisplay\.kind === 'shared' && \(([\s\S]*?)\)\}/)
  assert.ok(sharedBlock, 'gemeinsame Datumszeile nicht ausserhalb der <ul> gefunden')
  const pTagsInBlock = sharedBlock![1].match(/<p\b/g) ?? []
  assert.equal(pTagsInBlock.length, 1, 'genau ein <p> fuer den gemeinsamen Pruefstand erwartet')
})

test('Einordnungssatz unter den Zahlen: nur sichtbar, wenn mindestens eine Kennzahl (Follower ODER Hoerer*innen) tatsaechlich sichtbar ist', () => {
  assert.match(
    source,
    /const hasVisibleMetric = links\.some\(\(l\) => l\.metric \|\| l\.listeners\)/,
    'hasVisibleMetric muss aus bereits sichtbar entschiedenen Metriken/Listeners abgeleitet werden, nicht aus hasLinks (das waere schon bei reinen Links ohne Werte wahr)'
  )

  const idx = source.indexOf('{hasVisibleMetric && (')
  assert.ok(idx >= 0, 'Satz muss ueber {hasVisibleMetric && (...)} gerendert werden')
  const block = source.slice(idx, source.indexOf(')}', idx) + 2)
  assert.match(
    block,
    /Die Zahlen zeigen die Online-Präsenz, nicht die Qualität einer Band oder wie gut sie zu eurem Fest passt\./
  )
  assert.match(block, /text-xs text-pl-text-hint/, 'gleiche Groesse/Farbe wie die Stand-Zeile')
  assert.doesNotMatch(block, /font-semibold/, 'bleibt so zurueckhaltend wie die Stand-Zeile, nicht hervorgehoben')

  // Direkt unter der Stand-Zeile: der Satz-Block folgt im Quelltext auf den
  // "shared"-Stand-Block, beide innerhalb derselben "Mehr von [Band]"-Spalte.
  const sharedIdx = source.indexOf("standDisplay.kind === 'shared' && (")
  assert.ok(sharedIdx >= 0)
  assert.ok(idx > sharedIdx, 'Einordnungssatz muss im Quelltext nach der Stand-Zeile stehen')
})

test('Stand-Zeile und Einordnungssatz stehen linksbuendig unter den Pills (Prototyp E), nicht mehr rechtsbuendig', () => {
  const sharedIdx = source.indexOf("standDisplay.kind === 'shared' && (")
  assert.ok(sharedIdx >= 0)
  const sharedBlock = source.slice(sharedIdx, source.indexOf(')}', sharedIdx) + 2)
  assert.match(sharedBlock, /mt-3 text-xs text-pl-text-hint/)
  assert.doesNotMatch(sharedBlock, /text-right|max-w-sm/)

  const hintIdx = source.indexOf('{hasVisibleMetric && (')
  assert.ok(hintIdx >= 0)
  const hintBlock = source.slice(hintIdx, source.indexOf(')}', hintIdx) + 2)
  assert.match(hintBlock, /text-xs text-pl-text-hint/)
  assert.doesNotMatch(hintBlock, /text-right|max-w-sm/)
})

test('Website und Spotify erhalten keine Kennzahl (kein metric-Feld in ihren LinkItems)', () => {
  const websiteLine = source.match(/websiteUrl \? \{[^}]*\}/)?.[0] ?? ''
  const spotifyLine = source.match(/band\.socialLinks\.spotify \? \{[^}]*\}/)?.[0] ?? ''
  assert.doesNotMatch(websiteLine, /metric:/)
  assert.doesNotMatch(spotifyLine, /metric:/)
})
