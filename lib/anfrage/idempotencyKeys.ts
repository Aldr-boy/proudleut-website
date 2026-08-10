import { BAND_TEMPLATE_VERSION, CONFIRMATION_TEMPLATE_VERSION } from './constants.ts';

// Deterministische, pro fachlicher Mail eindeutige Resend-Idempotency-Keys.
// Enthalten ausschliesslich UUIDs + Template-Version -- keine
// personenbezogenen Daten. Ein Retry MUSS denselben Key liefern wie der
// urspruengliche Versuch, deshalb sind beide Funktionen rein und
// deterministisch (keine Zufallskomponente). Die Default-Parameter zeigen
// bewusst je Funktion auf die passende, getrennte Template-Version (siehe
// constants.ts) -- Aufrufer koennen den Wert bei Bedarf trotzdem explizit
// ueberschreiben (z. B. fuer Tests).
export function buildBandMailIdempotencyKey(
  anfrageId: string,
  anfrageBandId: string,
  templateVersion: string = BAND_TEMPLATE_VERSION
): string {
  return `inquiry/${anfrageId}/band/${anfrageBandId}/${templateVersion}`;
}

export function buildConfirmationIdempotencyKey(
  anfrageId: string,
  templateVersion: string = CONFIRMATION_TEMPLATE_VERSION
): string {
  return `inquiry/${anfrageId}/confirmation/${templateVersion}`;
}
