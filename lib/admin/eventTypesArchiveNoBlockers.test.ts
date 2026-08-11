import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Korrektur "Archive-/Reactivate-Verhalten im Event-Types-Admin": Nachweis,
// dass archive_event_type in supabase/fn_event_types_catalog_admin.sql
// weder bestehende band_event_types-Zuordnungen noch aktive Child-Event-
// Types (parent_id) als Zulaessigkeitsbedingung verwendet, und dass die
// Funktion ausschliesslich status = 'archived' setzt (updated_at
// aktualisiert der bestehende Trigger automatisch, wird hier nicht manuell
// gesetzt). SQL selbst kann in diesem Repo nicht ausgefuehrt werden
// (kein lokales Postgres, keine Production-Mutation in Tests) --
// identisches, bereits etabliertes Muster wie
// lib/admin/eventTypesErrorMapping.test.ts: echte Quelldatei per
// readFileSync lesen und strukturell pruefen, kein neues Testframework.
const sqlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'supabase', 'fn_event_types_catalog_admin.sql'
)
const source = readFileSync(sqlPath, 'utf8')

function extractFunctionBody(functionName: string): string {
  const startMarker = `create or replace function public.${functionName}(`
  const startIndex = source.indexOf(startMarker)
  assert.ok(startIndex >= 0, `Funktion ${functionName} nicht gefunden`)
  // Endet am "$$;" der Funktion selbst -- NICHT erst am naechsten
  // "create or replace function", da dazwischen noch der Kommentarblock
  // der naechsten Funktion liegt (der z. B. bei reactivate_event_type in
  // Prosa "parent_id" erwaehnt, ohne dass reactivate_event_type es
  // tatsaechlich referenziert).
  const endMarker = '\n$$;'
  const endMarkerIndex = source.indexOf(endMarker, startIndex + startMarker.length)
  assert.ok(endMarkerIndex >= 0, `Ende von ${functionName} ("$$;") nicht gefunden`)
  const endIndex = endMarkerIndex + endMarker.length
  return source.slice(startIndex, endIndex)
}

test('archive_event_type fragt band_event_types nicht ab -- bestehende Bandzuordnungen sind kein Archivierungs-Blocker', () => {
  const body = extractFunctionBody('archive_event_type')
  assert.ok(!body.includes('band_event_types'), 'archive_event_type darf band_event_types nicht mehr referenzieren')
})

test('archive_event_type fragt keine Child-Event-Types (parent_id) ab -- aktive Unterkategorien sind kein Archivierungs-Blocker', () => {
  const body = extractFunctionBody('archive_event_type')
  assert.ok(!body.includes('parent_id'), 'archive_event_type darf parent_id nicht mehr referenzieren')
})

test('die entfernten Fehlercodes ET011/ET014 und ihre Fehler-Slugs kommen in der SQL-Datei nicht mehr vor', () => {
  assert.ok(!source.includes('ET011'), 'ET011 (event_types_archive_in_use) muss vollstaendig entfernt sein')
  assert.ok(!source.includes('ET014'), 'ET014 (event_types_archive_has_active_children) muss vollstaendig entfernt sein')
  assert.ok(!source.includes('event_types_archive_in_use'), 'event_types_archive_in_use darf nicht mehr vorkommen')
  assert.ok(!source.includes('event_types_archive_has_active_children'), 'event_types_archive_has_active_children darf nicht mehr vorkommen')
})

test('archive_event_type enthaelt genau ein UPDATE-Statement, das ausschliesslich status setzt', () => {
  const body = extractFunctionBody('archive_event_type')
  const updateMatches = [...body.matchAll(/update public\.event_types set ([^\n]+?) where id = p_event_type_id/g)]
  assert.equal(updateMatches.length, 1, `erwartet genau 1 UPDATE-Statement, gefunden ${updateMatches.length}`)
  assert.equal(updateMatches[0][1].trim(), "status = 'archived'", 'archive_event_type darf ausschliesslich status setzen -- keine weiteren Spalten')
})

test('archive_event_type setzt updated_at nicht manuell -- der bestehende Trigger uebernimmt das', () => {
  const body = extractFunctionBody('archive_event_type')
  assert.ok(!body.includes('updated_at'), 'archive_event_type darf updated_at nicht manuell referenzieren')
})

test('reactivate_event_type fuehrt weiterhin keine zusaetzlichen fachlichen Bedingungen ein (nur Statuswechsel archived -> active)', () => {
  const body = extractFunctionBody('reactivate_event_type')
  assert.ok(!body.includes('band_event_types'), 'reactivate_event_type darf band_event_types nicht referenzieren')
  assert.ok(!body.includes('parent_id'), 'reactivate_event_type darf parent_id nicht referenzieren')
  const updateMatches = [...body.matchAll(/update public\.event_types set ([^\n]+?) where id = p_event_type_id/g)]
  assert.equal(updateMatches.length, 1, `erwartet genau 1 UPDATE-Statement, gefunden ${updateMatches.length}`)
  assert.equal(updateMatches[0][1].trim(), "status = 'active'", 'reactivate_event_type darf ausschliesslich status setzen')
})
