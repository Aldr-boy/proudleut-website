import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die event-type-zentrierte
// Bandverwaltung (page.tsx + EventTypeBandsEditor.tsx), nach dem Vorbild
// von app/admin/moods/moodBandsEditorStructure.test.ts. Es gibt in diesem
// Repo keine React-Testing-Infrastruktur (kein jsdom, keine
// @testing-library-Abhaengigkeit) -- die echten Quelldateien werden per
// readFileSync gelesen und strukturell geprueft.
//
// Diese Testdatei liegt bewusst NICHT neben EventTypeBandsEditor.tsx
// (also nicht unter app/admin/event-types/[slug]/bands/): `node --test`
// interpretiert "[slug]" im Dateipfad als Glob-Zeichenklasse (identisches,
// bereits bestaetigtes Verhalten wie bei moodBandsEditorStructure.test.ts)
// -- deshalb werden die Quellpfade relativ von hier aus referenziert.
const editorPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[slug]', 'bands', 'EventTypeBandsEditor.tsx',
)
const editorSource = readFileSync(editorPath, 'utf8')

const pagePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[slug]', 'bands', 'page.tsx',
)
const pageSource = readFileSync(pagePath, 'utf8')

// ── page.tsx: Grundmenge/Sortierung/Filterliste ──────────────────────

test('bands-Grundmenge wird OHNE Statusfilter geladen, identisch zum Mood-Editor', () => {
  const fromBlockMatch = pageSource.match(/\.from\('bands'\)[\s\S]*?\.returns<BandRow\[\]>\(\)/)
  assert.ok(fromBlockMatch, 'bands-Query nicht gefunden')
  assert.ok(!fromBlockMatch[0].includes(".eq('status'"), 'bands-Grundmenge darf keinen Statusfilter haben -- identisch zum Mood-Editor')
  assert.match(fromBlockMatch[0], /\.order\('name', \{ ascending: true \}\)/)
})

test('Filterliste "Bereits zugeordnet zu": nur aktive Veranstaltungstypen, aktueller Typ ausgeblendet', () => {
  const filterBlockMatch = pageSource.match(/\.from\('event_types'\)[\s\S]*?\.returns<FilterEventTypeRow\[\]>\(\)/)
  assert.ok(filterBlockMatch, 'Filterlisten-Query nicht gefunden')
  assert.match(filterBlockMatch[0], /\.eq\('status', 'active'\)/)
  assert.match(filterBlockMatch[0], /\.neq\('id', eventType\.id\)/)
})

test('dieselbe geladene Band->Event-Type-Datenbasis speist sowohl die Chips als auch den Filter (ein einziges band_event_types-Embed)', () => {
  const occurrences = (pageSource.match(/band_event_types\(event_type_id, sort_order, event_types\(id, name, slug\)\)/g) ?? []).length
  assert.equal(occurrences, 1, 'genau ein band_event_types-Embed in der bands-Query erwartet')
})

// ── EventTypeBandsEditor.tsx: staged UI ──────────────────────────────

test('"Zugeordnet"-Ansicht filtert nach dem urspruenglichen (originalAssigned), nicht dem staged Zustand', () => {
  assert.match(
    editorSource,
    /viewMode === 'assigned' \? bands\.filter\(\(b\) => originalAssigned\.has\(b\.id\)\) : bands/,
  )
})

test('Bandsuche + Event-Type-Filter + Tab kombinieren sich (Filter wirkt auf das bereits durch Tab+Suche eingegrenzte Ergebnis)', () => {
  const memoStart = editorSource.indexOf('const visibleBands = useMemo(')
  assert.ok(memoStart >= 0, 'visibleBands-useMemo nicht gefunden')
  const memoBody = editorSource.slice(memoStart, memoStart + 600)
  assert.ok(memoBody.includes("const base = viewMode === 'assigned'"), 'Tab-Basismenge nicht gefunden')
  assert.ok(memoBody.includes('const bySearch = searchLower ? base.filter'), 'Such-Filterung nicht gefunden, oder wirkt nicht auf die Tab-Basismenge')
  assert.ok(
    memoBody.includes('const byFilter = filterEventTypeId') &&
      memoBody.includes("? bySearch.filter((b) => b.eventTypes.some((et) => et.id === filterEventTypeId))"),
    'Event-Type-Filter nicht gefunden, oder wirkt nicht auf das bereits durch Suche gefilterte Ergebnis',
  )
})

test('Event-Type-Filter ist optional (Standardwert leerer String, kein Filter)', () => {
  assert.match(editorSource, /const \[filterEventTypeId, setFilterEventTypeId\] = useState\(''\)/)
})

test('Zurueck-Link ruft window.confirm nur bei staged Aenderungen auf', () => {
  const fnStart = editorSource.indexOf('function handleBackClick')
  assert.ok(fnStart >= 0, 'handleBackClick nicht gefunden')
  const fnBody = editorSource.slice(fnStart, fnStart + 400)
  assert.match(fnBody, /if \(hasStagedChanges\) \{/)
  assert.match(fnBody, /window\.confirm\(/)
})

test('beforeunload-Guard ist an hasStagedChanges gekoppelt (fruehzeitiger Return ohne staged Aenderungen)', () => {
  const effectStart = editorSource.indexOf("useEffect(() => {\n    if (!hasStagedChanges) return")
  assert.ok(effectStart >= 0, 'beforeunload-Effect mit fruehzeitigem Return nicht gefunden')
  const effectBody = editorSource.slice(effectStart, effectStart + 400)
  assert.match(effectBody, /addEventListener\('beforeunload', handler\)/)
  assert.match(effectBody, /e\.preventDefault\(\)/)
})

test('Checkbox aendert ausschliesslich lokalen Client-State (kein direkter RPC-/DB-Aufruf im onChange-Handler)', () => {
  const toggleStart = editorSource.indexOf('function toggleBand')
  assert.ok(toggleStart >= 0, 'toggleBand nicht gefunden')
  const toggleBody = editorSource.slice(toggleStart, toggleStart + 300)
  assert.doesNotMatch(toggleBody, /rpc\(|updateEventTypeBandAssignmentsAction/)
  assert.match(toggleBody, /setStaged/)
})

test('Save-Bereich nutzt ausschliesslich den einen zentralen Diff (add/remove), keine Vollzustandsuebertragung', () => {
  const saveStart = editorSource.indexOf('function handleSave')
  assert.ok(saveStart >= 0, 'handleSave nicht gefunden')
  const saveBody = editorSource.slice(saveStart, saveStart + 500)
  assert.match(saveBody, /addBandIds: diff\.add/)
  assert.match(saveBody, /removeBandIds: diff\.remove/)
})

// ── DoD Punkt 10: keine Mood-spezifische Ranking-/Cap-/Warn-/Vererbungslogik ──

test('keine Mood-spezifische Ranking-/Cap-/Warn-/Vererbungslogik uebernommen', () => {
  const forbidden = [
    'MAX_BAND_MOODS',
    'disabledByMax',
    'FeierCluster',
    'feierCluster',
    'projectBandMoodsAfterToggle',
    'isUnderTargetCorridor',
    'exceedsFeierCluster',
  ]
  for (const term of forbidden) {
    assert.doesNotMatch(editorSource, new RegExp(term), `unerwarteter Mood-Begriff "${term}" in EventTypeBandsEditor.tsx gefunden`)
  }
})

test('Event-Type-Chips zeigen keine Bandersatzdaten (kein Repertoire/Preis/Kontakt/Referenz-Rendering)', () => {
  // "moods"/"Mood" bewusst NICHT in dieser Liste -- der Datei-Kommentar
  // referenziert MoodBandsEditor.tsx legitim als architektonisches
  // Vorbild. Dass keine tatsaechliche Mood-GESCHAEFTSLOGIK uebernommen
  // wurde, prueft bereits der eigene Test dafuer oben.
  const forbidden = ['repertoire', 'Preis', 'Kontakt', 'Referenz', 'gallery', 'heroImage']
  for (const term of forbidden) {
    assert.doesNotMatch(editorSource, new RegExp(term, 'i'), `unerwarteter Begriff "${term}" in EventTypeBandsEditor.tsx gefunden`)
  }
})
