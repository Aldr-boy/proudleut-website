import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Codex-Nachtrag PR #26, zweiter Review, Befund 3: strukturelle Pruefung,
// dass CUTOVER.md die tatsaechlich benoetigte Migrationsreihenfolge und
// Verifikation vollstaendig dokumentiert. Reine Textpruefung (kein
// Datenbank-/Production-Zugriff) -- dasselbe Muster wie
// lib/admin/actionsAuthGuardOrder.test.ts fuer Server-Action-Quelltexte.
const cutoverPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'CUTOVER.md'
)
const source = readFileSync(cutoverPath, 'utf8')

const REQUIRED_SQL_FILES_IN_ORDER = [
  'supabase/anfragesystem_native_migration.sql',
  'supabase/fn_create_anfrage_with_bands.sql',
  'supabase/fn_create_band_with_primary_contact.sql',
  'supabase/fn_set_primary_inquiry_contact.sql',
]

const REQUIRED_RPCS = [
  'create_anfrage_with_bands',
  'create_band_with_primary_contact',
  'check_and_consume_anfrage_rate_limit',
  'create_band_contact',
  'update_band_contact',
]

test('CUTOVER.md nennt alle benoetigten SQL-Dateien der Migrationsreihenfolge', () => {
  for (const file of REQUIRED_SQL_FILES_IN_ORDER) {
    assert.ok(source.includes(file), `${file} fehlt in CUTOVER.md`)
  }
})

test('CUTOVER.md fuehrt die SQL-Dateien in der korrekten (aufsteigenden) Reihenfolge auf', () => {
  const indices = REQUIRED_SQL_FILES_IN_ORDER.map((file) => source.indexOf(file))
  for (let i = 1; i < indices.length; i++) {
    assert.ok(
      indices[i] > indices[i - 1],
      `Reihenfolge falsch: "${REQUIRED_SQL_FILES_IN_ORDER[i]}" muss nach "${REQUIRED_SQL_FILES_IN_ORDER[i - 1]}" stehen`
    )
  }
})

test('CUTOVER.md-Verifikationsabschnitt nennt alle benoetigten RPCs (inkl. der neuen Kontakt-RPCs)', () => {
  for (const rpc of REQUIRED_RPCS) {
    assert.ok(source.includes(rpc), `RPC "${rpc}" fehlt im Verifikationsabschnitt von CUTOVER.md`)
  }
})

test('CUTOVER.md erwaehnt explizit, dass die neue Kontakt-RPC-Datei eine Laufzeitvoraussetzung ist', () => {
  assert.match(source, /Laufzeitvoraussetzung/)
  assert.match(source, /create_band_contact/)
  assert.match(source, /update_band_contact/)
})
