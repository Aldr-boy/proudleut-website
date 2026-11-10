import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  BAND_LOGO_CACHE_CONTROL,
  BAND_LOGO_SECURITY_HEADERS,
  buildBandLogoUpstreamUrl,
  isValidBandLogoSlug,
  looksLikeSvg,
  toProxiedBandLogoUrl,
} from './svgLogoProxy.ts'

const SUPABASE = 'https://bfyucjjyarvqeftqqihm.supabase.co'
const base = `${SUPABASE}/storage/v1/object/public/band-media`

const LOGO_SLUGS = [
  'bigbeat-band', 'blechhilfswerk', 'd-rieder', 'deep-decision', 'free-vocals', 'gaudinockerl',
  'geraldino', 'lichtfaenger-music', 'michael-jackts-net', 'nice-ties-band', 'san2-and-his-soul-patrol',
]

test('alle 11 bekannten Logo-Adressen werden auf proudleut.com-Pfade umgeschrieben', () => {
  for (const slug of LOGO_SLUGS) {
    assert.equal(toProxiedBandLogoUrl(`${base}/${slug}/logo.svg`, SUPABASE), `/band-logo/${slug}/logo.svg`)
  }
})

test('Umschreibung gilt nur fuer genau <band>/logo.svg im eigenen Projekt', () => {
  const same = (u: string) => assert.equal(toProxiedBandLogoUrl(u, SUPABASE), u, u)
  same(`${base}/deep-decision/logo.png`) // andere Endung
  same(`${base}/deep-decision/logo-abc123.svg`) // anderer Dateiname
  same(`${base}/deep-decision/hero.svg`)
  same(`${base}/deep-decision/sub/logo.svg`) // tieferer Pfad
  same(`${base}/deep-decision/logo.svg?v=2`) // Query
  same(`${base}/deep-decision/logo.svg#x`) // Hash
  same(`${base}/deep-decision/document-1.pdf`) // PDF
  same(`${SUPABASE}/storage/v1/object/public/other-bucket/deep-decision/logo.svg`) // anderer Bucket
  same(`https://evil.supabase.co/storage/v1/object/public/band-media/deep-decision/logo.svg`) // fremdes Projekt
  same(`https://example.com/storage/v1/object/public/band-media/deep-decision/logo.svg`) // fremder Host
  same(`${base}/Deep_Decision/logo.svg`) // ungueltiger Slug
  same('nicht-eine-url')
})

test('Slug-Pruefung lehnt Pfad-Tricks ab', () => {
  for (const bad of ['', '..', '.', 'a/b', 'a%2Fb', '%2e%2e', 'a.b', 'A', '-a', 'a-', 'a--b', 'a b', 'a\\b', 'x'.repeat(101)]) {
    assert.equal(isValidBandLogoSlug(bad), false, JSON.stringify(bad))
    assert.equal(buildBandLogoUpstreamUrl(bad, SUPABASE), null, JSON.stringify(bad))
  }
  for (const slug of LOGO_SLUGS) assert.equal(isValidBandLogoSlug(slug), true, slug)
})

test('Upstream-Adresse: nur eigenes Projekt, fester Pfad; Fallback-Host wenn Variable fehlt', () => {
  assert.equal(buildBandLogoUpstreamUrl('deep-decision', SUPABASE), `${base}/deep-decision/logo.svg`)
  assert.equal(buildBandLogoUpstreamUrl('deep-decision', undefined), `${base}/deep-decision/logo.svg`)
  assert.equal(
    buildBandLogoUpstreamUrl('deep-decision', 'http://127.0.0.1:54321'),
    'http://127.0.0.1:54321/storage/v1/object/public/band-media/deep-decision/logo.svg'
  )
})

test('Schutz-Kopfzeilen: SVG-Typ, CSP mit sandbox, nosniff', () => {
  assert.equal(BAND_LOGO_SECURITY_HEADERS['Content-Type'], 'image/svg+xml')
  assert.match(BAND_LOGO_SECURITY_HEADERS['Content-Security-Policy'], /\bsandbox\b/)
  assert.match(BAND_LOGO_SECURITY_HEADERS['Content-Security-Policy'], /default-src 'none'/)
  assert.doesNotMatch(BAND_LOGO_SECURITY_HEADERS['Content-Security-Policy'], /script-src|allow-scripts|allow-same-origin/)
  assert.equal(BAND_LOGO_SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff')
})

test('Cache: kurz, kein immutable (Logo behaelt bei Austausch seine Adresse)', () => {
  assert.match(BAND_LOGO_CACHE_CONTROL, /max-age=300/)
  assert.doesNotMatch(BAND_LOGO_CACHE_CONTROL, /immutable|max-age=\d{5,}/)
})

test('SVG-Erkennung', () => {
  const enc = (s: string) => new TextEncoder().encode(s)
  assert.equal(looksLikeSvg(enc('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), true)
  assert.equal(looksLikeSvg(enc('<?xml version="1.0"?>\n<!-- c -->\n<svg viewBox="0 0 1 1"/>')), true)
  assert.equal(looksLikeSvg(enc('<html><body>nope</body></html>')), false)
  assert.equal(looksLikeSvg(enc('{"error":"Not found"}')), false)
})

test('Route: nur GET, Slug-Pruefung vor dem Abruf, keine Weiterleitung, kein Redirect-Folgen', () => {
  const src = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../app/band-logo/[slug]/logo.svg/route.ts'),
    'utf8'
  )
  assert.match(src, /export async function GET/)
  assert.doesNotMatch(src, /export async function (POST|PUT|PATCH|DELETE)/)
  assert.doesNotMatch(src, /Response\.redirect|NextResponse\.redirect|status:\s*30[1278]/)
  assert.match(src, /redirect:\s*'error'/)
  assert.ok(src.indexOf('buildBandLogoUpstreamUrl') < src.indexOf('fetch('), 'Slug-Pruefung muss vor dem fetch stehen')
})

test('BandHero: Logo-src laeuft ueber toProxiedBandLogoUrl', () => {
  const src = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../components/band/BandHero.tsx'),
    'utf8'
  )
  assert.match(src, /src=\{toProxiedBandLogoUrl\(band\.logo\.url, process\.env\.NEXT_PUBLIC_SUPABASE_URL\)\}/)
})
