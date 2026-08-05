import type { AnfrageStatus, SendStatus } from './types.ts';

// Reine, testbare Ableitung des Gesamtstatus einer Anfrage aus den
// Einzel-Versandstatus ihrer anfrage_bands-Zeilen (DoD 13 "Gesamtstatus
// nachvollziehbar aus Einzelstatus ableiten").
export function computeOverallStatus(bandStatuses: SendStatus[]): AnfrageStatus {
  const allSent = bandStatuses.length > 0 && bandStatuses.every((s) => s === 'gesendet');
  if (allSent) return 'versendet';

  const allFailed = bandStatuses.length > 0 && bandStatuses.every((s) => s === 'fehlgeschlagen');
  if (allFailed) return 'fehlerhaft';

  const anySent = bandStatuses.some((s) => s === 'gesendet');
  if (anySent) return 'teilweise_versendet';

  const anyUngeklaert = bandStatuses.some((s) => s === 'ungeklaert');
  if (anyUngeklaert) return 'ungeklaert';

  return 'fehlerhaft';
}
