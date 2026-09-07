import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SITE_URL, SITE_DEFAULT_DESCRIPTION, absoluteUrl, isAbsoluteHttpsUrl, DEFAULT_SOCIAL_IMAGE } from './metadata.ts'

// Paket 1 (Cutover-Metadaten): echte Ausfuehrungstests fuer die einzige
// pure Logik dieses Pakets -- die Aufloesung zu absoluten HTTPS-URLs unter
// der zukuenftigen Hauptdomain. DoD-Punkte 7/10 verlangen ausdruecklich,
// dass keine Social-Bild-/Canonical-URL auf localhost oder vercel.app
// zeigt; das wird hier direkt gegen den tatsaechlichen Rueckgabewert
// geprueft, nicht nur aus dem Code abgeleitet.

test('SITE_URL zeigt auf die zukuenftige Hauptdomain, nicht auf vercel.app/localhost', () => {
  assert.equal(SITE_URL, 'https://proudleut.com')
})

test('absoluteUrl: root-relativer Pfad wird zu https://proudleut.com/...', () => {
  assert.equal(absoluteUrl('/images/proudleut-logo-white.png'), 'https://proudleut.com/images/proudleut-logo-white.png')
  assert.equal(absoluteUrl('/band/blechstreet-boys'), 'https://proudleut.com/band/blechstreet-boys')
  assert.equal(absoluteUrl('/veranstaltung/hochzeit'), 'https://proudleut.com/veranstaltung/hochzeit')
  assert.equal(absoluteUrl('/musiker/dominik-palmer'), 'https://proudleut.com/musiker/dominik-palmer')
})

test('absoluteUrl: bereits absolute externe URL (z.B. Supabase Storage) bleibt unveraendert', () => {
  const external = 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-images/foo.jpg'
  assert.equal(absoluteUrl(external), external)
})

test('absoluteUrl: Ergebnis enthaelt niemals localhost oder vercel.app', () => {
  for (const path of ['/images/proudleut-logo-white.png', '/band/x', '/veranstaltung/x', '/musiker/x']) {
    const resolved = absoluteUrl(path)
    assert.ok(resolved.startsWith('https://proudleut.com/'), resolved)
    assert.ok(!resolved.includes('localhost'), resolved)
    assert.ok(!resolved.includes('vercel.app'), resolved)
  }
})

test('isAbsoluteHttpsUrl: akzeptiert nur absolute https-URLs', () => {
  assert.equal(isAbsoluteHttpsUrl('https://example.com/bild.jpg'), true)
  assert.equal(isAbsoluteHttpsUrl('http://example.com/bild.jpg'), false)
  assert.equal(isAbsoluteHttpsUrl('/images/relativ.png'), false)
  assert.equal(isAbsoluteHttpsUrl(undefined), false)
  assert.equal(isAbsoluteHttpsUrl(''), false)
  assert.equal(isAbsoluteHttpsUrl('javascript:alert(1)'), false)
})

test('DEFAULT_SOCIAL_IMAGE: absolute HTTPS-URL unter proudleut.com, mit den bereits im Projekt validierten Logo-Dimensionen', () => {
  assert.equal(DEFAULT_SOCIAL_IMAGE.url, 'https://proudleut.com/images/proudleut-logo-white.png')
  assert.equal(isAbsoluteHttpsUrl(DEFAULT_SOCIAL_IMAGE.url), true)
  assert.equal(DEFAULT_SOCIAL_IMAGE.width, 1004)
  assert.equal(DEFAULT_SOCIAL_IMAGE.height, 185)
  assert.ok(DEFAULT_SOCIAL_IMAGE.alt.length > 0)
})

test('SITE_DEFAULT_DESCRIPTION: identischer Text wie der bisherige Root-Layout-Default (keine neue Copy)', () => {
  assert.equal(SITE_DEFAULT_DESCRIPTION, 'Finde die passende Liveband für dein Event – persönlich, direkt und ohne Mittelmann.')
})
