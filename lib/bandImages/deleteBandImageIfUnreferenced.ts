import type { SupabaseClient } from '@supabase/supabase-js'
import { extractBandMediaStoragePath, BAND_MEDIA_BUCKET } from './storagePath.ts'

// Verhindert, dass das Loeschen eines alten Storage-Objekts (nach einem
// erfolgreichen Hero-/Thumbnail-Wechsel oder einer erfolgreichen Galerie-
// Loeschung) ein anderes, weiterhin gueltiges media_assets-Bild
// beschaedigt -- Hero, Thumbnail, Logo und Galeriezeilen koennen
// theoretisch dieselbe vollstaendige URL referenzieren (z. B. wenn
// dieselbe hochgeladene Datei fuer mehrere Rollen verwendet wurde). Ein
// bedingungsloses Loeschen nach jedem Rollenwechsel wuerde in diesem Fall
// eine noch aktiv verwendete Datei aus dem Storage entfernen.
//
// Bewusst OHNE next/headers- oder server-only-Import -- der Client wird
// als Parameter uebergeben (dependency injection), damit dieser Helper
// ohne Next.js-Request-Kontext per node:test direkt mit einem
// Fake-Client testbar ist.
//
// Import type-only (siehe oben) -- der vollstaendige @supabase/supabase-js-
// Typ wird nur fuer die Signatur gebraucht, keine echte Laufzeit-
// Abhaengigkeit dieses Moduls. In Tests wird ein einfacher Fake-Client
// per "as unknown as SupabaseClient" uebergeben (uebliches, akzeptiertes
// Muster fuer schwer direkt instanziierbare SDK-Typen) -- TypeScript-
// Typen existieren zur Laufzeit ohnehin nicht, der Cast aendert am
// tatsaechlichen Testverhalten nichts.
export type BandImageStorageClient = SupabaseClient

// Aufrufreihenfolge (bindend): erst NACH einem bereits erfolgreichen
// DB-Update bzw. einer bereits erfolgreichen Galerie-Delete-RPC
// aufrufen -- diese Funktion selbst prueft und loescht nur noch das
// ALTE Storage-Objekt, sie beeinflusst den DB-/RPC-Erfolg nicht mehr.
// Ein Storage-Fehler hier wird ausschliesslich geloggt, niemals an den
// Aufrufer als Fehler zurueckgegeben -- der bereits erfolgreiche
// DB-Vorgang bleibt in jedem Fall erfolgreich.
export async function deleteBandImageIfUnreferenced(
  client: BandImageStorageClient,
  url: string,
  logPrefix: string
): Promise<void> {
  const storagePath = extractBandMediaStoragePath(url)
  if (!storagePath) return

  const { data, error } = await client
    .from('media_assets')
    .select('id')
    .eq('url', url)
    .limit(1)

  if (error) {
    // Fail-safe: bei einer fehlgeschlagenen Referenzpruefung wird NICHT
    // geloescht -- ein faelschlich geloeschtes, noch verwendetes Bild
    // waere schwerer zu bemerken und zu reparieren als ein einzelnes,
    // vorerst verwaist bleibendes Storage-Objekt.
    console.error(`[${logPrefix}] Referenzpruefung vor Loeschung fehlgeschlagen, Objekt bleibt sicherheitshalber erhalten (${storagePath}): ${error.message}`)
    return
  }

  if (data && data.length > 0) {
    // Mindestens eine andere media_assets-Zeile referenziert dieselbe
    // URL noch -- Objekt bleibt erhalten.
    return
  }

  const { error: deleteError } = await client.storage.from(BAND_MEDIA_BUCKET).remove([storagePath])
  if (deleteError) {
    console.error(`[${logPrefix}] Nicht mehr referenziertes Objekt konnte nicht entfernt werden (${storagePath}): ${deleteError.message}`)
  }
}
