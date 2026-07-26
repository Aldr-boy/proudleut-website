// Bestimmt aus den geladenen hero-Zeilen einer Band, welche davon aktuell
// oeffentlich angezeigt wird -- exakt dieselbe Logik wie
// lib/supabase/normalizeBand.ts (bySortOrder, kleinster sort_order
// zuerst, kein weiterer Tie-Breaker fuer band_repertoire_styles bzw.
// hier fuer media_assets/hero). Es existiert KEIN Unique-Constraint auf
// (band_id, role) in public.media_assets -- mehrere hero-Zeilen pro Band
// sind strukturell moeglich, wenn auch aktuell unerwartet.
//
// Liefert 'ambiguous', wenn zwei oder mehr hero-Zeilen denselben
// sort_order tragen: in diesem Fall ist NICHT sicher bestimmbar, welche
// Zeile das oeffentliche Frontend tatsaechlich anzeigt (Array.sort ist
// zwar stabil, aber die Ausgangsreihenfolge der DB-Antwort ist ohne
// expliziten zweiten ORDER-BY-Schluessel nicht garantiert). Fail-closed:
// kein Schreibversuch, keine Annahme.

export type HeroRowResolution<T> =
  | { kind: 'none' }
  | { kind: 'resolved'; row: T }
  | { kind: 'ambiguous' }

export function resolvePubliclyUsedHeroRow<T extends { sort_order: number }>(
  heroRows: T[],
): HeroRowResolution<T> {
  if (heroRows.length === 0) return { kind: 'none' }
  if (heroRows.length === 1) return { kind: 'resolved', row: heroRows[0] }

  const sorted = [...heroRows].sort((a, b) => a.sort_order - b.sort_order)
  if (sorted[0].sort_order === sorted[1].sort_order) return { kind: 'ambiguous' }

  return { kind: 'resolved', row: sorted[0] }
}
