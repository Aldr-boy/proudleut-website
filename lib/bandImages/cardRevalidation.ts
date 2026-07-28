// Routen, auf denen components/BandCard.tsx ein Bild ueber
// `thumbnailImage ?? heroImage` rendert. Sowohl ein Hero- als auch ein
// Thumbnail-Wechsel muessen dieselben Routen revalidieren: besitzt eine
// Band (noch) kein eigenes Thumbnail, wirkt ein reiner Hero-Wechsel ueber
// diesen Fallback direkt auf /bands und /veranstaltung/[slug] (beide ISR,
// revalidate=300 -- siehe app/bands/page.tsx, app/veranstaltung/[slug]/page.tsx).
// /band/[slug] selbst ist force-dynamic und wird hier bewusst nicht
// aufgefuehrt (siehe Aufrufer). Keine globale Site-Invalidierung.
export const BAND_CARD_REVALIDATION_PATHS: { path: string; type?: 'page' | 'layout' }[] = [
  { path: '/bands' },
  { path: '/veranstaltung/[slug]', type: 'page' },
]
