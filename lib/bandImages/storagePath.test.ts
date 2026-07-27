import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBandImageStoragePath, extractBandMediaStoragePath } from './storagePath.ts'

test('buildBandImageStoragePath: baut slug/<role>-<suffix>.<ext>', () => {
  assert.equal(buildBandImageStoragePath('donnaweda', 'hero', 'webp', 'abc123'), 'donnaweda/hero-abc123.webp')
})

test('buildBandImageStoragePath: unterschiedliche Rollen erzeugen unterschiedliche Pfade fuer dieselbe Band', () => {
  const hero = buildBandImageStoragePath('donnaweda', 'hero', 'webp', 'abc123')
  const thumbnail = buildBandImageStoragePath('donnaweda', 'thumbnail', 'webp', 'abc123')
  assert.notEqual(hero, thumbnail)
})

test('buildBandImageStoragePath: zwei Aufrufe mit unterschiedlichem Suffix erzeugen unterschiedliche Pfade', () => {
  const a = buildBandImageStoragePath('donnaweda', 'hero', 'webp', 'suffix-1')
  const b = buildBandImageStoragePath('donnaweda', 'hero', 'webp', 'suffix-2')
  assert.notEqual(a, b)
})

test('extractBandMediaStoragePath: extrahiert den Pfad aus einer bestehenden Public-URL', () => {
  const url = 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/donnaweda/hero.webp'
  assert.equal(extractBandMediaStoragePath(url), 'donnaweda/hero.webp')
})

test('extractBandMediaStoragePath: liefert null bei fremder/unerwarteter URL-Struktur', () => {
  assert.equal(extractBandMediaStoragePath('https://airtableusercontent.com/foo/bar.jpg'), null)
  assert.equal(extractBandMediaStoragePath(''), null)
})

test('extractBandMediaStoragePath: liefert null, wenn nach dem Marker kein Pfad mehr folgt', () => {
  const url = 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/'
  assert.equal(extractBandMediaStoragePath(url), null)
})
