// Seitentitel eines Musikerprofils: "Name – Rolle" (das Layout haengt
// " – proudleut.com" an, siehe app/layout.tsx title.template). Die Rolle ist
// dieselbe Angabe wie auf der Musikerkarte (derivePersonHeroRole). Fehlt sie,
// bleibt es beim Namen.

export function buildPersonTitle(name: string, role?: string | null): string {
  const r = role?.trim()
  return r ? `${name} – ${r}` : name
}
