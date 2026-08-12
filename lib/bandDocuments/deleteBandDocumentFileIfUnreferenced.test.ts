import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deleteBandDocumentFileIfUnreferenced } from './deleteBandDocumentFileIfUnreferenced.ts'

const SHARED_URL = 'https://bfyucjjyarvqeftqqihm.supabase.co/storage/v1/object/public/band-media/donnaweda/document-abc123.pdf'
const STORAGE_PATH = 'donnaweda/document-abc123.pdf'

type ColumnResult = { data: { id: string }[] | null; error: { message: string } | null }

// Fake-Client, der die tatsaechliche Aufrufkette nachbildet
// (.from('band_documents').select('id').eq(col, url).limit(1), je einmal
// fuer file_url und einmal fuer thumbnail_url) und zwischen beiden Spalten
// unterscheidet, damit "nur noch als Cover referenziert" von "gar nicht
// mehr referenziert" unterscheidbar getestet werden kann.
function buildFakeClient(options: {
  fileUrlResult: ColumnResult
  thumbnailUrlResult: ColumnResult
  removeResult?: { error: { message: string } | null }
}) {
  const calls = { removeCalledWith: null as string[] | null }
  const client = {
    from: () => ({
      select: () => ({
        eq: (column: string) => ({
          limit: async () =>
            column === 'file_url' ? options.fileUrlResult : options.thumbnailUrlResult,
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
  return { client: client as unknown as Parameters<typeof deleteBandDocumentFileIfUnreferenced>[0], calls }
}

test('deleteBandDocumentFileIfUnreferenced: keine Referenz in file_url oder thumbnail_url -> Objekt wird geloescht', async () => {
  const { client, calls } = buildFakeClient({
    fileUrlResult: { data: [], error: null },
    thumbnailUrlResult: { data: [], error: null },
  })

  await deleteBandDocumentFileIfUnreferenced(client, SHARED_URL, 'document-pdf')

  assert.deepEqual(calls.removeCalledWith, [STORAGE_PATH])
})

test('deleteBandDocumentFileIfUnreferenced: URL wird noch als file_url einer anderen Zeile referenziert -> kein Delete', async () => {
  const { client, calls } = buildFakeClient({
    fileUrlResult: { data: [{ id: 'other-doc-id' }], error: null },
    thumbnailUrlResult: { data: [], error: null },
  })

  await deleteBandDocumentFileIfUnreferenced(client, SHARED_URL, 'document-pdf')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandDocumentFileIfUnreferenced: dieselbe Datei ist gleichzeitig als Cover einer anderen Zeile referenziert -> kein Delete', async () => {
  const { client, calls } = buildFakeClient({
    fileUrlResult: { data: [], error: null },
    thumbnailUrlResult: { data: [{ id: 'other-doc-id' }], error: null },
  })

  await deleteBandDocumentFileIfUnreferenced(client, SHARED_URL, 'document-cover')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandDocumentFileIfUnreferenced: Fehler bei einer der beiden Referenzabfragen -> fail-safe, kein Delete', async () => {
  const { client, calls } = buildFakeClient({
    fileUrlResult: { data: null, error: { message: 'connection reset' } },
    thumbnailUrlResult: { data: [], error: null },
  })

  await deleteBandDocumentFileIfUnreferenced(client, SHARED_URL, 'document-pdf')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandDocumentFileIfUnreferenced: URL ohne gueltigen band-media-Pfad -> keine Abfrage, kein Delete', async () => {
  const { client, calls } = buildFakeClient({
    fileUrlResult: { data: [], error: null },
    thumbnailUrlResult: { data: [], error: null },
  })

  await deleteBandDocumentFileIfUnreferenced(client, 'https://andere-domain.example/nicht-unser-bucket/datei.pdf', 'document-pdf')

  assert.equal(calls.removeCalledWith, null)
})

test('deleteBandDocumentFileIfUnreferenced: Storage-Fehler beim Loeschen wird nur geloggt, wirft keine Exception', async () => {
  const { client } = buildFakeClient({
    fileUrlResult: { data: [], error: null },
    thumbnailUrlResult: { data: [], error: null },
    removeResult: { error: { message: 'bucket unavailable' } },
  })

  await assert.doesNotReject(() => deleteBandDocumentFileIfUnreferenced(client, SHARED_URL, 'document-pdf'))
})
