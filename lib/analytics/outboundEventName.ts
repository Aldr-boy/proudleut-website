// Namensregel fuer Fathom-Ereignisse bei Klicks auf externe Kanaele/Links
// ("Mehr von ..." auf Band- und Musikerprofilen). Fathom-Ereignisnamen sind
// nicht aenderbar und nicht loeschbar -- deshalb bewusst starr:
//   Band:    "band <slug> <kanal>"      z. B. "band tegernseer-tanzlmusi instagram"
//   Musiker: "musiker <slug> <label>"   z. B. "musiker dominik-palmer website"
// Alles klein, Woerter mit Bindestrich, Umlaute umgeschrieben (ae/oe/ue/ss),
// keine Sonderzeichen oder Emojis. Wird ein Label spaeter geaendert, entsteht
// ein neuer Ereignisname (akzeptiert).

export type BandChannel = 'website' | 'instagram' | 'facebook' | 'youtube' | 'spotify'

export function toEventSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function bandChannelEventName(bandSlug: string, channel: BandChannel): string {
  return `band ${toEventSlug(bandSlug)} ${channel}`
}

export function musikerLinkEventName(personSlug: string, label: string): string {
  return `musiker ${toEventSlug(personSlug)} ${toEventSlug(label)}`
}
