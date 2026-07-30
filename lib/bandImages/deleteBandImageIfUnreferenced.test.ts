import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deleteBandImageIfUnreferenced } from './deleteBandImageIfUnreferenced.ts'

const SHARED_URL = 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/testband/hero-abc123.jpg'
const STORAGE_PATH = 'testband/hero-abc123.jpg'

// Minimaler Fake-Client, der genau die Aufrufkette nachbildet, die
// deleteBandImageIfUnreferenced tatsaechlich verwendet
// (.from().select().eq().limit() fuer die Referenzpruefung,
// .storage.from().remove() fuer die Loeschung). Zeichnet auf, ob remove()
// aufgerufen wurde, um "wurde NICHT geloescht" ebenso beweisbar zu machen
// wie "wurde geloescht".
function buildFakeClient(options: {
  referenceQueryResult: { data: { id: string }[] | null; error: { message: string } | null }
  removeResult?: { error: { message: string } | null }
}) {
  const calls = { removeCalledWith: null as string[] | null }
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: async () => options.referenceQueryResult,
        }),
      }),
    }),
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          calls.removeCalledWith = paths
          return options.removeResult ?? { error: null }
        },
      }),
    },
  }
  return { client: client as unknown as Parameters<typeof deleteBandImageIfUnreferenced>[0], calls }
}

test('deleteBandImageIfUnreferenced: mindestens eine verbleibende Referenz -> Objekt wird NICHT geloescht (Szenario Hero+Thumbnail teilen eine URL)', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: [{ id: 'thumbnail-row-id' }], error: null },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'hero-image')

  assert.equal(calls.removeCalledWith, null, 'storage.remove() darf bei verbleibender Referenz nicht aufgerufen werden')
})

test('deleteBandImageIfUnreferenced: keine verbleibende Referenz -> Objekt wird geloescht (Hero ist die einzige Referenz)', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: [], error: null },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'hero-image')

  assert.deepEqual(calls.removeCalledWith, [STORAGE_PATH], 'storage.remove() muss mit dem korrekten Pfad aufgerufen werden')
})

test('deleteBandImageIfUnreferenced: Thumbnail-Aufrufer, Thumbnail+Hero teilen eine URL -> Objekt wird NICHT geloescht', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: [{ id: 'hero-row-id' }], error: null },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'thumbnail-image')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandImageIfUnreferenced: Galerie-Aufrufer, Galeriezeile teilt URL mit anderer Medienzeile -> Objekt wird NICHT geloescht', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: [{ id: 'other-media-row-id' }], error: null },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'gallery-image')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandImageIfUnreferenced: Galerie-Aufrufer, Galeriezeile war die einzige Referenz -> Objekt wird geloescht', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: [], error: null },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'gallery-image')

  assert.deepEqual(calls.removeCalledWith, [STORAGE_PATH])
})

test('deleteBandImageIfUnreferenced: Fehler bei der Referenzabfrage -> fail-safe, kein Storage-Delete', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: null, error: { message: 'connection reset' } },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'hero-image')

  assert.equal(calls.removeCalledWith, null, 'bei einer fehlgeschlagenen Referenzpruefung darf niemals geloescht werden')
})

test('deleteBandImageIfUnreferenced: null-Daten ohne Fehler (kein Treffer) werden wie "keine Referenz" behandelt -> Objekt wird geloescht', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: null, error: null },
  })

  await deleteBandImageIfUnreferenced(client, SHARED_URL, 'hero-image')

  assert.deepEqual(calls.removeCalledWith, [STORAGE_PATH])
})

test('deleteBandImageIfUnreferenced: URL ohne gueltigen band-media-Storage-Pfad (z. B. Fremd-URL) -> keine Abfrage, kein Delete', async () => {
  const { client, calls } = buildFakeClient({
    referenceQueryResult: { data: [], error: null },
  })

  await deleteBandImageIfUnreferenced(client, 'https://andere-domain.example/nicht-unser-bucket/bild.jpg', 'hero-image')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandImageIfUnreferenced: ein Storage-Fehler beim Loeschen wird nur geloggt, wirft keine Exception', async () => {
  const { client } = buildFakeClient({
    referenceQueryResult: { data: [], error: null },
    removeResult: { error: { message: 'bucket unavailable' } },
  })

  await assert.doesNotReject(() => deleteBandImageIfUnreferenced(client, SHARED_URL, 'hero-image'))
})
