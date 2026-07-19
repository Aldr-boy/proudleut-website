// public.archive_mood (siehe supabase/fn_moods_catalog_admin.sql) liefert
// die Anzahl bestehender band_moods-Zuordnungen im DETAIL des raise
// exception:
//   format('mood_id=%s has %s existing band_moods row(s)', p_mood_id, v_usage_count)
// PostgREST reicht das als error.details durch. Diese Funktion extrahiert
// die Zahl daraus, ausschliesslich fuer eine praezisere Fehlermeldung im
// Admin -- keine sicherheitsrelevante Pruefung (die laeuft ausschliesslich
// in der RPC selbst).
export function extractUsageCountFromDetail(details: string | null | undefined): string | null {
  if (!details) return null
  const m = details.match(/has (\d+) existing/)
  return m ? m[1] : null
}
