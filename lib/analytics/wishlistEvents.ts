import { trackEvent } from 'fathom-client'

// Fathom-Ereignisse zur Merkliste. Fathom-Ereignisnamen sind nicht aenderbar
// und nicht loeschbar -- deshalb bewusst starr. Bewusst ohne Bandnamen/-slugs
// und ohne personenbezogene Daten.
export const WISHLIST_BAND_ADDED = 'wishlist_band_added'
export const MULTI_BAND_INQUIRY_STARTED = 'multi_band_inquiry_started'

// Sendet nur, wenn Fathom geladen ist (Gating allein in app/layout.tsx: nur
// Produktion auf der Hauptdomain). Ein Messfehler darf nie etwas blockieren.
export function trackWishlistEvent(eventName: string): void {
  try {
    trackEvent(eventName)
  } catch {
    // Messung ist optional
  }
}
