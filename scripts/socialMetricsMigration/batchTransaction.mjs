/**
 * batchTransaction.mjs
 *
 * Reine Entscheidungslogik fuer die atomare Batch-Uebernahme der
 * freigegebenen Social-Metrics-Vorschau in einer einzigen DB-Transaktion.
 * Keine I/O, kein pg-Zugriff -- ausschliesslich Funktionen von
 * (Erwartungswert, tatsaechlichem DB-Zustand) auf eine Klassifikation.
 * Der pg-Client-Code in migrateSocialMetricsExecute.mjs bleibt duenn und
 * ruft nur diese Funktionen auf, damit das Entscheidungsverhalten ohne
 * echte DB unit-testbar ist (gleiches Prinzip wie classify.mjs).
 */

/**
 * @param {{followers: number|null, checkedAtMs: number|null}} expectedPrevious - Wert laut freigegebener Vorschau (vor dem Import)
 * @param {{followers: number, checkedAtMs: number}} expectedFinal - vorgeschlagener Zielwert laut freigegebener Vorschau
 * @param {{followers: number|null, checkedAtMs: number|null}|null} actual - tatsaechlicher DB-Zustand (null = Zielrow nicht gefunden)
 * @returns {'ALREADY_APPLIED'|'TO_APPLY'|'MISMATCH_NOT_FOUND'|'MISMATCH_DRIFT'}
 */
export function classifyBatchRow(expectedPrevious, expectedFinal, actual) {
  if (actual === null) return 'MISMATCH_NOT_FOUND'

  const matchesFinal = actual.followers === expectedFinal.followers && actual.checkedAtMs === expectedFinal.checkedAtMs
  if (matchesFinal) return 'ALREADY_APPLIED'

  const matchesPrevious = actual.followers === expectedPrevious.followers && actual.checkedAtMs === expectedPrevious.checkedAtMs
  if (matchesPrevious) return 'TO_APPLY'

  return 'MISMATCH_DRIFT'
}

/**
 * Klassifiziert den gesamten Batch konservativ: nur ein vollstaendig
 * einheitlicher Zustand (alles bereits final ODER alles noch im
 * erwarteten Ausgangszustand) darf automatisch verarbeitet werden. Jede
 * Abweichung UND jede Mischung (ein Teil bereits final, ein Teil noch
 * Ausgangszustand, ohne echten Widerspruch) stoppt den gesamten Batch --
 * "keine eigenstaendige Teiluebernahme".
 *
 * @param {{ id: string, classification: ReturnType<typeof classifyBatchRow> }[]} classifiedRows
 * @returns {{
 *   outcome: 'ALL_ALREADY_APPLIED'|'ALL_FRESH_APPLY'|'ABORT_MIXED'|'ABORT_MISMATCH',
 *   toApplyIds: string[], alreadyAppliedIds: string[], mismatchIds: string[],
 * }}
 */
export function classifyBatch(classifiedRows) {
  const toApplyIds = classifiedRows.filter((r) => r.classification === 'TO_APPLY').map((r) => r.id)
  const alreadyAppliedIds = classifiedRows.filter((r) => r.classification === 'ALREADY_APPLIED').map((r) => r.id)
  const mismatchIds = classifiedRows.filter((r) => r.classification === 'MISMATCH_NOT_FOUND' || r.classification === 'MISMATCH_DRIFT').map((r) => r.id)

  if (mismatchIds.length > 0) return { outcome: 'ABORT_MISMATCH', toApplyIds, alreadyAppliedIds, mismatchIds }
  if (toApplyIds.length === 0) return { outcome: 'ALL_ALREADY_APPLIED', toApplyIds, alreadyAppliedIds, mismatchIds }
  if (alreadyAppliedIds.length === 0) return { outcome: 'ALL_FRESH_APPLY', toApplyIds, alreadyAppliedIds, mismatchIds }
  return { outcome: 'ABORT_MIXED', toApplyIds, alreadyAppliedIds, mismatchIds }
}

/** ISO-String (oder null) -> epoch-ms (oder null), fuer den Vergleich von last_checked_at. */
export function toEpochMs(isoOrDate) {
  if (isoOrDate === null || isoOrDate === undefined) return null
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}
