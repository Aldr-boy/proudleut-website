-- ============================================================
-- LINEUPS-IMPORT (Airtable AI_Formate_Vorschlag -> band_lineups)
-- 80 (band_slug, lineup_name) Paare. KONSERVATIV:
-- nur klare Besetzungsgröße (Hauptwert), Zusätze ignoriert.
-- Klasse 3 (Bigband/Full Band 7+/variable) + Klasse 4 (Angebotsformate)
-- + Klasse 5 (unklar) bewusst NICHT enthalten.
-- Alle 6 lineups existieren bereits -> keine Katalog-Neuanlage.
-- band_lineups PK = (band_id, lineup_id) -> on conflict do nothing.
-- IN ETAPPEN AUSFÜHREN.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPPE 0: PRECHECK (nur SELECT)
-- ------------------------------------------------------------
with import_pairs (band_slug, lu_name) as (
  values
    ('2-unplugged', 'Duo'),
    ('2-unplugged', 'Trio'),
    ('9to5', 'Duo'),
    ('9to5', 'Quartett'),
    ('9to5', 'Quintett'),
    ('9to5', 'Sextett'),
    ('9to5', 'Trio'),
    ('birddogs', 'Duo'),
    ('birddogs', 'Quartett'),
    ('broeslschmarrn-duo', 'Duo'),
    ('campfire-band', 'Duo'),
    ('campfire-band', 'Quartett'),
    ('candy-tunes', 'Duo'),
    ('candy-tunes', 'Quartett'),
    ('candy-tunes', 'Trio'),
    ('claudia-dechand', 'Duo'),
    ('claudia-und-ralph', 'Duo'),
    ('coverage-band', 'Duo'),
    ('coverage-band', 'Trio'),
    ('czech-aut', 'Duo'),
    ('czech-aut', 'Trio'),
    ('die-gseea-wepsn', 'Quartett'),
    ('die-lausbuba', 'Duo'),
    ('die-lausbuba', 'Quartett'),
    ('die-lausbuba', 'Trio'),
    ('donikkl-crew', 'Duo'),
    ('duanix-musi', 'Quartett'),
    ('duanix-musi', 'Sextett'),
    ('duo-entprima', 'Duo'),
    ('edelwuid', 'Duo'),
    ('edelwuid', 'Quartett'),
    ('edelwuid', 'Trio'),
    ('foxy-gentlemen', 'Quartett'),
    ('gary-rhos', 'Solo'),
    ('gaudinockerl', 'Quartett'),
    ('gaudinockerl', 'Quintett'),
    ('geraldino', 'Solo'),
    ('glory-times', 'Duo'),
    ('glory-times', 'Trio'),
    ('gruppe-saitenwind', 'Trio'),
    ('harmonic-brass', 'Quintett'),
    ('heimatgfuehl-duo', 'Duo'),
    ('hochzeitssangerin-mit-herz', 'Duo'),
    ('hochzeitssangerin-mit-herz', 'Solo'),
    ('hot-sugar', 'Duo'),
    ('hulzstoussboum', 'Quintett'),
    ('lichtfaenger-music', 'Duo'),
    ('lichtfaenger-music', 'Quartett'),
    ('lichtfaenger-music', 'Quintett'),
    ('lichtfaenger-music', 'Trio'),
    ('may-vibes', 'Duo'),
    ('may-vibes', 'Quartett'),
    ('may-vibes', 'Quintett'),
    ('may-vibes', 'Solo'),
    ('may-vibes', 'Trio'),
    ('mix2max', 'Duo'),
    ('more-candy', 'Duo'),
    ('non-stop', 'Quartett'),
    ('otterbachtaler', 'Sextett'),
    ('out-of-bayern', 'Trio'),
    ('partybox-trio', 'Duo'),
    ('partybox-trio', 'Trio'),
    ('psyco-dad', 'Quartett'),
    ('singing-sonixx', 'Duo'),
    ('smooth-n-groove', 'Quartett'),
    ('sommerwind-band', 'Duo'),
    ('spectrum-band', 'Duo'),
    ('spectrum-band', 'Trio'),
    ('tegernseer-tanzlmusi', 'Duo'),
    ('tegernseer-tanzlmusi', 'Trio'),
    ('the-silverhammers', 'Quartett'),
    ('the-stereo-show', 'Duo'),
    ('urner-musi', 'Quartett'),
    ('waidler-power', 'Quartett'),
    ('whoobers', 'Quartett'),
    ('wiesnkoenige', 'Duo'),
    ('wiesnkoenige', 'Quartett'),
    ('wiesnkoenige', 'Quintett'),
    ('wiesnkoenige', 'Trio'),
    ('zechpreller-trio', 'Trio')
),
missing_bands as (
  select distinct ip.band_slug from import_pairs ip
  left join public.bands b on b.slug = ip.band_slug
  where b.id is null
),
missing_lu as (
  select distinct ip.lu_name from import_pairs ip
  left join public.lineups l on l.name = ip.lu_name
  where l.id is null
)
select 'FEHLENDER BAND-SLUG' as problem, band_slug as wert from missing_bands
union all
select 'FEHLENDER LINEUP' as problem, lu_name as wert from missing_lu
order by problem, wert;
-- Erwartung: KEINE Zeilen (alle Bands + alle 6 lineups existieren).


-- ------------------------------------------------------------
-- ETAPPE 0b: ZÄHL-PRECHECK (nur SELECT)
-- ------------------------------------------------------------
with import_pairs (band_slug, lu_name) as (
  values
    ('2-unplugged', 'Duo'),
    ('2-unplugged', 'Trio'),
    ('9to5', 'Duo'),
    ('9to5', 'Quartett'),
    ('9to5', 'Quintett'),
    ('9to5', 'Sextett'),
    ('9to5', 'Trio'),
    ('birddogs', 'Duo'),
    ('birddogs', 'Quartett'),
    ('broeslschmarrn-duo', 'Duo'),
    ('campfire-band', 'Duo'),
    ('campfire-band', 'Quartett'),
    ('candy-tunes', 'Duo'),
    ('candy-tunes', 'Quartett'),
    ('candy-tunes', 'Trio'),
    ('claudia-dechand', 'Duo'),
    ('claudia-und-ralph', 'Duo'),
    ('coverage-band', 'Duo'),
    ('coverage-band', 'Trio'),
    ('czech-aut', 'Duo'),
    ('czech-aut', 'Trio'),
    ('die-gseea-wepsn', 'Quartett'),
    ('die-lausbuba', 'Duo'),
    ('die-lausbuba', 'Quartett'),
    ('die-lausbuba', 'Trio'),
    ('donikkl-crew', 'Duo'),
    ('duanix-musi', 'Quartett'),
    ('duanix-musi', 'Sextett'),
    ('duo-entprima', 'Duo'),
    ('edelwuid', 'Duo'),
    ('edelwuid', 'Quartett'),
    ('edelwuid', 'Trio'),
    ('foxy-gentlemen', 'Quartett'),
    ('gary-rhos', 'Solo'),
    ('gaudinockerl', 'Quartett'),
    ('gaudinockerl', 'Quintett'),
    ('geraldino', 'Solo'),
    ('glory-times', 'Duo'),
    ('glory-times', 'Trio'),
    ('gruppe-saitenwind', 'Trio'),
    ('harmonic-brass', 'Quintett'),
    ('heimatgfuehl-duo', 'Duo'),
    ('hochzeitssangerin-mit-herz', 'Duo'),
    ('hochzeitssangerin-mit-herz', 'Solo'),
    ('hot-sugar', 'Duo'),
    ('hulzstoussboum', 'Quintett'),
    ('lichtfaenger-music', 'Duo'),
    ('lichtfaenger-music', 'Quartett'),
    ('lichtfaenger-music', 'Quintett'),
    ('lichtfaenger-music', 'Trio'),
    ('may-vibes', 'Duo'),
    ('may-vibes', 'Quartett'),
    ('may-vibes', 'Quintett'),
    ('may-vibes', 'Solo'),
    ('may-vibes', 'Trio'),
    ('mix2max', 'Duo'),
    ('more-candy', 'Duo'),
    ('non-stop', 'Quartett'),
    ('otterbachtaler', 'Sextett'),
    ('out-of-bayern', 'Trio'),
    ('partybox-trio', 'Duo'),
    ('partybox-trio', 'Trio'),
    ('psyco-dad', 'Quartett'),
    ('singing-sonixx', 'Duo'),
    ('smooth-n-groove', 'Quartett'),
    ('sommerwind-band', 'Duo'),
    ('spectrum-band', 'Duo'),
    ('spectrum-band', 'Trio'),
    ('tegernseer-tanzlmusi', 'Duo'),
    ('tegernseer-tanzlmusi', 'Trio'),
    ('the-silverhammers', 'Quartett'),
    ('the-stereo-show', 'Duo'),
    ('urner-musi', 'Quartett'),
    ('waidler-power', 'Quartett'),
    ('whoobers', 'Quartett'),
    ('wiesnkoenige', 'Duo'),
    ('wiesnkoenige', 'Quartett'),
    ('wiesnkoenige', 'Quintett'),
    ('wiesnkoenige', 'Trio'),
    ('zechpreller-trio', 'Trio')
)
select
  count(*)                                        as import_pairs,
  count(distinct ip.band_slug)                    as import_bands,
  count(distinct b.id)                            as matched_bands,
  count(distinct l.id)                            as matched_lineups,
  count(*) filter (where b.id is null)            as missing_band_pairs,
  count(*) filter (where l.id is null)            as missing_lineup_pairs,
  count(*) filter (where bl.band_id is not null)  as already_existing_pairs,
  count(*) filter (
    where b.id is not null and l.id is not null and bl.band_id is null
  )                                               as pairs_to_insert
from import_pairs ip
left join public.bands b on b.slug = ip.band_slug
left join public.lineups l on l.name = ip.lu_name
left join public.band_lineups bl on bl.band_id = b.id and bl.lineup_id = l.id;
-- Erwartung: import_pairs=80, matched_bands=48,
--            matched_lineups=6, missing_*_pairs=0.


-- ------------------------------------------------------------
-- ETAPPE 1: band_lineups befüllen
-- ------------------------------------------------------------
with import_pairs (band_slug, lu_name) as (
  values
    ('2-unplugged', 'Duo'),
    ('2-unplugged', 'Trio'),
    ('9to5', 'Duo'),
    ('9to5', 'Quartett'),
    ('9to5', 'Quintett'),
    ('9to5', 'Sextett'),
    ('9to5', 'Trio'),
    ('birddogs', 'Duo'),
    ('birddogs', 'Quartett'),
    ('broeslschmarrn-duo', 'Duo'),
    ('campfire-band', 'Duo'),
    ('campfire-band', 'Quartett'),
    ('candy-tunes', 'Duo'),
    ('candy-tunes', 'Quartett'),
    ('candy-tunes', 'Trio'),
    ('claudia-dechand', 'Duo'),
    ('claudia-und-ralph', 'Duo'),
    ('coverage-band', 'Duo'),
    ('coverage-band', 'Trio'),
    ('czech-aut', 'Duo'),
    ('czech-aut', 'Trio'),
    ('die-gseea-wepsn', 'Quartett'),
    ('die-lausbuba', 'Duo'),
    ('die-lausbuba', 'Quartett'),
    ('die-lausbuba', 'Trio'),
    ('donikkl-crew', 'Duo'),
    ('duanix-musi', 'Quartett'),
    ('duanix-musi', 'Sextett'),
    ('duo-entprima', 'Duo'),
    ('edelwuid', 'Duo'),
    ('edelwuid', 'Quartett'),
    ('edelwuid', 'Trio'),
    ('foxy-gentlemen', 'Quartett'),
    ('gary-rhos', 'Solo'),
    ('gaudinockerl', 'Quartett'),
    ('gaudinockerl', 'Quintett'),
    ('geraldino', 'Solo'),
    ('glory-times', 'Duo'),
    ('glory-times', 'Trio'),
    ('gruppe-saitenwind', 'Trio'),
    ('harmonic-brass', 'Quintett'),
    ('heimatgfuehl-duo', 'Duo'),
    ('hochzeitssangerin-mit-herz', 'Duo'),
    ('hochzeitssangerin-mit-herz', 'Solo'),
    ('hot-sugar', 'Duo'),
    ('hulzstoussboum', 'Quintett'),
    ('lichtfaenger-music', 'Duo'),
    ('lichtfaenger-music', 'Quartett'),
    ('lichtfaenger-music', 'Quintett'),
    ('lichtfaenger-music', 'Trio'),
    ('may-vibes', 'Duo'),
    ('may-vibes', 'Quartett'),
    ('may-vibes', 'Quintett'),
    ('may-vibes', 'Solo'),
    ('may-vibes', 'Trio'),
    ('mix2max', 'Duo'),
    ('more-candy', 'Duo'),
    ('non-stop', 'Quartett'),
    ('otterbachtaler', 'Sextett'),
    ('out-of-bayern', 'Trio'),
    ('partybox-trio', 'Duo'),
    ('partybox-trio', 'Trio'),
    ('psyco-dad', 'Quartett'),
    ('singing-sonixx', 'Duo'),
    ('smooth-n-groove', 'Quartett'),
    ('sommerwind-band', 'Duo'),
    ('spectrum-band', 'Duo'),
    ('spectrum-band', 'Trio'),
    ('tegernseer-tanzlmusi', 'Duo'),
    ('tegernseer-tanzlmusi', 'Trio'),
    ('the-silverhammers', 'Quartett'),
    ('the-stereo-show', 'Duo'),
    ('urner-musi', 'Quartett'),
    ('waidler-power', 'Quartett'),
    ('whoobers', 'Quartett'),
    ('wiesnkoenige', 'Duo'),
    ('wiesnkoenige', 'Quartett'),
    ('wiesnkoenige', 'Quintett'),
    ('wiesnkoenige', 'Trio'),
    ('zechpreller-trio', 'Trio')
)
insert into public.band_lineups (band_id, lineup_id, sort_order)
select b.id, l.id, 0
from import_pairs ip
join public.bands b on b.slug = ip.band_slug
join public.lineups l on l.name = ip.lu_name
on conflict (band_id, lineup_id) do nothing
returning band_id, lineup_id;
-- Erwartung: bis zu 80 rows (weniger, falls schon vorhanden).


-- ------------------------------------------------------------
-- ETAPPE 2: KONTROLLE
-- ------------------------------------------------------------
select l.name as lineup, count(bl.band_id) as anzahl_bands
from public.lineups l
left join public.band_lineups bl on bl.lineup_id = l.id
group by l.name
order by anzahl_bands desc, l.name;


-- ------------------------------------------------------------
-- ROLLBACK (nur im Notfall) - VALUES-Liste erneut einsetzen
-- ------------------------------------------------------------
-- with import_pairs (band_slug, lu_name) as ( values ... )
-- delete from public.band_lineups bl
-- using import_pairs ip
-- join public.bands b on b.slug = ip.band_slug
-- join public.lineups l on l.name = ip.lu_name
-- where bl.band_id = b.id and bl.lineup_id = l.id;
