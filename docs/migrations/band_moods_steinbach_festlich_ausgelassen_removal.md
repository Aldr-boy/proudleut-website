# Bigband STEINBACH – Entfernung "Festlich und ausgelassen" – Ausführungsprotokoll

Status: Production-Migration erfolgreich ausgeführt.

## Ausführung

- Ausgeführt von Xandi gegen Supabase Production
- Rolle: `postgres` (Supabase SQL Editor)
- Datum: 19.07.2026
- Uhrzeit: nicht übermittelt
- Geprüfter Commit (Codex-Review, `REVIEWED_SQL_HEAD`):
  `8e244f390d8311015f2204a29ddce0c65c336dc3`
- Bezug des ausgeführten Inhalts:
  ```bash
  git show 8e244f390d8311015f2204a29ddce0c65c336dc3:supabase/band_moods_steinbach_festlich_ausgelassen_removal.sql
  ```

## Ergebnis

```
Success. No rows returned
```

Migration erfolgreich: die Zuordnung "Festlich und ausgelassen"
(`festlich-ausgelassen`, `sort_order = 0`) wurde entfernt.

Verify (`supabase/band_moods_steinbach_festlich_ausgelassen_removal_verify.sql`
sowie zusätzlich als Teilprüfung in
`supabase/band_moods_klingt_nach_final_verify.sql`): `match = true`.

Erhaltene, unveränderte Zuordnungen (alle `sort_order = 0`):

- `brass-power=0`
- `konzertant-hochwertig=0`
- `tanzflaechen-garantie=0`

Brass-Power bleibt unangetastet und ist ausschließlich für Paket D
geparkt.

## Verweis

Diese Migration wurde als zweiter Schritt derselben Production-Sitzung
gemeinsam mit dem Import der Kurationsrunden 3 und 4 ausgeführt. Der
vollständige, gemeinsame Ausführungsnachweis steht unter:
`docs/migrations/band_moods_klingt_nach_final_rollout.md`.
