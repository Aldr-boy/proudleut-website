# Klingt nach – Finaler Production-Rollout – Ausführungsprotokoll

Status: Production-Rollout erfolgreich ausgeführt.

## Ziel und Scope

Gemeinsamer, finaler Abschluss des "Klingt nach"-Production-Rollouts:
Import der 59 fachlich entschiedenen Bands aus Kurationsrunde 3 (20
Bands) und Kurationsrunde 4 (39 Bands), gefolgt von der Entfernung der
Zuordnung "Festlich und ausgelassen" bei Bigband STEINBACH, gefolgt
von einer vollständigen Read-only-Gesamtverifikation. Keine neuen
Moods, keine Änderung an anderen Bändern, keine Änderung am
Mood-Katalog, kein Eingriff in Paket D oder in Brass-Power.

## Ausführung

- Ausgeführt von Xandi gegen Supabase Production
- Rolle: `postgres` (Supabase SQL Editor)
- Datum: 19.07.2026
- Uhrzeit: nicht übermittelt
- Geprüfter Commit (Codex-Review, `REVIEWED_SQL_HEAD`):
  `8e244f390d8311015f2204a29ddce0c65c336dc3`
- Bezug des ausgeführten Inhalts:
  ```bash
  git show 8e244f390d8311015f2204a29ddce0c65c336dc3:supabase/band_moods_klingt_nach_rounds_3_4_import.sql
  git show 8e244f390d8311015f2204a29ddce0c65c336dc3:supabase/band_moods_steinbach_festlich_ausgelassen_removal.sql
  git show 8e244f390d8311015f2204a29ddce0c65c336dc3:supabase/band_moods_klingt_nach_final_verify.sql
  ```

## Verbindliche Reihenfolge und Ergebnisse

### Schritt 1 — Import Runde 3 und Runde 4

Datei: `supabase/band_moods_klingt_nach_rounds_3_4_import.sql`

```
Success. No rows returned
```

Alle neun Guards sowie die fünf Postchecks erfolgreich durchlaufen
(exakte Soll-Zeilen-Zahl, Band-/Mood-Distinktheit, keine Duplikate,
1-basierte lückenlose `sort_order`-Folgen, Rollout-Kohorte, aktiver
Mood-Katalog, kein Vorkonflikt, Schutz der 158 bestehenden Zeilen
außerhalb der Ziel-Bänder, exakte Insert-Anzahl, exakter Zielzustand,
keine zusätzlichen Zeilen, Zunahme um exakt 59 Bänder, bestehende
Fremdzeilen unverändert). Ergebnis: **59 Bänder, 114 neue
`band_moods`-Zuordnungen** (20 Bänder / 37 Zuordnungen aus Runde 3,
39 Bänder / 77 Zuordnungen aus Runde 4), 1-basierte
`sort_order`-Konvention.

### Schritt 2 — STEINBACH-Entfernung

Datei: `supabase/band_moods_steinbach_festlich_ausgelassen_removal.sql`

```
Success. No rows returned
```

Guard 1 (eindeutige aktive Band), Guard 2 (exakter Ausgangszustand,
vier Zeilen bei `sort_order = 0`), Rowcount-Check (`v_deleted <> 1`)
und Postcheck (exakter Zielzustand) erfolgreich. Ergebnis: die
Zuordnung "Festlich und ausgelassen" bei Bigband STEINBACH wurde
entfernt. Tanzflächen-Garantie, Konzertant & hochwertig und
Brass-Power blieben unverändert bei `sort_order = 0` bestehen.

### Schritt 3 — Final Verify

Datei: `supabase/band_moods_klingt_nach_final_verify.sql`

Ergebnis: **alle Prüfzeilen `match = true`**.

- Alle 59 Runde-3/4-Bänder: exakte `(mood_slug=sort_order)`-Paare
  bestätigt, keine fehlende, zusätzliche oder falsch sortierte
  Zuordnung.
- Bigband STEINBACH: verbleibende Zuordnungen exakt
  `brass-power=0`, `konzertant-hochwertig=0`,
  `tanzflaechen-garantie=0`; `festlich-ausgelassen` bestätigt mit 0
  Zeilen entfernt.
- Alle sechs bewussten Empty States (Blechhilfswerk, Duanix Musi,
  Hochdruck Böhmische, Rüscherl Muse, Silk and Sound,
  Smooth'n'Groove) gefunden, aktiv, mit exakt 0 `band_moods`-Zeilen.
- Globaler Abschlusszustand: **141 aktive Bänder**, davon **135 mit
  mindestens einer Mood-Zuordnung** und **6 ohne Zuordnung** — die
  Menge dieser 6 entspricht exakt den sechs dokumentierten Empty
  States, keine weitere aktive Band ist ohne Zuordnung.
- Finale Summary-Zeile: `alle Teilpruefungen match = true`.

## Ausführbarer SQL-Teil nach Production unverändert

Nach der Production-Ausführung wurde `git diff` der vier ausführbaren
SQL-Dateien gegen den geprüften Commit `8e244f390d8311015f2204a29ddce0c65c336dc3`
ausgeführt — der Diff ist leer. Keine ausführbare SQL-Zeile wurde nach
der Production-Ausführung verändert.

## Ergebnis

Damit ist der finale "Klingt nach"-Production-Rollout vollständig und
wie spezifiziert production-verifiziert abgeschlossen:

- **141 von 141** aktiven Bändern fachlich entschieden
- **135** Bänder mit mindestens einer Mood-Zuordnung in Production
- **6** bewusste, dokumentierte Empty States

Siehe auch den gesonderten STEINBACH-Nachweis:
`docs/migrations/band_moods_steinbach_festlich_ausgelassen_removal.md`.
