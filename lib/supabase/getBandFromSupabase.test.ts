import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// queries.ts importiert './client' ohne Dateiendung (Next.js loest das auf,
// Node nicht). Nur fuer diesen Test wird die Endung ergaenzt.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) return nextResolve(`${specifier}.ts`, context)
      throw err
    }
  },
})

// client.ts bricht ohne diese Variablen ab; es wird keine Verbindung aufgebaut,
// weil unten supabase.from durch eine Attrappe ersetzt wird.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

const { supabase } = await import('./client.ts')
const { getBandFromSupabase } = await import('./queries.ts')
const { normalizeBandFromSupabase } = await import('./normalizeBand.ts')
const { buildBandTitle } = await import('../seo/bandTitle.ts')

// Attrappe, die sich wie Supabase verhaelt: ein Feld kommt nur zurueck, wenn
// es im select-Text der Abfrage steht.
function mockSupabase() {
  const captured = { select: '' }
  const builder = {
    select(text: string) {
      captured.select = text
      return builder
    },
    eq() {
      return builder
    },
    async single() {
      const loadsIsPrimary = /band_band_types\s*\(\s*is_primary/.test(captured.select)
      const entry: Record<string, unknown> = { band_types: { name: 'Bayrische Partyband', slug: 'bayrische-partyband' } }
      if (loadsIsPrimary) entry.is_primary = true
      return {
        data: { id: 'b1', name: 'Donnaweda', slug: 'donnaweda', status: 'active', band_band_types: [entry] },
        error: null,
      }
    },
  }
  ;(supabase as unknown as { from: () => typeof builder }).from = () => builder
  return captured
}

test('getBandFromSupabase laedt is_primary der Bandarten mit', async () => {
  const captured = mockSupabase()
  await getBandFromSupabase('donnaweda')
  assert.match(captured.select, /band_band_types\s*\(\s*is_primary\s*,\s*band_types\s*\(\*\)\s*\)/)
})

test('Der geladene Datensatz liefert die primaere Bandart im Seitentitel', async () => {
  mockSupabase()
  const { data } = await getBandFromSupabase('donnaweda')
  const band = normalizeBandFromSupabase(data)
  assert.equal(band.primaryBandart, 'Bayrische Partyband')
  assert.equal(buildBandTitle(band.name, band.primaryBandart), 'Donnaweda – Bayrische Partyband')
})
