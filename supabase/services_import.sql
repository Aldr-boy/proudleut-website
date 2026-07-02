-- ============================================================
-- SERVICES-IMPORT (Airtable AI_Services_Vorschlag -> band_services)
-- 66 (band_slug, service_name) Paare, KONSERVATIV gemappt.
-- 58 Freitext-Einzelfälle bewusst NICHT importiert.
-- band_services PK = (band_id, service_id) -> on conflict do nothing.
-- IN ETAPPEN AUSFÜHREN.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPPE 0: PRECHECK (nur SELECT)
-- ------------------------------------------------------------
with import_pairs (band_slug, svc_name) as (
  values
    ('2-unplugged', 'Zusätzliches DJ-Set'),
    ('9to5', 'Zusätzliches DJ-Set'),
    ('almdoodler', 'Brautentführung'),
    ('almdoodler', 'Trauungsmusik'),
    ('aufzundn', 'Eigene Tontechnik'),
    ('bigband-steinbach', 'Moderation'),
    ('birddogs', 'Zusätzliches DJ-Set'),
    ('breznsalzer', 'Moderation'),
    ('broadway', 'Trauungsmusik'),
    ('broeslschmarrn-duo', 'Brautentführung'),
    ('campfire-band', 'Trauungsmusik'),
    ('candy-tunes', 'Lichttechnik'),
    ('candy-tunes', 'Trauungsmusik'),
    ('candy-tunes', 'Zusätzliches DJ-Set'),
    ('claudia-dechand', 'Trauungsmusik'),
    ('claudia-und-ralph', 'Trauungsmusik'),
    ('coverage-band', 'Eigene Tontechnik'),
    ('coverage-band', 'Lichttechnik'),
    ('coverage-band', 'Trauungsmusik'),
    ('de-gaudimacha', 'Eigene Tontechnik'),
    ('de-gaudimacha', 'Lichttechnik'),
    ('deep-decision', 'Trauungsmusik'),
    ('die-gseea-wepsn', 'Eigene Tontechnik'),
    ('die-gseea-wepsn', 'Lichttechnik'),
    ('die-lausbuba', 'Eigene Tontechnik'),
    ('duo-entprima', 'Eigene Tontechnik'),
    ('duo-entprima', 'Lichttechnik'),
    ('duo-entprima', 'Moderation'),
    ('edelwuid', 'Trauungsmusik'),
    ('freunde-des-brautpaares', 'Trauungsmusik'),
    ('froschhaxn-express', 'Moderation'),
    ('gruppe-saitenwind', 'Trauungsmusik'),
    ('hertz7', 'Eigene Tontechnik'),
    ('hulzstoussboum', 'Moderation'),
    ('kapelle-quetschnblech', 'Moderation'),
    ('katharina-kornprobst', 'Trauungsmusik'),
    ('lebensgfuehl-duo', 'Trauungsmusik'),
    ('lichtfaenger-music', 'Trauungsmusik'),
    ('lpc-music', 'Moderation'),
    ('max-headroom', 'Eigene Tontechnik'),
    ('mix2max', 'Moderation'),
    ('mix2max', 'Zusätzliches DJ-Set'),
    ('mixtape', 'Eigene Tontechnik'),
    ('mixtape', 'Lichttechnik'),
    ('muckasaeck', 'Eigene Tontechnik'),
    ('nice-ties-band', 'Moderation'),
    ('non-stop', 'Moderation'),
    ('otterbachtaler', 'Brautentführung'),
    ('psyco-dad', 'Eigene Tontechnik'),
    ('psyco-dad', 'Lichttechnik'),
    ('ruescherl-muse', 'Moderation'),
    ('singing-sonixx', 'Eigene Tontechnik'),
    ('singing-sonixx', 'Lichttechnik'),
    ('spectrum-band', 'Brautentführung'),
    ('spectrum-band', 'Moderation'),
    ('steffi-heim', 'Trauungsmusik'),
    ('vier-tell-four', 'Eigene Tontechnik'),
    ('vier-tell-four', 'Lichttechnik'),
    ('vier-tell-four', 'Moderation'),
    ('whoobers', 'Trauungsmusik'),
    ('woidrocker-band', 'Brautentführung'),
    ('woidrocker-band', 'Moderation'),
    ('zechpreller-trio', 'Eigene Tontechnik'),
    ('zechpreller-trio', 'Moderation'),
    ('zruck-zu-dir', 'Eigene Tontechnik'),
    ('zruck-zu-dir', 'Lichttechnik')
),
missing_bands as (
  select distinct ip.band_slug from import_pairs ip
  left join public.bands b on b.slug = ip.band_slug
  where b.id is null
),
missing_svcs as (
  select distinct ip.svc_name from import_pairs ip
  left join public.services s on s.name = ip.svc_name
  where s.id is null
)
select 'FEHLENDER BAND-SLUG' as problem, band_slug as wert from missing_bands
union all
select 'FEHLENDER SERVICE' as problem, svc_name as wert from missing_svcs
order by problem, wert;
-- Erwartung: nur 'Trauungsmusik' als FEHLENDER SERVICE. Keine fehlenden Slugs.


-- ------------------------------------------------------------
-- ETAPPE 0b: ZÄHL-PRECHECK (nur SELECT)
-- ------------------------------------------------------------
with import_pairs (band_slug, svc_name) as (
  values
    ('2-unplugged', 'Zusätzliches DJ-Set'),
    ('9to5', 'Zusätzliches DJ-Set'),
    ('almdoodler', 'Brautentführung'),
    ('almdoodler', 'Trauungsmusik'),
    ('aufzundn', 'Eigene Tontechnik'),
    ('bigband-steinbach', 'Moderation'),
    ('birddogs', 'Zusätzliches DJ-Set'),
    ('breznsalzer', 'Moderation'),
    ('broadway', 'Trauungsmusik'),
    ('broeslschmarrn-duo', 'Brautentführung'),
    ('campfire-band', 'Trauungsmusik'),
    ('candy-tunes', 'Lichttechnik'),
    ('candy-tunes', 'Trauungsmusik'),
    ('candy-tunes', 'Zusätzliches DJ-Set'),
    ('claudia-dechand', 'Trauungsmusik'),
    ('claudia-und-ralph', 'Trauungsmusik'),
    ('coverage-band', 'Eigene Tontechnik'),
    ('coverage-band', 'Lichttechnik'),
    ('coverage-band', 'Trauungsmusik'),
    ('de-gaudimacha', 'Eigene Tontechnik'),
    ('de-gaudimacha', 'Lichttechnik'),
    ('deep-decision', 'Trauungsmusik'),
    ('die-gseea-wepsn', 'Eigene Tontechnik'),
    ('die-gseea-wepsn', 'Lichttechnik'),
    ('die-lausbuba', 'Eigene Tontechnik'),
    ('duo-entprima', 'Eigene Tontechnik'),
    ('duo-entprima', 'Lichttechnik'),
    ('duo-entprima', 'Moderation'),
    ('edelwuid', 'Trauungsmusik'),
    ('freunde-des-brautpaares', 'Trauungsmusik'),
    ('froschhaxn-express', 'Moderation'),
    ('gruppe-saitenwind', 'Trauungsmusik'),
    ('hertz7', 'Eigene Tontechnik'),
    ('hulzstoussboum', 'Moderation'),
    ('kapelle-quetschnblech', 'Moderation'),
    ('katharina-kornprobst', 'Trauungsmusik'),
    ('lebensgfuehl-duo', 'Trauungsmusik'),
    ('lichtfaenger-music', 'Trauungsmusik'),
    ('lpc-music', 'Moderation'),
    ('max-headroom', 'Eigene Tontechnik'),
    ('mix2max', 'Moderation'),
    ('mix2max', 'Zusätzliches DJ-Set'),
    ('mixtape', 'Eigene Tontechnik'),
    ('mixtape', 'Lichttechnik'),
    ('muckasaeck', 'Eigene Tontechnik'),
    ('nice-ties-band', 'Moderation'),
    ('non-stop', 'Moderation'),
    ('otterbachtaler', 'Brautentführung'),
    ('psyco-dad', 'Eigene Tontechnik'),
    ('psyco-dad', 'Lichttechnik'),
    ('ruescherl-muse', 'Moderation'),
    ('singing-sonixx', 'Eigene Tontechnik'),
    ('singing-sonixx', 'Lichttechnik'),
    ('spectrum-band', 'Brautentführung'),
    ('spectrum-band', 'Moderation'),
    ('steffi-heim', 'Trauungsmusik'),
    ('vier-tell-four', 'Eigene Tontechnik'),
    ('vier-tell-four', 'Lichttechnik'),
    ('vier-tell-four', 'Moderation'),
    ('whoobers', 'Trauungsmusik'),
    ('woidrocker-band', 'Brautentführung'),
    ('woidrocker-band', 'Moderation'),
    ('zechpreller-trio', 'Eigene Tontechnik'),
    ('zechpreller-trio', 'Moderation'),
    ('zruck-zu-dir', 'Eigene Tontechnik'),
    ('zruck-zu-dir', 'Lichttechnik')
)
select
  count(*)                                        as import_pairs,
  count(distinct ip.band_slug)                    as import_bands,
  count(distinct b.id)                            as matched_bands,
  count(distinct s.id)                            as matched_services,
  count(*) filter (where b.id is null)            as missing_band_pairs,
  count(*) filter (where s.id is null)            as missing_service_pairs,
  count(*) filter (where bs.band_id is not null)  as already_existing_pairs,
  count(*) filter (
    where b.id is not null and s.id is not null and bs.band_id is null
  )                                               as pairs_to_insert
from import_pairs ip
left join public.bands b on b.slug = ip.band_slug
left join public.services s on s.name = ip.svc_name
left join public.band_services bs on bs.band_id = b.id and bs.service_id = s.id;


-- ------------------------------------------------------------
-- ETAPPE 1: Trauungsmusik anlegen (idempotent)
-- ------------------------------------------------------------
insert into public.services (id, name, slug, status, sort_order)
values ('5b000001-0000-0000-0000-000000000006','Trauungsmusik','trauungsmusik','active',6)
on conflict (id) do nothing
returning id, name, slug;
-- Erwartung: 1 row (oder 0 falls schon vorhanden)


-- ------------------------------------------------------------
-- ETAPPE 2: band_services befüllen
-- ------------------------------------------------------------
with import_pairs (band_slug, svc_name) as (
  values
    ('2-unplugged', 'Zusätzliches DJ-Set'),
    ('9to5', 'Zusätzliches DJ-Set'),
    ('almdoodler', 'Brautentführung'),
    ('almdoodler', 'Trauungsmusik'),
    ('aufzundn', 'Eigene Tontechnik'),
    ('bigband-steinbach', 'Moderation'),
    ('birddogs', 'Zusätzliches DJ-Set'),
    ('breznsalzer', 'Moderation'),
    ('broadway', 'Trauungsmusik'),
    ('broeslschmarrn-duo', 'Brautentführung'),
    ('campfire-band', 'Trauungsmusik'),
    ('candy-tunes', 'Lichttechnik'),
    ('candy-tunes', 'Trauungsmusik'),
    ('candy-tunes', 'Zusätzliches DJ-Set'),
    ('claudia-dechand', 'Trauungsmusik'),
    ('claudia-und-ralph', 'Trauungsmusik'),
    ('coverage-band', 'Eigene Tontechnik'),
    ('coverage-band', 'Lichttechnik'),
    ('coverage-band', 'Trauungsmusik'),
    ('de-gaudimacha', 'Eigene Tontechnik'),
    ('de-gaudimacha', 'Lichttechnik'),
    ('deep-decision', 'Trauungsmusik'),
    ('die-gseea-wepsn', 'Eigene Tontechnik'),
    ('die-gseea-wepsn', 'Lichttechnik'),
    ('die-lausbuba', 'Eigene Tontechnik'),
    ('duo-entprima', 'Eigene Tontechnik'),
    ('duo-entprima', 'Lichttechnik'),
    ('duo-entprima', 'Moderation'),
    ('edelwuid', 'Trauungsmusik'),
    ('freunde-des-brautpaares', 'Trauungsmusik'),
    ('froschhaxn-express', 'Moderation'),
    ('gruppe-saitenwind', 'Trauungsmusik'),
    ('hertz7', 'Eigene Tontechnik'),
    ('hulzstoussboum', 'Moderation'),
    ('kapelle-quetschnblech', 'Moderation'),
    ('katharina-kornprobst', 'Trauungsmusik'),
    ('lebensgfuehl-duo', 'Trauungsmusik'),
    ('lichtfaenger-music', 'Trauungsmusik'),
    ('lpc-music', 'Moderation'),
    ('max-headroom', 'Eigene Tontechnik'),
    ('mix2max', 'Moderation'),
    ('mix2max', 'Zusätzliches DJ-Set'),
    ('mixtape', 'Eigene Tontechnik'),
    ('mixtape', 'Lichttechnik'),
    ('muckasaeck', 'Eigene Tontechnik'),
    ('nice-ties-band', 'Moderation'),
    ('non-stop', 'Moderation'),
    ('otterbachtaler', 'Brautentführung'),
    ('psyco-dad', 'Eigene Tontechnik'),
    ('psyco-dad', 'Lichttechnik'),
    ('ruescherl-muse', 'Moderation'),
    ('singing-sonixx', 'Eigene Tontechnik'),
    ('singing-sonixx', 'Lichttechnik'),
    ('spectrum-band', 'Brautentführung'),
    ('spectrum-band', 'Moderation'),
    ('steffi-heim', 'Trauungsmusik'),
    ('vier-tell-four', 'Eigene Tontechnik'),
    ('vier-tell-four', 'Lichttechnik'),
    ('vier-tell-four', 'Moderation'),
    ('whoobers', 'Trauungsmusik'),
    ('woidrocker-band', 'Brautentführung'),
    ('woidrocker-band', 'Moderation'),
    ('zechpreller-trio', 'Eigene Tontechnik'),
    ('zechpreller-trio', 'Moderation'),
    ('zruck-zu-dir', 'Eigene Tontechnik'),
    ('zruck-zu-dir', 'Lichttechnik')
)
insert into public.band_services (band_id, service_id)
select b.id, s.id
from import_pairs ip
join public.bands b on b.slug = ip.band_slug
join public.services s on s.name = ip.svc_name
on conflict (band_id, service_id) do nothing
returning band_id, service_id;
-- Erwartung: bis zu 66 rows (weniger, falls schon vorhanden)


-- ------------------------------------------------------------
-- ETAPPE 3: KONTROLLE
-- ------------------------------------------------------------
select s.name as service, count(bs.band_id) as anzahl_bands
from public.services s
left join public.band_services bs on bs.service_id = s.id
group by s.name
order by anzahl_bands desc, s.name;


-- ------------------------------------------------------------
-- ROLLBACK (nur im Notfall) - VALUES-Liste erneut einsetzen
-- ------------------------------------------------------------
-- with import_pairs (band_slug, svc_name) as ( values ... )
-- delete from public.band_services bs
-- using import_pairs ip
-- join public.bands b on b.slug = ip.band_slug
-- join public.services s on s.name = ip.svc_name
-- where bs.band_id = b.id and bs.service_id = s.id;
-- Trauungsmusik-Service separat löschen, falls gewünscht (nur wenn keine Zuordnung mehr).
