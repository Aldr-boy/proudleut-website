-- ============================================================
-- supabase/add-media-assets-thumbnail-unique-index.sql
-- Partieller Unique-Index -- hoechstens eine thumbnail-Zeile pro Band
--
-- Vor dem zugehoerigen App-Deployment manuell gegen Production
-- auszufuehren. Der Ausfuehrungsnachweis wird im PR dokumentiert.
-- Versioniert vorbereitet fuer den zweiten Codex-Korrekturblock zu
-- PR #16 ("Singulaere Hero-/Thumbnail-Zeilen strukturell absichern").
--
-- Ausfuehrung erfolgt manuell durch Xandi im Supabase SQL Editor (wie
-- alle vorherigen Migrations-Dateien in diesem Repo -- der Agent hat
-- keinen eigenen Ausfuehrungskanal fuer Production).
--
-- 1. Codex-Fund (PR #16, zweiter Durchgang, P2):
--   Existiert fuer eine Band noch keine hero- bzw. thumbnail-Zeile,
--   koennen zwei parallele Erstuploads (updateBandHeroImageAction /
--   updateBandThumbnailAction, app/admin/bands/[id]/actions.ts) beide
--   "keine Zeile vorhanden" lesen (resolvePubliclyUsedMediaRow liefert
--   kind='none' fuer beide) und anschliessend beide eine neue Zeile
--   per INSERT anlegen. Ergebnis: zwei Zeilen mit gleicher (band_id,
--   role) -- der Editor erkennt den Zustand danach als mehrdeutig
--   (resolvePubliclyUsedMediaRow liefert kind='ambiguous', fail-closed).
--
-- 2. Production-Preflight (read-only, 29.07.2026):
--   select band_id, role, count(*) as row_count,
--          array_agg(id order by sort_order asc, created_at asc, id asc)
--     from public.media_assets
--    where role in ('hero', 'thumbnail')
--    group by band_id, role
--   having count(*) > 1;
--   Ergebnis: 0 Zeilen -- 284 (band_id, role)-Gruppen insgesamt (hero +
--   thumbnail zusammen), ALLE mit row_count = 1. Keine bestehenden
--   Duplikate.
--
--   Zusaetzlich empirisch bestaetigt (isolierte, nie oeffentlich
--   sichtbare Test-Band, anschliessend vollstaendig bereinigt): fuer
--   role='hero' existiert BEREITS ein Schutz. Ein zweiter hero-Insert
--   derselben Band scheitert mit dem Standard-Postgres-Fehlercode 23505
--   gegen den bestehenden Index idx_media_assets_one_hero_per_band. Fuer
--   role='thumbnail' hatte KEIN entsprechender Schutz existiert: zwei
--   thumbnail-Inserts derselben Band waren zuvor beide erfolgreich --
--   genau die Luecke, die dieser Index schliesst.
--
-- 3. Entscheidung:
--   Der bestehende Index idx_media_assets_one_hero_per_band wird bewusst
--   unveraendert erhalten -- kein DROP, keine Konsolidierung mit diesem
--   neuen Index. Diese Datei ergaenzt ausschliesslich den bisher
--   fehlenden Schutz fuer role='thumbnail'.
--
-- Wirkung:
--   - hoechstens eine thumbnail-Zeile pro Band moeglich.
--   - Der bestehende Hero-Schutz (idx_media_assets_one_hero_per_band)
--     bleibt unabhaengig davon unveraendert bestehen -- eine Band darf
--     weiterhin gleichzeitig genau eine hero- UND eine thumbnail-Zeile
--     haben.
--   - gallery- und logo-Zeilen sind durch die WHERE-Klausel vollstaendig
--     ausgenommen -- unveraendertes Verhalten, weiterhin beliebig viele
--     gallery- bzw. logo-Zeilen pro Band moeglich.
--   - Zwei parallele thumbnail-INSERTs derselben Band: der zweite,
--     zeitlich unterlegene INSERT scheitert am Index mit 23505 -- kein
--     Anwendungscode noetig, die Datenbank selbst verhindert das zweite
--     Duplikat. Der bereits bestehende Cleanup-Zweig in
--     updateBandThumbnailAction (app/admin/bands/[id]/actions.ts) faengt
--     jeden dbError bereits generisch ab und entfernt das zuvor
--     hochgeladene, dann nicht referenzierte Storage-Objekt -- keine
--     Codeanpassung noetig, siehe Verifikation im PR.
--
-- Keine Datenmigration, kein Datenwrite, kein Aufraeumen bestehender
-- Zeilen, kein DROP INDEX -- ausschliesslich das Anlegen dieses einen
-- neuen Index.
-- ============================================================

begin;

create unique index idx_media_assets_one_thumbnail_per_band
  on public.media_assets (band_id)
  where role = 'thumbnail';

commit;
