// Zentrale, deterministische Sichtbarkeitsregel fuer Social-Follower-
// Kennzahlen auf der oeffentlichen Bandseite (Erweiterung "Mehr von
// [Band]", nicht der bestehende, davon unabhaengige BandSocialIndex --
// siehe dortige Komponente fuer die abweichende, ungefilterte Anzeige).
//
// Eine Zahl wird NUR angezeigt, wenn sie eine gueltige positive ganze
// Zahl ist UND ein gueltiges, nicht-zukuenftiges Pruefdatum vorliegt, das
// hoechstens FOLLOWER_COUNT_MAX_AGE_MONTHS Kalendermonate zurueckliegt.
// Genau am Stichtag bleibt der Wert gueltig (>=), unmittelbar aelter
// nicht mehr.

export const FOLLOWER_COUNT_MAX_AGE_MONTHS = 12

function isValidCount(count: number | null | undefined): count is number {
  return typeof count === 'number' && Number.isInteger(count) && count > 0
}

function parseValidDate(checkedAt: string | null | undefined): Date | null {
  if (!checkedAt) return null
  const d = new Date(checkedAt)
  if (Number.isNaN(d.getTime())) return null
  return d
}

// Kalendermonats-Stichtag: now minus FOLLOWER_COUNT_MAX_AGE_MONTHS Monate,
// per setMonth (Kalendermonats-Arithmetik, keine feste Tage-/ms-Spanne --
// "zwoelf Kalendermonate" ist im Auftrag ausdruecklich so benannt).
function maxAgeCutoff(now: Date): Date {
  const cutoff = new Date(now.getTime())
  cutoff.setMonth(cutoff.getMonth() - FOLLOWER_COUNT_MAX_AGE_MONTHS)
  return cutoff
}

export function isFollowerCountVisible(
  count: number | null | undefined,
  checkedAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!isValidCount(count)) return false

  const checkedDate = parseValidDate(checkedAt)
  if (!checkedDate) return false

  if (checkedDate.getTime() > now.getTime()) return false

  return checkedDate.getTime() >= maxAgeCutoff(now).getTime()
}

// Anzeige des gemeinsamen/getrennten Pruefstands unter der "Mehr von
// [Band]"-Liste. Nimmt ausschliesslich bereits als sichtbar entschiedene
// Metriken entgegen (siehe isFollowerCountVisible) -- diese Funktion
// trifft selbst keine Sichtbarkeitsentscheidung, nur die
// Gruppierungsentscheidung "ein gemeinsames Datum zeigen oder je
// Plattform".
export type VisibleFollowerCheck = { checkedAt: string }

export type FollowerStandDisplay =
  | { kind: 'none' }
  | { kind: 'shared'; checkedAt: string }
  | { kind: 'per_platform' }

// Zwei Zeitstempel gelten nur dann als "derselbe Pruefstand", wenn sie
// denselben Kalendertag (UTC) tragen -- NICHT bereits bei gleichem Monat
// (Auftrag: "Ein gemeinsamer Stand darf nicht aus unterschiedlichen Daten
// allein wegen desselben Monats abgeleitet werden").
function sameCalendarDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  )
}

export function resolveFollowerStandDisplay(metrics: VisibleFollowerCheck[]): FollowerStandDisplay {
  if (metrics.length === 0) return { kind: 'none' }

  const first = metrics[0].checkedAt
  const allSameDay = metrics.every((m) => sameCalendarDay(m.checkedAt, first))

  if (allSameDay) return { kind: 'shared', checkedAt: first }
  return { kind: 'per_platform' }
}
