-- ============================================================
-- media_assets_hero_wall_columns.sql
--
-- Paket 1 ("Hero-Bildwand: Migration + Admin-Bereich"), Schritt 1A/1B.
-- Dokumentiert nachtraeglich die Migration, die bereits gegen TEST
-- (jqzqpizykymjdjumwdoj) und Production (bfyucjjyarvqeftqqihm) manuell
-- ausgefuehrt und vollstaendig read-only vor-/nach-verifiziert wurde
-- (Preflight: Tabellenschema, Zielspalten-Zustand 0/3, Zeilenzahl,
-- role-Verteilung, jeweils vor UND nach der Migration gegenuebergestellt).
-- Diese Datei existiert fuer Nachvollziehbarkeit/Repo-Konsistenz mit den
-- uebrigen fn_*.sql-Migrationsdateien -- sie muss NICHT erneut ausgefuehrt
-- werden (beide Umgebungen haben den Zielzustand bereits erreicht).
--
-- Referenz: docs/spezifikation-hero-bildwand.md, Abschnitt 6 und 7.
--
-- Bedeutung der drei Spalten:
--   hero_wall           -- true: Bild gehoert zum kuratierten globalen
--                           Pool der Homepage-Hero-Bildwand.
--   hero_wall_position   -- redaktionelle Reihenfolge innerhalb dieses
--                           Pools, 0-basiert, durch die Admin-Logik
--                           (siehe fn_update_hero_wall_selection.sql)
--                           lueckenlos gepflegt.
--   hero_focus           -- bevorzugte vertikale Ausrichtung beim
--                           5:6-Crop ('top' | 'center' | 'bottom').
--                           NULL bedeutet fachlich ebenfalls 'center'.
--
-- Regeln bei Erstlauf (eingehalten, per Preflight verifiziert):
--   - kein Backfill fuer hero_focus,
--   - kein Unique-Constraint auf hero_wall_position,
--   - kein automatisches Setzen von hero_wall = true,
--   - keine bestehenden media_assets inhaltlich veraendert,
--   - keine bestehende role veraendert,
--   - kein Index vorsorglich angelegt.
-- ============================================================

alter table public.media_assets
  add column hero_wall boolean not null default false,
  add column hero_wall_position integer,
  add column hero_focus text
    check (
      hero_focus is null
      or hero_focus in ('top', 'center', 'bottom')
    );
