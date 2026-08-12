import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Strukturelle Regressionspruefung fuer die 6 Banddokument-Server-Actions
// (Paket 2C) und BandDocumentsEditorSection.tsx. Keine Next.js-Server-
// Action-Mocking-Infrastruktur in diesem Repo (siehe
// actionsAuthGuardOrder.test.ts) -- reale Quelldateien werden per
// readFileSync textuell geprueft. Der Auth-Guard selbst (erste Anweisung
// vor jedem Seiteneffekt) ist bereits vollstaendig in
// actionsAuthGuardOrder.test.ts abgedeckt; dieser Test prueft die
// darueber hinausgehenden fachlichen Anforderungen: Ownership-Pruefung,
// Validierungsreihenfolge, Storage-Cleanup, Reorder-Fehlerbehandlung,
// keine Donnaweda-Sonderlogik.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const actionsSource = readFileSync(path.join(root, 'app', 'admin', 'bands', '[id]', 'actions.ts'), 'utf8')
const editorSource = readFileSync(path.join(root, 'app', 'admin', 'bands', '[id]', 'BandDocumentsEditorSection.tsx'), 'utf8')

function extractFunctionBody(source: string, functionName: string): string {
  const startMarker = `export async function ${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  const nextExportIndex = source.indexOf('\nexport async function ', startIndex + startMarker.length)
  const endIndex = nextExportIndex === -1 ? source.length : nextExportIndex
  return source.slice(startIndex, endIndex)
}

test('keine Donnaweda-spezifische Logik oder Hardcodierung in actions.ts oder der Editor-Komponente', () => {
  assert.doesNotMatch(actionsSource, /donnaweda/i)
  assert.doesNotMatch(editorSource, /donnaweda/i)
})

test('CTA-Text ist im Admin nicht editierbar -- kein Formularfeld/keine Spalte fuer einen konfigurierbaren CTA-Text', () => {
  assert.doesNotMatch(editorSource, /name="cta/i)
  assert.doesNotMatch(actionsSource, /\bcta_text\b/i)
})

test('updateBandDocumentAction: Ownership-Pruefung ueber id UND band_id im selben Update-Statement', () => {
  const body = extractFunctionBody(actionsSource, 'updateBandDocumentAction')
  assert.match(body, /\.update\(\{[\s\S]*?\}\)\s*\.eq\('id', document_id\)\s*\.eq\('band_id', bandRow\.id\)/)
})

test('updateBandDocumentAction: 0 getroffene Zeilen wird explizit als document_target_not_found behandelt, nicht stillschweigend als Erfolg', () => {
  const body = extractFunctionBody(actionsSource, 'updateBandDocumentAction')
  assert.match(body, /if \(!updatedRows \|\| updatedRows\.length === 0\) documentErrorRedirect\(bandRow\.id, 'document_target_not_found'\)/)
})

test('deleteBandDocumentAction: Ownership-Pruefung ueber id UND band_id im Delete-Statement', () => {
  const body = extractFunctionBody(actionsSource, 'deleteBandDocumentAction')
  assert.match(body, /\.delete\(\)\s*\.eq\('id', document_id\)\s*\.eq\('band_id', bandRow\.id\)/)
})

test('deleteBandDocumentAction: 0 getroffene Zeilen wird explizit als document_target_not_found behandelt', () => {
  const body = extractFunctionBody(actionsSource, 'deleteBandDocumentAction')
  assert.match(body, /if \(!deletedRows \|\| deletedRows\.length === 0\) documentErrorRedirect\(bandRow\.id, 'document_target_not_found'\)/)
})

test('deleteBandDocumentAction: Storage-Cleanup fuer file_url UND (bedingt) thumbnail_url nach erfolgreichem Delete', () => {
  const body = extractFunctionBody(actionsSource, 'deleteBandDocumentAction')
  assert.match(body, /deleteBandDocumentFileIfUnreferenced\(client, deleted\.file_url, 'document-pdf'\)/)
  assert.match(body, /if \(deleted\.thumbnail_url\) \{\s*await deleteBandDocumentFileIfUnreferenced\(client, deleted\.thumbnail_url, 'document-cover'\)/)
})

test('replaceBandDocumentPdfAction und replaceBandDocumentCoverAction: bestehende Zeile wird vor jedem Upload ownership-geprueft geladen', () => {
  const pdfBody = extractFunctionBody(actionsSource, 'replaceBandDocumentPdfAction')
  const coverBody = extractFunctionBody(actionsSource, 'replaceBandDocumentCoverAction')
  for (const body of [pdfBody, coverBody]) {
    assert.match(body, /\.eq\('id', document_id\)\s*\.eq\('band_id', bandRow\.id\)\s*\.maybeSingle\(\)/)
    assert.match(body, /if \(!existingDoc\) documentErrorRedirect\(bandRow\.id, 'document_target_not_found'\)/)
  }
})

test('replaceBandDocumentPdfAction verwendet validateBandDocumentPdfFile, replaceBandDocumentCoverAction verwendet validateBandImageFile', () => {
  const pdfBody = extractFunctionBody(actionsSource, 'replaceBandDocumentPdfAction')
  const coverBody = extractFunctionBody(actionsSource, 'replaceBandDocumentCoverAction')
  assert.match(pdfBody, /validateBandDocumentPdfFile\(bytes\)/)
  assert.doesNotMatch(pdfBody, /validateBandImageFile\(/)
  assert.match(coverBody, /validateBandImageFile\(bytes\)/)
  assert.doesNotMatch(coverBody, /validateBandDocumentPdfFile\(/)
})

test('createBandDocumentAction: Textfelder werden vor dem PDF-Read validiert (fruehzeitiger Fehler ohne unnoetigen Upload)', () => {
  const body = extractFunctionBody(actionsSource, 'createBandDocumentAction')
  const validateIndex = body.indexOf('validateDocumentTextFields(formData)')
  const pdfReadIndex = body.indexOf("formData.get('document_pdf')")
  assert.ok(validateIndex >= 0 && pdfReadIndex >= 0)
  assert.ok(validateIndex < pdfReadIndex, 'Textfeld-Validierung muss vor dem PDF-Read stehen')
})

test('createBandDocumentAction: PDF ist Pflichtfeld bei Neuanlage', () => {
  const body = extractFunctionBody(actionsSource, 'createBandDocumentAction')
  assert.match(body, /if \(!\(file instanceof File\) \|\| file\.size === 0\) \{\s*documentErrorRedirect\(bandRow\.id, 'document_pdf_required'\)/)
})

test('createBandDocumentAction: neue sort_order haengt hinter der bisher hoechsten an (kein Ueberschreiben bestehender Positionen)', () => {
  const body = extractFunctionBody(actionsSource, 'createBandDocumentAction')
  assert.match(body, /Math\.max\(max, row\.sort_order \?\? 0\)/)
})

test('moveBandDocumentAction: Reihenfolge wird aus einer frisch geladenen Liste berechnet, nicht aus Client-Eingaben', () => {
  const body = extractFunctionBody(actionsSource, 'moveBandDocumentAction')
  assert.match(body, /\.from\('band_documents'\)\s*\.select\('id, sort_order, created_at'\)\s*\.eq\('band_id', bandRow\.id\)/)
  assert.match(body, /computeBandDocumentSwap\(orderedIds, document_id, direction as 'up' \| 'down'\)/)
})

test('moveBandDocumentAction: beide UPDATEs sind ownership-geprueft (id UND band_id)', () => {
  const body = extractFunctionBody(actionsSource, 'moveBandDocumentAction')
  const updateCalls = body.match(/\.update\(\{ sort_order: swap\.\w+Order \}\)\.eq\('id', swap\.\w+Id\)\.eq\('band_id', bandRow\.id\)/g) ?? []
  assert.equal(updateCalls.length, 2, 'beide Swap-Updates muessen id UND band_id filtern')
})

test('moveBandDocumentAction: ein Teilfehler wird NIEMALS als Erfolg gemeldet (Xandi-Vorgabe) -- beide Ergebnisse werden auf Fehler UND Trefferanzahl geprueft, bevor redirect auf document_saved erfolgt', () => {
  const body = extractFunctionBody(actionsSource, 'moveBandDocumentAction')
  assert.match(body, /const aOk = !updateA\.error && \(updateA\.data\?\.length \?\? 0\) === 1/)
  assert.match(body, /const bOk = !updateB\.error && \(updateB\.data\?\.length \?\? 0\) === 1/)
  assert.match(body, /if \(!aOk \|\| !bOk\) documentErrorRedirect\(bandRow\.id, 'document_reorder_failed'\)/)

  // Die einzige Stelle, an der '?document_saved=1' fuer diese Action erreicht
  // wird, muss NACH der aOk/bOk-Pruefung im Quelltext stehen.
  const okCheckIndex = body.indexOf("if (!aOk || !bOk)")
  const savedRedirectIndex = body.lastIndexOf('?document_saved=1')
  assert.ok(okCheckIndex >= 0 && savedRedirectIndex >= 0)
  assert.ok(okCheckIndex < savedRedirectIndex, 'Erfolgsredirect darf erst nach der aOk/bOk-Pruefung stehen')
})

test('moveBandDocumentAction: am Rand (kein Swap moeglich) ist ein sauberer No-op ohne Fehlermeldung vorgesehen', () => {
  const body = extractFunctionBody(actionsSource, 'moveBandDocumentAction')
  assert.match(body, /if \(!swap\) redirect\(`\/admin\/bands\/\$\{bandRow\.id\}\?document_saved=1`\)/)
})

test('BandDocumentsEditorSection: Erstellungsformular verlangt eine ausgewaehlte PDF-Datei, bevor der Speichern-Button aktiv wird', () => {
  assert.match(editorSource, /disabled=\{!pdfSelected\}/)
})

test('BandDocumentsEditorSection: PDF- und Cover-Ersatz laufen ueber zwei unabhaengige Formulare (kein gemeinsames Multi-File-Formular)', () => {
  const pdfFormCount = (editorSource.match(/action=\{replaceBandDocumentPdfAction\}/g) ?? []).length
  const coverFormCount = (editorSource.match(/action=\{replaceBandDocumentCoverAction\}/g) ?? []).length
  assert.equal(pdfFormCount, 1)
  assert.equal(coverFormCount, 1)
})

test('BandDocumentsEditorSection: Loeschen verlangt eine Bestaetigung (bestehendes Kontakte-Loeschmuster wiederverwendet)', () => {
  assert.match(editorSource, /confirm\('Dokument wirklich löschen\?'\)/)
})

test('BandDocumentsEditorSection: 0 Dokumente zeigen einen sachlichen Empty State statt eines leeren Lochs', () => {
  assert.match(editorSource, /Noch keine Dokumente vorhanden/)
})

test('BandDocumentsEditorSection: loadError verhindert die Anzeige jedes Bearbeitungsformulars (fail-closed wie Galerie/Moods)', () => {
  const loadErrorBlockMatch = editorSource.match(/if \(loadError\) \{([\s\S]*?)\n  \}/)
  assert.ok(loadErrorBlockMatch, 'loadError-Block nicht gefunden')
  assert.doesNotMatch(loadErrorBlockMatch![1], /<form/)
})
