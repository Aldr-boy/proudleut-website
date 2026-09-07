// Gemeinsame Grundlage fuer Paket 1 (Cutover-Metadaten): eine einzige
// Quelle fuer die zukuenftige Hauptdomain, damit metadataBase (app/layout.tsx)
// und die manuell aufgeloesten Canonical-/Social-URLs in den drei
// Routentypen (Band/Veranstaltung/Musiker) nicht auseinanderlaufen.
export const SITE_URL = 'https://proudleut.com'

// Bisherige Default-Description aus app/layout.tsx, hierher ausgelagert,
// damit Musikerseiten dieselbe "effektive" Description (siehe Paket-1-
// Auftrag, Abschnitt "Musiker-Description NICHT korrigieren") explizit in
// og:description/twitter:description setzen koennen, statt sich auf die
// implizite Next.js-Metadata-Vererbung zu verlassen -- ohne den Text ein
// zweites Mal zu formulieren.
export const SITE_DEFAULT_DESCRIPTION =
  'Finde die passende Liveband für dein Event – persönlich, direkt und ohne Mittelmann.'

// Baut aus einem absoluten oder Root-relativen Pfad eine absolute URL unter
// SITE_URL. Bereits absolute externe URLs (z. B. Supabase-Storage-Bilder)
// bleiben dabei unveraendert, da new URL(url, base) eine bereits absolute
// erste Angabe ignoriert die base.
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString()
}

// Schutz gegen versehentlich relative/ungueltige Social-Bild-URLs: nur
// tatsaechlich absolute https-URLs werden als seitenspezifisches Social-
// Bild akzeptiert, alles andere faellt auf DEFAULT_SOCIAL_IMAGE zurueck.
export function isAbsoluteHttpsUrl(value: string | undefined | null): value is string {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

// Einziges bereits im Projekt mehrfach verwendetes, generisches Marken-
// bild (Header/Footer) -- kein neues Asset fuer diesen Auftrag erstellt.
// Breite/Hoehe uebernommen aus der bestehenden, bereits validierten
// Verwendung in components/Footer.tsx (Image width={1004} height={185}).
export const DEFAULT_SOCIAL_IMAGE = {
  url: absoluteUrl('/images/proudleut-logo-white.png'),
  width: 1004,
  height: 185,
  alt: 'proudleut – Livebands entdecken',
}
