// Anzeigeformatierung fuer Follower-/Streaming-Kennzahlen, ausgelagert aus
// components/band/BandContactSection.tsx (Auftrag "Section 03 erweitern"),
// damit components/homepage/BandEinschaetzen.tsx dieselbe Formatierung
// verwenden kann, ohne sie zu duplizieren. Reine Funktionen, keine
// Sichtbarkeitsentscheidung (die bleibt in lib/socialLinks/
// followerCountVisibility.ts).

// Deutsche Zahlenformatierung, keine Abkuerzungen ("5,2k") -- Auftrag
// Abschnitt 2.
export function formatFollowerCount(n: number): string {
  return n.toLocaleString('de-DE');
}

// Feste Zeitzone UTC fuer die Formatierung: last_checked_at wird admin-
// seitig als reines Kalenderdatum (YYYY-MM-DD, UTC-Mitternacht)
// gespeichert (siehe lib/socialLinks/resolveSocialMetricsWrite.ts) --
// eine Formatierung in der Betrachter-Zeitzone koennte das Datum sonst um
// einen Tag verschieben.
export function formatStandDate(checkedAt: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(checkedAt));
}

export function formatStandMonthYear(checkedAt: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(checkedAt));
}
