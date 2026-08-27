// Validierungshelfer fuer person_credits (Musikerseite-Redesign V1).
// Bewusst eigenstaendig, kleiner people-lokaler Helper -- identisches
// Prinzip wie lib/people/linkValidation.ts::isValidLinkLabel, aber fuer
// die Referenzenliste "Zusammengearbeitet mit" (nur Name, keine URL).

export const MAX_CREDIT_NAME_LENGTH = 80

export function isValidCreditName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_CREDIT_NAME_LENGTH
}
