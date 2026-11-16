// Seitentitel eines Bandprofils: "Name – Bandart aus Ort" (das Layout haengt
// " – proudleut.com" an, siehe app/layout.tsx title.template). Die Bandart
// ist ausschliesslich die primaere Bandart aus der Datenbank
// (band_band_types.is_primary, hoechstens eine je Band), unveraendert
// uebernommen. Ohne primaere Bandart bleibt es beim Namen. Wuerde der
// fertige Titel inklusive Suffix laenger als 70 Zeichen, entfaellt die
// Bandart komplett -- es wird nichts gekuerzt.
//
// Ort: nur die Stadt/Gemeinde aus der Herkunftsangabe der Bandseite (ohne
// Region). Fehlt der Ort (oder ist die Herkunft ausgeblendet), oder wuerde
// der Titel mit Ort inklusive Suffix laenger als 75 Zeichen (eigene
// Vorgabe), bleibt der Titel wie ohne Ort.

export const BAND_TITLE_SUFFIX = ' – proudleut.com'
export const BAND_TITLE_MAX_LENGTH = 70
export const BAND_TITLE_WITH_CITY_MAX_LENGTH = 75

export function buildBandTitle(
  name: string,
  primaryBandart?: string | null,
  city?: string | null,
): string {
  const art = primaryBandart?.trim()
  if (!art) return name
  const withArt = `${name} – ${art}`
  if ((withArt + BAND_TITLE_SUFFIX).length > BAND_TITLE_MAX_LENGTH) return name
  const ort = city?.trim()
  if (!ort) return withArt
  const withCity = `${withArt} aus ${ort}`
  return (withCity + BAND_TITLE_SUFFIX).length > BAND_TITLE_WITH_CITY_MAX_LENGTH ? withArt : withCity
}
