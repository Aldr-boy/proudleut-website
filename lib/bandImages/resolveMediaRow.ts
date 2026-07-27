// Bestimmt aus den geladenen media_assets-Zeilen einer Rolle (z. B. alle
// hero- oder alle thumbnail-Zeilen einer Band), welche davon aktuell
// oeffentlich angezeigt wird -- exakt dieselbe Logik wie
// lib/supabase/normalizeBand.ts (bySortOrder, kleinster sort_order
// zuerst, kein weiterer Tie-Breaker). Rollenneutral: wird sowohl vom
// Hero- als auch vom Thumbnail-Editor verwendet. Es existiert KEIN
// Unique-Constraint auf (band_id, role) in public.media_assets --
// mehrere Zeilen derselben Rolle pro Band sind strukturell moeglich,
// wenn auch aktuell unerwartet.
//
// Liefert 'ambiguous', wenn zwei oder mehr Zeilen denselben sort_order
// tragen: in diesem Fall ist NICHT sicher bestimmbar, welche Zeile das
// oeffentliche Frontend tatsaechlich anzeigt (Array.sort ist zwar
// stabil, aber die Ausgangsreihenfolge der DB-Antwort ist ohne
// expliziten zweiten ORDER-BY-Schluessel nicht garantiert). Fail-closed:
// kein Schreibversuch, keine Annahme.

export type MediaRowResolution<T> =
  | { kind: 'none' }
  | { kind: 'resolved'; row: T }
  | { kind: 'ambiguous' }

export function resolvePubliclyUsedMediaRow<T extends { sort_order: number }>(
  rows: T[],
): MediaRowResolution<T> {
  if (rows.length === 0) return { kind: 'none' }
  if (rows.length === 1) return { kind: 'resolved', row: rows[0] }

  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  if (sorted[0].sort_order === sorted[1].sort_order) return { kind: 'ambiguous' }

  return { kind: 'resolved', row: sorted[0] }
}
