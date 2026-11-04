// Seitentitel eines Bandprofils: "Name – Bandart" (das Layout haengt
// " – proudleut.com" an, siehe app/layout.tsx title.template). Die Bandart
// ist ausschliesslich die primaere Bandart aus der Datenbank
// (band_band_types.is_primary, hoechstens eine je Band), unveraendert
// uebernommen. Ohne primaere Bandart bleibt es beim Namen. Wuerde der
// fertige Titel inklusive Suffix laenger als 70 Zeichen, entfaellt die
// Bandart komplett -- es wird nichts gekuerzt.

export const BAND_TITLE_SUFFIX = ' – proudleut.com'
export const BAND_TITLE_MAX_LENGTH = 70

export function buildBandTitle(name: string, primaryBandart?: string | null): string {
  const art = primaryBandart?.trim()
  if (!art) return name
  const withArt = `${name} – ${art}`
  return (withArt + BAND_TITLE_SUFFIX).length > BAND_TITLE_MAX_LENGTH ? name : withArt
}
