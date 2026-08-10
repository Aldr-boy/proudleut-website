import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveActiveBandsWithContact } from './resolveBands.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

// Minimaler Test-Double fuer genau die eine Query-Kette, die
// resolveActiveBandsWithContact verwendet: .from('bands').select(...).in('slug', slugs).
// Kein generischer Supabase-Mock -- dieses Repo hat bewusst keine
// DB-Mocking-Infrastruktur (siehe lib/admin/actionsAuthGuardOrder.test.ts),
// dieser Double ist ausschliesslich fuer diese eine reine Funktion gebaut.
function fakeSupabase(rows: unknown[]): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        in: async () => ({ data: rows, error: null }),
      }),
    }),
  } as unknown as SupabaseClient
}

const ACTIVE_WITH_CONTACT = {
  id: 'band-1', name: 'Band Eins', slug: 'band-eins', status: 'active',
  band_contacts: [{ email: 'kontakt@band-eins.de', is_primary_inquiry: true }],
}
const ACTIVE_WITHOUT_CONTACT = {
  id: 'band-2', name: 'Band Zwei', slug: 'band-zwei', status: 'active',
  band_contacts: [],
}
const INACTIVE = {
  id: 'band-3', name: 'Band Drei', slug: 'band-drei', status: 'draft',
  band_contacts: [{ email: 'kontakt@band-drei.de', is_primary_inquiry: true }],
}

test('resolveActiveBandsWithContact: aktive Band mit gueltigem Kontakt wird aufgeloest', async () => {
  const client = fakeSupabase([ACTIVE_WITH_CONTACT])
  const result = await resolveActiveBandsWithContact(client, ['band-eins'])
  assert.deepEqual(result, {
    ok: true,
    bands: [{ bandId: 'band-1', name: 'Band Eins', slug: 'band-eins', recipientEmail: 'kontakt@band-eins.de' }],
  })
})

test('resolveActiveBandsWithContact: inaktive Band wird abgelehnt (mit Bandname im Ergebnis)', async () => {
  const client = fakeSupabase([INACTIVE])
  const result = await resolveActiveBandsWithContact(client, ['band-drei'])
  assert.deepEqual(result, { ok: false, bandName: 'Band Drei' })
})

test('resolveActiveBandsWithContact: nicht existente Band wird abgelehnt (Slug als Fallback-Name)', async () => {
  const client = fakeSupabase([])
  const result = await resolveActiveBandsWithContact(client, ['unbekannt'])
  assert.deepEqual(result, { ok: false, bandName: 'unbekannt' })
})

test('resolveActiveBandsWithContact: aktive Band OHNE Kontakt wird abgelehnt', async () => {
  const client = fakeSupabase([ACTIVE_WITHOUT_CONTACT])
  const result = await resolveActiveBandsWithContact(client, ['band-zwei'])
  assert.deepEqual(result, { ok: false, bandName: 'Band Zwei' })
})

test('resolveActiveBandsWithContact: eine unaufloesbare Band unter mehreren stoppt die GESAMTE Aufloesung', async () => {
  const client = fakeSupabase([ACTIVE_WITH_CONTACT, ACTIVE_WITHOUT_CONTACT])
  const result = await resolveActiveBandsWithContact(client, ['band-eins', 'band-zwei'])
  assert.equal(result.ok, false)
})

test('resolveActiveBandsWithContact: Reihenfolge der Eingabe-Slugs bleibt erhalten (fuer anfrage_bands.position)', async () => {
  const secondBand = { ...ACTIVE_WITH_CONTACT, id: 'band-4', name: 'Band Vier', slug: 'band-vier', band_contacts: [{ email: 'kontakt@band-vier.de', is_primary_inquiry: true }] }
  const client = fakeSupabase([secondBand, ACTIVE_WITH_CONTACT])
  const result = await resolveActiveBandsWithContact(client, ['band-vier', 'band-eins'])
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.bands[0].name, 'Band Vier')
    assert.equal(result.bands[1].name, 'Band Eins')
  }
})
