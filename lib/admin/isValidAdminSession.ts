// Reine, von next/headers UNABHAENGIGE Vergleichslogik -- bewusst in ein
// eigenes Modul ohne jeden Next.js-Import ausgelagert, damit sie ohne
// Next.js-Request-Kontext per node:test direkt unit-testbar ist.
// requireAdminSession.ts importiert next/headers und next/navigation --
// Node's ESM-Loader kann "next/headers" ausserhalb von Next.js' eigener
// Bundler-Aufloesung nicht resolven (empirisch bestaetigt:
// ERR_MODULE_NOT_FOUND bei einem direkten node:test-Import), ein Test
// dieser Datei wuerde daher schon am Import scheitern, unabhaengig vom
// eigentlichen Testinhalt.
//
// Gibt ausschliesslich ein boolean zurueck -- Secret und Cookie-Wert
// koennen dadurch strukturell nicht in eine Fehlermeldung oder einen
// Rueckgabewert gelangen.
export function isValidAdminSession(
  cookieValue: string | undefined,
  adminSecret: string | undefined
): boolean {
  return Boolean(adminSecret) && cookieValue === adminSecret
}
