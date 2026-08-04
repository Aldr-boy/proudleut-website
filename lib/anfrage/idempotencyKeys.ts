import { TEMPLATE_VERSION } from './constants.ts';

// Deterministische, pro fachlicher Mail eindeutige Resend-Idempotency-Keys.
// Enthalten ausschliesslich UUIDs + Template-Version -- keine
// personenbezogenen Daten. Ein Retry MUSS denselben Key liefern wie der
// urspruengliche Versuch, deshalb sind beide Funktionen rein und
// deterministisch (keine Zufallskomponente).
export function buildBandMailIdempotencyKey(
  anfrageId: string,
  anfrageBandId: string,
  templateVersion: string = TEMPLATE_VERSION
): string {
  return `inquiry/${anfrageId}/band/${anfrageBandId}/${templateVersion}`;
}

export function buildConfirmationIdempotencyKey(
  anfrageId: string,
  templateVersion: string = TEMPLATE_VERSION
): string {
  return `inquiry/${anfrageId}/confirmation/${templateVersion}`;
}
