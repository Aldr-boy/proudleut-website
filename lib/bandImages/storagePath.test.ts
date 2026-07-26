import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildHeroImageStoragePath, extractBandMediaStoragePath } from './storagePath.ts'

test('buildHeroImageStoragePath: baut slug/hero-<suffix>.<ext>', () => {
  assert.equal(buildHeroImageStoragePath('donnaweda', 'webp', 'abc123'), 'donnaweda/hero-abc123.webp')
})

test('buildHeroImageStoragePath: zwei Aufrufe mit unterschiedlichem Suffix erzeugen unterschiedliche Pfade', () => {
  const a = buildHeroImageStoragePath('donnaweda', 'webp', 'suffix-1')
  const b = buildHeroImageStoragePath('donnaweda', 'webp', 'suffix-2')
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
