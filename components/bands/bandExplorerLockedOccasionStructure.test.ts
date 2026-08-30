import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die Wiederverwendung von
// BandExplorer auf /veranstaltung/[slug] (Paket "Finder auf
// Veranstaltungsseiten wiederverwenden"). Kein jsdom/RTL in diesem Repo --
// identisches, bereits etabliertes Muster wie
// app/admin/moods/moodBandsEditorStructure.test.ts: echte Quelldatei per
// readFileSync lesen und strukturell pruefen. Regexes bewusst \r?\n-
// tolerant, da frische Worktree-Checkouts in dieser Umgebung teils CRLF
// erzeugen (Inhalt bleibt davon unberuehrt, siehe bereits dokumentierter
// Befund aus fruehereren Runden dieser Session).
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'BandExplorer.tsx'
)
const source = readFileSync(sourcePath, 'utf8')

test('lockedOccasion ist eine optionale Prop von BandExplorer', () => {
  assert.match(source, /lockedOccasion\?:\s*string;/)
})

test('selectedCategory-Initialisierung erzwingt lockedOccasion, unabhaengig vom anlass-Query-Param', () => {
  assert.match(
    source,
    /useState<string \| null>\(\(\) => \{\r?\n\s*if \(lockedOccasion\) return lockedOccasion;/,
    'lockedOccasion muss VOR dem Lesen von searchParams.get(\'anlass\') geprueft werden (Source of Truth)'
  )
})

test('URL->State-Sync (Back/Forward) erzwingt lockedOccasion, ignoriert einen konkurrierenden anlass-Param', () => {
  const syncStart = source.indexOf('const nextCat = lockedOccasion')
  assert.ok(syncStart >= 0, 'Sync-Effekt muss lockedOccasion vor einem gelesenen anlass-Param bevorzugen')
  const syncBody = source.slice(syncStart, syncStart + 300)
  assert.match(syncBody, /\?\s+lockedOccasion\r?\n/, 'lockedOccasion muss der direkte Wert im Truthy-Zweig sein')
})

test('Klick auf den bereits aktiven gesperrten Anlass ist ein No-op (kein Abwaehlen, keine Navigation)', () => {
  // Es gibt zwei "if (lockedOccasion) {"-Vorkommen (buildFilterUrl und der
  // Anlass-Panel-Klick-Handler) -- gezielt das zweite (spaetere) pruefen.
  const firstOccurrence = source.indexOf('if (lockedOccasion) {')
  assert.ok(firstOccurrence >= 0)
  const clickStart = source.indexOf('if (lockedOccasion) {', firstOccurrence + 1)
  assert.ok(clickStart >= 0, 'lockedOccasion-Zweig im Anlass-Panel-Klick-Handler nicht gefunden')
  const clickBody = source.slice(clickStart, clickStart + 700)
  assert.match(clickBody, /if \(active\) return;/, 'Klick auf den bereits aktiven Anlass darf nicht navigieren')
  assert.match(clickBody, /buildOccasionNavUrl\(cat\.slug,/, 'Navigation muss ueber buildOccasionNavUrl erfolgen (R1)')
})

test('"Alle Anlaesse"-Eintrag im Anlass-Panel ist an lockedOccasion gebunden (nur im Veranstaltungsseiten-Kontext sichtbar)', () => {
  const allOccasionsIdx = source.indexOf('Alle Anlässe')
  assert.ok(allOccasionsIdx >= 0, '"Alle Anlässe"-Text nicht gefunden')
  const before = source.slice(Math.max(0, allOccasionsIdx - 1000), allOccasionsIdx)
  assert.match(before, /\{lockedOccasion && \(/)
})

test('"Alle Anlaesse" navigiert immer zu /bands (buildFinderFilterUrl mit Basisroute \'/bands\')', () => {
  const allOccasionsIdx = source.indexOf('Alle Anlässe')
  const before = source.slice(Math.max(0, allOccasionsIdx - 1000), allOccasionsIdx)
  assert.match(before, /buildFinderFilterUrl\('\/bands',/)
})

test('resetFilters navigiert im Veranstaltungsseiten-Kontext auf baseRoute (/veranstaltung/<slug>), nicht auf /bands', () => {
  const resetStart = source.indexOf('const resetFilters = useCallback(() => {')
  assert.ok(resetStart >= 0, 'resetFilters nicht gefunden')
  const resetBody = source.slice(resetStart, resetStart + 400)
  assert.match(resetBody, /router\.push\(baseRoute, \{ scroll: false \}\)/)
  assert.doesNotMatch(resetBody, /router\.push\('\/bands'/, 'resetFilters darf nicht hart auf /bands verdrahtet sein')
})

test('baseRoute ist /veranstaltung/<lockedOccasion> wenn gesetzt, sonst /bands', () => {
  assert.match(source, /const baseRoute = lockedOccasion \? `\/veranstaltung\/\$\{lockedOccasion\}` : '\/bands';/)
})

test('hasFilter zaehlt den gesperrten Seiten-Anlass NICHT als Filter (kein sinnloser Reset-Link nur wegen lockedOccasion)', () => {
  const hasFilterStart = source.indexOf('const hasFilter = Boolean(')
  assert.ok(hasFilterStart >= 0)
  const hasFilterBody = source.slice(hasFilterStart, hasFilterStart + 250)
  assert.match(hasFilterBody, /!lockedOccasion && selectedCategory/)
})

test('Ergebniszahl wird im Veranstaltungsseiten-Kontext bereits im Initialzustand angezeigt (hasFilter || lockedOccasion)', () => {
  assert.match(source, /!\(hasFilter \|\| lockedOccasion\)/)
  assert.match(source, /\{shuffled\.length > 0 && \(hasFilter \|\| lockedOccasion\) && \(/)
})

test('"Filter zuruecksetzen"-Link erscheint nur bei einem echten zusaetzlichen Filter (hasFilter), nicht schon wegen lockedOccasion allein', () => {
  const counterBlockStart = source.indexOf('{shuffled.length > 0 && (hasFilter || lockedOccasion) && (')
  assert.ok(counterBlockStart >= 0)
  const counterBlockBody = source.slice(counterBlockStart, counterBlockStart + 500)
  assert.match(counterBlockBody, /\{hasFilter && \(/)
  assert.match(counterBlockBody, /<button[\s\S]*?Filter zurücksetzen/)
})

test('suche/region/bandtyp/mood-URL-Aenderungen laufen im Veranstaltungsseiten-Kontext ueber buildFinderFilterUrl auf baseRoute, nicht ueber die alte /bands-buildUrl', () => {
  const helperStart = source.indexOf('function buildFilterUrl(overrides:')
  assert.ok(helperStart >= 0, 'buildFilterUrl-Helper nicht gefunden')
  const helperBody = source.slice(helperStart, helperStart + 700)
  assert.match(helperBody, /if \(lockedOccasion\) \{/)
  assert.match(helperBody, /return buildFinderFilterUrl\(baseRoute,/)
  assert.match(helperBody, /return buildUrl\(\{ anlass: selectedCategory,/, '/bands-Verhalten (inkl. anlass) muss unveraendert erhalten bleiben')
})

test('/bands-Pfad (kein lockedOccasion) verwendet weiterhin unveraendert die alte buildUrl-Funktion mit anlass-Param', () => {
  assert.match(source, /function buildUrl\(params: \{/)
  assert.match(source, /if \(params\.anlass\) p\.set\('anlass', params\.anlass\);/)
})

test('die vier Filter-Panels (Suche, Region, Bandtyp, Mood) rufen ausschliesslich buildFilterUrl auf, nicht mehr die alte buildUrl direkt', () => {
  const occurrences = (source.match(/buildFilterUrl\(\{/g) ?? []).length
  assert.equal(occurrences, 4, 'erwartet genau 4 buildFilterUrl-Aufrufe: suche, region, bandtyp, mood')
})
