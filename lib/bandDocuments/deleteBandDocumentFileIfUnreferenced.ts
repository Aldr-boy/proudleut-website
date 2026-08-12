import type { SupabaseClient } from '@supabase/supabase-js'
import { extractBandMediaStoragePath, BAND_MEDIA_BUCKET } from '../bandImages/storagePath.ts'

// Pendant zu lib/bandImages/deleteBandImageIfUnreferenced.ts fuer
// band_documents (Paket 2C). Nicht wiederverwendbar, da jene Funktion
// fest gegen die Tabelle media_assets und deren einzelne Spalte "url"
// verdrahtet ist -- band_documents hat zwei URL-Spalten (file_url,
// thumbnail_url), die PDF und Cover je einzeln referenzieren koennen.
//
// Bewusst OHNE next/headers- oder server-only-Import, Client als Parameter
// (dependency injection) -- identisches Testbarkeitsmuster wie das
// media_assets-Pendant.
export type BandDocumentStorageClient = SupabaseClient

// Aufrufreihenfolge (bindend): erst NACH einem bereits erfolgreichen
// DB-Delete/-Update aufrufen. Ein Storage-Fehler hier wird ausschliesslich
// geloggt, niemals an den Aufrufer zurueckgegeben -- der bereits
// erfolgreiche DB-Vorgang bleibt in jedem Fall erfolgreich.
export async function deleteBandDocumentFileIfUnreferenced(
  client: BandDocumentStorageClient,
  url: string,
  logPrefix: string
): Promise<void> {
  const storagePath = extractBandMediaStoragePath(url)
  if (!storagePath) return

  const [fileRefCheck, thumbnailRefCheck] = await Promise.all([
    client.from('band_documents').select('id').eq('file_url', url).limit(1),
    client.from('band_documents').select('id').eq('thumbnail_url', url).limit(1),
  ])

  if (fileRefCheck.error || thumbnailRefCheck.error) {
    // Fail-safe: bei einer fehlgeschlagenen Referenzpruefung wird NICHT
    // geloescht -- ein faelschlich geloeschtes, noch verwendetes Objekt
    // waere schwerer zu bemerken und zu reparieren als ein einzelnes,
    // vorerst verwaist bleibendes Storage-Objekt.
    const message = fileRefCheck.error?.message ?? thumbnailRefCheck.error?.message
    console.error(`[${logPrefix}] Referenzpruefung vor Loeschung fehlgeschlagen, Objekt bleibt sicherheitshalber erhalten (${storagePath}): ${message}`)
    return
  }

  const stillReferenced = (fileRefCheck.data?.length ?? 0) > 0 || (thumbnailRefCheck.data?.length ?? 0) > 0
  if (stillReferenced) return

  const { error: deleteError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([storagePath])
  if (deleteError) {
    console.error(`[${logPrefix}] Nicht mehr referenziertes Objekt konnte nicht entfernt werden (${storagePath}): ${deleteError.message}`)
  }
}
