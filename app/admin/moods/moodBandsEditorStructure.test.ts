import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer MoodBandsEditor.tsx. Die
// Komponente ist eine 'use client'-React-Komponente mit
// useState/useTransition/useRouter -- es gibt in diesem Repo keine
// React-Testing-Infrastruktur (kein jsdom, keine @testing-library-
// Abhaengigkeit). Identisches, bereits etabliertes Muster wie
// lib/bands/bandExplorerMoodUrlState.test.ts: die echte Quelldatei per
// readFileSync lesen und die sicherheits-/korrektheitsrelevanten
// Verzweigungen strukturell pruefen, statt die Komponente selbst zu
// rendern.
//
// Diese Testdatei liegt bewusst NICHT neben MoodBandsEditor.tsx (also
// nicht unter app/admin/moods/[slug]/bands/): `node --test` interpretiert
// "[slug]" im Dateipfad als Glob-Zeichenklasse (bestaetigt sowohl unter
// Git Bash als auch unter PowerShell -- kein Shell-, sondern ein
// Node-Test-Runner-Verhalten) und findet die Datei an dieser Stelle nicht,
// unabhaengig von der verwendeten Shell. readFileSync selbst ist davon
// nicht betroffen (kein Glob, ein literaler Pfad) -- deshalb liest diese
// Datei den Quellpfad relativ von hier aus.
const sourcePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '[slug]', 'bands', 'MoodBandsEditor.tsx',
)
const source = readFileSync(sourcePath, 'utf8')

test('4/4-Sperre: Checkbox wird deaktiviert, wenn der Mood noch fehlt UND die Band bereits MAX_BAND_MOODS erreicht hat', () => {
  assert.match(source, /const disabledByMax = !alreadyHasTarget && band\.moods\.length >= MAX_BAND_MOODS/)
  // Die Sperre gilt nur fuer das Hinzufuegen, nicht fuer eine bereits
  // gesetzte/staged Checkbox (sonst koennte eine Band mit 4 Moods ihre
  // eigene, bereits vorhandene Zuordnung nicht mehr entfernen).
  assert.match(source, /disabled=\{readOnly \|\| \(disabledByMax && !isStaged\)\}/)
})

test('"Zugeordnet"-Ansicht filtert nach dem urspruenglichen (originalAssigned), nicht dem staged Zustand -- eine staged Entfernung laesst die Zeile nicht sofort verschwinden', () => {
  assert.match(
    source,
    /viewMode === 'assigned' \? bands\.filter\(\(b\) => originalAssigned\.has\(b\.id\)\) : bands/,
  )
})

test('Zurueck-Link ruft window.confirm nur bei staged Aenderungen auf', () => {
  const fnStart = source.indexOf('function handleBackClick')
  assert.ok(fnStart >= 0, 'handleBackClick nicht gefunden')
  const fnBody = source.slice(fnStart, fnStart + 400)
  assert.match(fnBody, /if \(hasStagedChanges\) \{/)
  assert.match(fnBody, /window\.confirm\(/)
})

test('beforeunload-Guard ist an hasStagedChanges gekoppelt (fruehzeitiger Return ohne staged Aenderungen)', () => {
  const effectStart = source.indexOf("useEffect(() => {\n    if (!hasStagedChanges) return")
  assert.ok(effectStart >= 0, 'beforeunload-Effect mit fruehzeitigem Return nicht gefunden')
  const effectBody = source.slice(effectStart, effectStart + 400)
  assert.match(effectBody, /addEventListener\('beforeunload', handler\)/)
  assert.match(effectBody, /e\.preventDefault\(\)/)
})

test('Mood-Chips zeigen keine Bandersatzdaten (kein Event-Type/Repertoire/Bild/Kontakt/Referenz/Preis-Rendering)', () => {
  const forbidden = ['eventTypes', 'repertoire', 'Preis', 'Kontakt', 'Referenz', 'gallery', 'heroImage']
  for (const term of forbidden) {
    assert.doesNotMatch(source, new RegExp(term, 'i'), `unerwarteter Begriff "${term}" in MoodBandsEditor.tsx gefunden`)
  }
})

test('Checkbox aendert ausschliesslich lokalen Client-State (kein direkter RPC-/DB-Aufruf im onChange-Handler)', () => {
  const toggleStart = source.indexOf('function toggleBand')
  assert.ok(toggleStart >= 0, 'toggleBand nicht gefunden')
  const toggleBody = source.slice(toggleStart, toggleStart + 300)
  assert.doesNotMatch(toggleBody, /rpc\(|updateMoodBandAssignmentsAction/)
  assert.match(toggleBody, /setStaged/)
})

test('Save-Bereich nutzt ausschliesslich den einen zentralen Diff (add/remove), keine Vollzustandsuebertragung', () => {
  const saveStart = source.indexOf('function handleSave')
  assert.ok(saveStart >= 0, 'handleSave nicht gefunden')
  const saveBody = source.slice(saveStart, saveStart + 500)
  assert.match(saveBody, /addBandIds: diff\.add/)
  assert.match(saveBody, /removeBandIds: diff\.remove/)
})
