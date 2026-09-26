// Reine Anzeigeregel fuer das eigene Stand-Datum der Spotify-Kennzahl
// "Monatliche Hoerer*innen" (BandContactSection). Rein darstellend --
// trifft KEINE Sichtbarkeitsentscheidung (12-Monats-Regel bleibt in
// isFollowerCountVisible) und fliesst NICHT in resolveFollowerStandDisplay
// ein: der gemeinsame Follower-Stand wird ausschliesslich aus Follower-
// Metriken abgeleitet, Spotify wird hier nur dagegen verglichen.
//
// Ist ein gemeinsamer Stand ("Stand: September 2026") sichtbar und liegt
// das Spotify-Datum im selben Kalendermonat (UTC, wie die Formatierung im
// Renderort), waere ein zweites "Stand: 26.09.2026" nur eine Doppelung.
// In allen anderen Faellen (kein gemeinsamer Stand, je Plattform eigene
// Daten, anderer Monat/Jahr) bleibt das eigene Datum sichtbar.

import type { FollowerStandDisplay } from './followerCountVisibility'

function sameCalendarMonthUtc(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth()
}

export function shouldShowOwnListenersStand(
  listenersAsOf: string,
  followerStand: FollowerStandDisplay,
): boolean {
  if (followerStand.kind !== 'shared') return true
  return !sameCalendarMonthUtc(listenersAsOf, followerStand.checkedAt)
}
