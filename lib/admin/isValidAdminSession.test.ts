import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidAdminSession } from './isValidAdminSession.ts'

// Testet ausschliesslich die reine Vergleichslogik isValidAdminSession
// (eigenes, Next.js-freies Modul). requireAdminSession() selbst importiert
// next/headers/next/navigation -- Node's ESM-Loader kann "next/headers"
// ausserhalb von Next.js' eigener Bundler-Aufloesung nicht resolven
// (empirisch bestaetigt: ERR_MODULE_NOT_FOUND bei direktem node:test-
// Import), ein Test dieser Datei wuerde daher schon am Import scheitern.
// Die tatsaechliche Aufrufreihenfolge (Guard vor jedem Seiteneffekt in
// den fuenf Image-Actions) wird separat strukturell in
// lib/admin/actionsAuthGuardOrder.test.ts nachgewiesen.

test('isValidAdminSession: fehlendes ADMIN_SECRET wird abgelehnt, selbst bei passendem Cookie-Wert', () => {
  assert.equal(isValidAdminSession('irgendein-wert', undefined), false)
  assert.equal(isValidAdminSession('', ''), false)
})

test('isValidAdminSession: fehlender Cookie-Wert wird abgelehnt', () => {
  assert.equal(isValidAdminSession(undefined, 'mein-geheimes-secret'), false)
})

test('isValidAdminSession: falscher Cookie-Wert wird abgelehnt', () => {
  assert.equal(isValidAdminSession('falscher-wert', 'mein-geheimes-secret'), false)
})

test('isValidAdminSession: korrekter Cookie-Wert wird akzeptiert', () => {
  assert.equal(isValidAdminSession('mein-geheimes-secret', 'mein-geheimes-secret'), true)
})

test('isValidAdminSession: leerer String als Secret gilt als fehlend (fail-closed, kein Leercheck-Bypass)', () => {
  assert.equal(isValidAdminSession('', ''), false)
  assert.equal(isValidAdminSession(undefined, ''), false)
})

test('isValidAdminSession: Rueckgabetyp ist strikt boolean -- Secret/Cookie-Wert koennen strukturell nicht in den Rueckgabewert gelangen', () => {
  const result = isValidAdminSession('mein-geheimes-secret', 'mein-geheimes-secret')
  assert.equal(typeof result, 'boolean')
})
