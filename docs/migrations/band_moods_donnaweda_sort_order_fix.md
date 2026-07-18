# Donnaweda Mood-Sortierung – Ausführungsprotokoll

Status: Production-Migration erfolgreich ausgeführt.

## Ausführung

- Ausgeführt von Xandi gegen Supabase Production
- Rolle: `postgres` (Supabase SQL Editor)
- Bezugs-Commit: `f07188712e1d00e1b2f0f0afe697ddd011a53c4f`
- SQL-Blob: `d9b8ae7a4a57291ca84e69a49b701be6a45e9dca`
- Bezug des ausgeführten Inhalts:
  ```bash
  git show f07188712e1d00e1b2f0f0afe697ddd011a53c4f:supabase/band_moods_donnaweda_sort_order_fix.sql
  ```

## Ergebnis

```
Success. No rows returned
```

Guards, Rowcount-Prüfung (`v_updated <> 3`), interner Zielzustands-Postcheck
und `COMMIT` sind damit erfolgreich abgeschlossen. Der im Skript enthaltene
exakte Postcheck (`v_post_state` gegen `array['bayerisch-frech=2', 'festzeltenergie=1', 'mitsing-faktor=3']`)
war erfolgreich — ein Fehlschlag hätte eine `RAISE EXCEPTION` und damit ein
sichtbares Fehlerergebnis statt `Success. No rows returned` erzeugt.

## Vorher/Nachher

- Vorheriger Negativtest (vor dieser Migration, gegen den damaligen
  Ist-Zustand) belegte `sort_order` bei allen drei Donnaweda-Mood-
  Zuordnungen auf `0/0/0` (siehe Analysebericht Paket C).
- Zielzustand nach dieser Migration: `festzeltenergie=1`,
  `bayerisch-frech=2`, `mitsing-faktor=3`.

## Öffentliche Darstellung

Die öffentliche Darstellung auf `/band/donnaweda` war bereits vor dieser
Migration in Zielreihenfolge (Fallback über `moods.sort_order`, siehe
Analysebericht Paket C, Abschnitt „Kaskaden-Analyse"). Visuell wurde
daher durch diese Migration keine Änderung erwartet — der Erfolgsbeweis
ist ausschließlich der DB-Postcheck, nicht der Browser-Smoke.
