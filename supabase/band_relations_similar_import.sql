-- ============================================================
-- LINEUPS/SERVICES-STYLE IMPORT: Similar Bands (Airtable -> band_relations)
--
-- AUSGEFUEHRT: Production / Supabase SQL Editor
-- ERGEBNIS: 349 Inserts
-- ABSCHLUSSKONTROLLE: total_similar_relations = 352, Donnaweda-Stichprobe = 3
--   (reason-Texte unveraendert erhalten), Psyco-Dad-Stichprobe = 0,
--   Hatphones als Target = 4
-- NICHT ERNEUT AUSFUEHREN ohne bewusste Entscheidung -- dieses Script bleibt
-- nur als versioniertes Importmuster im Repo (analog services_import.sql /
-- lineups_import.sql), nicht zur Wiederholung gedacht.
--
-- Zweck:
--   Import kuratierter "aehnliche Bands"-Empfehlungen aus Airtable
--   (Felder similar_1_name / similar_2_name / similar_3_name) nach
--   public.band_relations, relation_type = 'similar'.
--
-- Quelle: Airtable-Dry-Run vom 09.07.2026, bereinigt (Node-Script gegen
--   Airtable-API + Supabase anon-Key, read-only, siehe Preflight-Bericht
--   "Similar Bands: Airtable-Import + Logik-Fix").
--
-- Sollzahlen (hart in Etappe 0b und Etappe 2 verwendet):
--   364 rohe Airtable-Similar-Eintraege
--   -   4 Selbstreferenzen                (uebersprungen)
--   -   7 verwaiste Ziele                 (uebersprungen, s.u.)
--   = 353 aufloesbare Nicht-Self-Paare
--   -   1 Dublette                        (dedupliziert auf niedrigsten Rank)
--   = 352 bereinigte Soll-Paare in der VALUES-Liste unten
--
--   Davon bereits vorhanden: 3 Donnaweda-Pilotzeilen (relation_type=similar,
--   is_manual=true, confidence_score=null, mit handisch gepflegten reason-Texten).
--   Diese bleiben unberuehrt -- ON CONFLICT DO NOTHING greift, reason-Texte
--   werden NICHT ueberschrieben, da die Importzeilen reason/confidence_score
--   bewusst NULL setzen und der Insert bestehende Zeilen nie anfasst.
--
--   Erwartung beim Ausfuehren:
--     already_existing_pairs = 3
--     pairs_to_insert        = 349
--     relation_type=similar danach GESAMT = 352
--
-- Bekannte Ausschluesse (Datenqualitaet Airtable similar_1/2/3_name):
--
--   Selbstreferenzen -- uebersprungen (4):
--     SaKrisch -> SaKrisch (rank 2)
--     Claudia und Ralf -> Claudia und Ralf (rank 3)
--     KIZZRock -> KIZZRock (rank 2)
--     Duanix Musi -> Duanix Musi (rank 2)
--
--   Verwaiste Ziele -- uebersprungen (7), existieren nicht (mehr) in Supabase:
--     Brugger Buam (4x referenziert)
--     Stockerholzer Buam (3x referenziert)
--
--   Dublette -- dedupliziert (1):
--     Lebensgfuehl (Airtable: Lebensg with apostrophe fuehl) listet Saitenwind
--     doppelt (similar_1_name UND similar_2_name, beide -> gruppe-saitenwind).
--     Nur der niedrigste Rank (1) wurde behalten, die Rank-2-Dublette verworfen.
--     similar_3_name (Sabrina Robold) ist unabhaengig davon korrekt.
--
--   Hatphones-Testfall -- sauber, KEIN Fix noetig:
--     Airtable enthaelt bereits korrekt Hatphones (nicht Halphones).
--     4 Referenzen (Die Ottis/otterbachtaler, Onesee, Cherry Pink, Non Stop)
--     loesen alle korrekt zu hatphones-band auf.
--
-- Matching-Strategie: ausschliesslich ueber bands.slug, NICHT ueber
--   bands.name -- Bandnamen mit Apostrophen/Sonderzeichen waeren ueber
--   352 Zeilen eine Escaping-Falle. Der Bandname steht nur als Kommentar
--   neben jeder VALUES-Zeile.
--
-- Privilegien-Hinweis (kein Handlungsbedarf in diesem Sprint):
--   anon hat SELECT nur auf source_band_id/target_band_id/relation_type/rank
--   (Column-Level-Grant, RLS-Sprint). service_role hat aktuell nur REFERENCES
--   auf Spaltenebene -- fuer diesen Import irrelevant, da manuell im SQL
--   Editor ausgefuehrt. Kein GRANT-Fix Teil dieses Sprints.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPPE 0: PRECHECK -- Existenz-Abgleich (nur SELECT)
-- Erwartung: KEINE Zeilen (alle Source-/Ziel-Slugs bereits bereinigt).
-- Re-Verifikation gegen den LIVE-Stand zum Ausfuehrungszeitpunkt, falls
-- sich seit dem Dry-Run (09.07.) etwas an bands geaendert hat.
-- ------------------------------------------------------------
with import_pairs (source_slug, target_slug, rank) as (
  values
    ('2-unplugged', 'mix2max', 1), -- 2 unplugged -> mix2max
    ('2-unplugged', 'duo-heartline', 2), -- 2 unplugged -> Heartline
    ('2-unplugged', 'czech-aut', 3), -- 2 unplugged -> Czech Aut
    ('5tobeat', 'countryholics', 1), -- 5toBeat -> Countryholics
    ('5tobeat', 'glory-times', 2), -- 5toBeat -> Glory Times
    ('5tobeat', 'soiznpepper', 3), -- 5toBeat -> Soiz''n''Pepper
    ('9to5', 'birddogs', 1), -- 9to5 -> Birddogs
    ('9to5', 'lpc-music', 2), -- 9to5 -> LPC
    ('9to5', 'silk-and-sound', 3), -- 9to5 -> Silk and Sound
    ('a96-musikanten', 'kapelle-quetschnblech', 1), -- A96 Musikanten -> Quetschnblech
    ('a96-musikanten', 'urner-musi', 2), -- A96 Musikanten -> Urner Musi
    ('a96-musikanten', 'duanix-musi', 3), -- A96 Musikanten -> Duanix Musi
    ('almdoodler', 'sappralot', 1), -- Almdoodler -> Sappralot
    ('almdoodler', 'spotlight-eventband', 2), -- Almdoodler -> SPOTLIGHT Eventband
    ('almdoodler', 'urwaidler-band', 3), -- Almdoodler -> Urwaidler
    ('aufzundn', 'mixtape', 1), -- Aufzundn -> Mixtape
    ('aufzundn', 'baerntreiber-band', 2), -- Aufzundn -> Bärntreiber
    ('aufzundn', 'xploushn', 3), -- Aufzundn -> X''Ploushn
    ('baerntreiber-band', 'heimatfieber', 1), -- Bärntreiber -> Heimatfieber
    ('baerntreiber-band', 'xploushn', 2), -- Bärntreiber -> X''Ploushn
    ('baerntreiber-band', 'aufzundn', 3), -- Bärntreiber -> Aufzundn
    ('bayrisch-blau', 'urner-musi', 1), -- Bayrisch Blau -> Urner Musi
    ('bayrisch-blau', 'tegernseer-tanzlmusi', 2), -- Bayrisch Blau -> Tegernseer Tanzlmusi
    ('bayrisch-blau', 'kapelle-quetschnblech', 3), -- Bayrisch Blau -> Quetschnblech
    ('best-of-band', 'xploushn', 1), -- Best-of-Band -> X''Ploushn
    ('best-of-band', 'foxy-gentlemen', 2), -- Best-of-Band -> Foxy Gentlemen
    ('bigband-steinbach', 'lpc-music', 1), -- Bigband STEINBACH -> LPC
    ('bigband-steinbach', 'birddogs', 2), -- Bigband STEINBACH -> Birddogs
    ('bigband-steinbach', 'harmonic-brass', 3), -- Bigband STEINBACH -> Harmonic Brass
    ('bigbeat-band', 'onesee', 1), -- BigBeat -> Onesee
    ('bigbeat-band', 'loops-band', 2), -- BigBeat -> Loops
    ('bigbeat-band', 'myfriendz', 3), -- BigBeat -> MyfriendZ
    ('birddogs', '9to5', 1), -- Birddogs -> 9to5
    ('birddogs', 'more-candy', 2), -- Birddogs -> More Candy
    ('birddogs', 'lpc-music', 3), -- Birddogs -> LPC
    ('blechhilfswerk', 'gaudinockerl', 1), -- Blechhilfswerk -> Gaudinockerl
    ('blechhilfswerk', 'harmonic-brass', 2), -- Blechhilfswerk -> Harmonic Brass
    ('blechhilfswerk', 'urner-musi', 3), -- Blechhilfswerk -> Urner Musi
    ('blechstreet-boys', 'hertz7', 1), -- Blechstreet Boys -> Hertz7 - Die Band
    ('blechstreet-boys', 'desbrassdscho', 2), -- Blechstreet Boys -> des Brassd scho!
    ('blechstreet-boys', 'hulzstoussboum', 3), -- Blechstreet Boys -> Hulzstoussboum
    ('boehmisches-verlangen', 'hertz7', 1), -- Böhmisches Verlangen -> Hertz7 - Die Band
    ('boehmisches-verlangen', 'hochdruck-boehmische', 2), -- Böhmisches Verlangen -> Hochdruck Böhmische
    ('boehmisches-verlangen', 'ennstal-kryner-volksmusik', 3), -- Böhmisches Verlangen -> Ennstal Kryner
    ('breznsalzer', 'rundumadum-band', 1), -- Breznsalzer -> Rundumadum
    ('breznsalzer', 'sappralot', 3), -- Breznsalzer -> Sappralot
    ('broeslschmarrn-duo', 'gaudinockerl', 1), -- Bröslschmarrn -> Gaudinockerl
    ('broeslschmarrn-duo', 'hulzstoussboum', 2), -- Bröslschmarrn -> Hulzstoussboum
    ('campfire-band', 'gaudinudln', 1), -- Campfire -> Gaudinudln
    ('campfire-band', 'oeha-band', 2), -- Campfire -> Ö''ha
    ('campfire-band', 'heimatfieber', 3), -- Campfire -> Heimatfieber
    ('candy-tunes', 'more-candy', 1), -- Candy Tunes -> More Candy
    ('cherry-pink', 'hatphones-band', 1), -- Cherry Pink -> Hatphones
    ('cherry-pink', 'michael-jackts-net', 2), -- Cherry Pink -> Michael Jackts Net
    ('cherry-pink', 'soiznpepper', 3), -- Cherry Pink -> Soiz''n''Pepper
    ('claudia-dechand', 'katharina-kornprobst', 1), -- Claudia Dechand -> Katharina Kornprobst
    ('claudia-dechand', 'freunde-des-brautpaares', 2), -- Claudia Dechand -> Freunde des Brautpaares
    ('claudia-dechand', 'steffi-heim', 3), -- Claudia Dechand -> Steffi Heim
    ('claudia-und-ralph', 'freunde-des-brautpaares', 1), -- Claudia und Ralf -> Freunde des Brautpaares
    ('claudia-und-ralph', 'katharina-kornprobst', 2), -- Claudia und Ralf -> Katharina Kornprobst
    ('countryholics', '5tobeat', 1), -- Countryholics -> 5toBeat
    ('czech-aut', 'duo-heartline', 1), -- Czech Aut -> Heartline
    ('czech-aut', '2-unplugged', 2), -- Czech Aut -> 2 unplugged
    ('czech-aut', 'mix2max', 3), -- Czech Aut -> mix2max
    ('d-quertreiber', 'donnaweda', 1), -- Quertreiber -> Donnaweda
    ('d-quertreiber', 'groegoetz-weissbir', 2), -- Quertreiber -> Grögötz Weißbir
    ('d-quertreiber', 'froschhaxn-express', 3), -- Quertreiber -> Froschhaxn Express
    ('d-rieder', 'kapelle-quetschnblech', 1), -- d''Rieder -> Quetschnblech
    ('d-rieder', 'duanix-musi', 2), -- d''Rieder -> Duanix Musi
    ('d-rieder', 'tegernseer-tanzlmusi', 3), -- d''Rieder -> Tegernseer Tanzlmusi
    ('de-gaudimacha', 'zechpreller-trio', 1), -- De Gaudimacha -> d''Zechpreller
    ('de-gaudimacha', 'extra-die-band', 2), -- De Gaudimacha -> extra … die Band!
    ('de-gaudimacha', 'baerntreiber-band', 3), -- De Gaudimacha -> Bärntreiber
    ('deep-decision', 'freunde-des-brautpaares', 1), -- Deep Decision -> Freunde des Brautpaares
    ('desbrassdscho', 'blechstreet-boys', 1), -- des Brassd scho! -> Blechstreet Boys
    ('desbrassdscho', 'ruescherl-muse', 2), -- des Brassd scho! -> Rüscherl Muse
    ('desbrassdscho', 'dezent-boehmisch', 3), -- des Brassd scho! -> Dezent Böhmisch
    ('dezent-boehmisch', 'seubersdorfer-blasmusik', 1), -- Dezent Böhmisch -> Seubersdorfer Blasmusik
    ('dezent-boehmisch', 'hulzstoussboum', 2), -- Dezent Böhmisch -> Hulzstoussboum
    ('dezent-boehmisch', 'blechstreet-boys', 3), -- Dezent Böhmisch -> Blechstreet Boys
    ('die-gseea-wepsn', 'die-haumdaucher', 1), -- Die Gseea Wepsn -> Die Haumdaucher
    ('die-gseea-wepsn', 'hally-gally', 2), -- Die Gseea Wepsn -> Hally Gally
    ('die-gseea-wepsn', 'hob-nou', 3), -- Die Gseea Wepsn -> Hob Nou
    ('die-haumdaucher', 'die-gseea-wepsn', 1), -- Die Haumdaucher -> Die Gseea Wepsn
    ('die-haumdaucher', 'hally-gally', 2), -- Die Haumdaucher -> Hally Gally
    ('die-haumdaucher', 'hob-nou', 3), -- Die Haumdaucher -> Hob Nou
    ('die-lausbuba', 'mix2max', 1), -- Die Lausbuba -> mix2max
    ('donikkl-crew', 'schlawindl', 1), -- Donikkl Crew -> Schlawindl
    ('donikkl-crew', 'kizzrock', 2), -- Donikkl Crew -> KIZZRock
    ('donikkl-crew', 'geraldino', 3), -- Donikkl Crew -> Geraldino
    ('donnaweda', 'd-quertreiber', 1), -- Donnaweda -> Quertreiber
    ('donnaweda', 'groegoetz-weissbir', 2), -- Donnaweda -> Grögötz Weißbir
    ('donnaweda', 'froschhaxn-express', 3), -- Donnaweda -> Froschhaxn Express
    ('duanix-musi', 'tegernseer-tanzlmusi', 1), -- Duanix Musi -> Tegernseer Tanzlmusi
    ('duanix-musi', 'urner-musi', 3), -- Duanix Musi -> Urner Musi
    ('duo-heartline', '2-unplugged', 1), -- Heartline -> 2 unplugged
    ('duo-heartline', 'mix2max', 2), -- Heartline -> mix2max
    ('duo-heartline', 'zechpreller-trio', 3), -- Heartline -> d''Zechpreller
    ('edelwuid', 'prime-time', 1), -- Edelwuid -> Prime Time
    ('edelwuid', 'soiznpepper', 2), -- Edelwuid -> Soiz''n''Pepper
    ('edelwuid', 'limited-music', 3), -- Edelwuid -> Limited
    ('ennstal-kryner-volksmusik', 'ruescherl-muse', 1), -- Ennstal Kryner -> Rüscherl Muse
    ('ennstal-kryner-volksmusik', 'hochdruck-boehmische', 2), -- Ennstal Kryner -> Hochdruck Böhmische
    ('ennstal-kryner-volksmusik', 'tegernseer-tanzlmusi', 3), -- Ennstal Kryner -> Tegernseer Tanzlmusi
    ('extra-die-band', 'zechpreller-trio', 1), -- extra … die Band! -> d''Zechpreller
    ('extra-die-band', 'de-gaudimacha', 2), -- extra … die Band! -> De Gaudimacha
    ('extra-die-band', 'bigbeat-band', 3), -- extra … die Band! -> BigBeat
    ('foxy-gentlemen', 'gentle-band', 1), -- Foxy Gentlemen -> Gentle
    ('foxy-gentlemen', 'jive-live', 2), -- Foxy Gentlemen -> Jive
    ('freunde-des-brautpaares', 'katharina-kornprobst', 1), -- Freunde des Brautpaares -> Katharina Kornprobst
    ('freunde-des-brautpaares', 'claudia-dechand', 2), -- Freunde des Brautpaares -> Claudia Dechand
    ('freunde-des-brautpaares', 'claudia-und-ralph', 3), -- Freunde des Brautpaares -> Claudia und Ralf
    ('froschenkapelle', 'muckasaeck', 1), -- Froschenkapelle -> Muckasäck
    ('froschenkapelle', 'blechstreet-boys', 2), -- Froschenkapelle -> Blechstreet Boys
    ('froschenkapelle', 'kapelle-quetschnblech', 3), -- Froschenkapelle -> Quetschnblech
    ('froschhaxn-express', 'donnaweda', 1), -- Froschhaxn Express -> Donnaweda
    ('froschhaxn-express', 'groegoetz-weissbir', 2), -- Froschhaxn Express -> Grögötz Weißbir
    ('froschhaxn-express', 'd-quertreiber', 3), -- Froschhaxn Express -> Quertreiber
    ('gary-rhos', 'smooth-n-groove', 1), -- Gary Rhos -> Smooth''n''Groove
    ('gaudinockerl', 'blechhilfswerk', 1), -- Gaudinockerl -> Blechhilfswerk
    ('gaudinockerl', 'saustoimusi', 2), -- Gaudinockerl -> Saustoimusi
    ('gaudinockerl', 'broeslschmarrn-duo', 3), -- Gaudinockerl -> Bröslschmarrn
    ('gaudinudln', 'oeha-band', 1), -- Gaudinudln -> Ö''ha
    ('gaudinudln', 'spitzafknopf-band', 2), -- Gaudinudln -> Spitz af Knopf
    ('gaudinudln', 'donnaweda', 3), -- Gaudinudln -> Donnaweda
    ('gentle-band', 'foxy-gentlemen', 1), -- Gentle -> Foxy Gentlemen
    ('gentle-band', 'jive-live', 2), -- Gentle -> Jive
    ('gentle-band', 'soiznpepper', 3), -- Gentle -> Soiz''n''Pepper
    ('geraldino', 'schlawindl', 1), -- Geraldino -> Schlawindl
    ('geraldino', 'donikkl-crew', 2), -- Geraldino -> Donikkl Crew
    ('geraldino', 'kizzrock', 3), -- Geraldino -> KIZZRock
    ('getthatmusic-band', 'zruck-zu-dir', 1), -- GetThat! -> zruck zu Dir!
    ('groegoetz-weissbir', 'donnaweda', 1), -- Grögötz Weißbir -> Donnaweda
    ('groegoetz-weissbir', 'd-quertreiber', 2), -- Grögötz Weißbir -> Quertreiber
    ('groegoetz-weissbir', 'froschhaxn-express', 3), -- Grögötz Weißbir -> Froschhaxn Express
    ('gruppe-saitenwind', 'freunde-des-brautpaares', 1), -- Saitenwind -> Freunde des Brautpaares
    ('gruppe-saitenwind', 'lebensgfuehl-duo', 2), -- Saitenwind -> Lebensg''fühl
    ('gruppe-saitenwind', 'sabrina-robold', 3), -- Saitenwind -> Sabrina Robold
    ('hally-gally', 'die-haumdaucher', 1), -- Hally Gally -> Die Haumdaucher
    ('hally-gally', 'die-gseea-wepsn', 2), -- Hally Gally -> Die Gseea Wepsn
    ('hally-gally', 'hob-nou', 3), -- Hally Gally -> Hob Nou
    ('harmonic-brass', 'blechhilfswerk', 1), -- Harmonic Brass -> Blechhilfswerk
    ('hatphones-band', 'cherry-pink', 1), -- Hatphones -> Cherry Pink
    ('hatphones-band', 'limited-music', 2), -- Hatphones -> Limited
    ('hatphones-band', 'extra-die-band', 3), -- Hatphones -> extra … die Band!
    ('heimatfieber', 'baerntreiber-band', 1), -- Heimatfieber -> Bärntreiber
    ('heimatfieber', 'xploushn', 2), -- Heimatfieber -> X''Ploushn
    ('heimatfieber', 'donnaweda', 3), -- Heimatfieber -> Donnaweda
    ('heimatgfuehl-duo', 'limited-music', 1), -- Heimatg’fühl -> Limited
    ('heimatgfuehl-duo', '2-unplugged', 2), -- Heimatg’fühl -> 2 unplugged
    ('heimatgfuehl-duo', 'mix2max', 3), -- Heimatg’fühl -> mix2max
    ('herbn-beets', 'mixtape', 1), -- Herb’n Beets -> Mixtape
    ('herbn-beets', 'kasplattnrocker-band', 2), -- Herb’n Beets -> Kasplattnrocker
    ('herbn-beets', 'froschhaxn-express', 3), -- Herb’n Beets -> Froschhaxn Express
    ('hertz7', 'boehmisches-verlangen', 1), -- Hertz7 - Die Band -> Böhmisches Verlangen
    ('hertz7', 'blechstreet-boys', 2), -- Hertz7 - Die Band -> Blechstreet Boys
    ('hob-nou', 'die-haumdaucher', 1), -- Hob Nou -> Die Haumdaucher
    ('hob-nou', 'hally-gally', 2), -- Hob Nou -> Hally Gally
    ('hob-nou', 'aufzundn', 3), -- Hob Nou -> Aufzundn
    ('hochdruck-boehmische', 'boehmisches-verlangen', 1), -- Hochdruck Böhmische -> Böhmisches Verlangen
    ('hochdruck-boehmische', 'ennstal-kryner-volksmusik', 2), -- Hochdruck Böhmische -> Ennstal Kryner
    ('hochdruck-boehmische', 'hertz7', 3), -- Hochdruck Böhmische -> Hertz7 - Die Band
    ('hochzeitssangerin-mit-herz', 'steffi-heim', 1), -- Hochzeitssängerin MIT HERZ -> Steffi Heim
    ('hochzeitssangerin-mit-herz', 'claudia-dechand', 2), -- Hochzeitssängerin MIT HERZ -> Claudia Dechand
    ('hochzeitssangerin-mit-herz', 'katharina-kornprobst', 3), -- Hochzeitssängerin MIT HERZ -> Katharina Kornprobst
    ('hot-sugar', 'mixtape', 1), -- Hot Sugar -> Mixtape
    ('hot-sugar', 'aufzundn', 2), -- Hot Sugar -> Aufzundn
    ('hot-sugar', 'lichtfaenger-music', 3), -- Hot Sugar -> Lichtfänger
    ('hulzstoussboum', 'ruescherl-muse', 1), -- Hulzstoussboum -> Rüscherl Muse
    ('hulzstoussboum', 'dezent-boehmisch', 2), -- Hulzstoussboum -> Dezent Böhmisch
    ('hulzstoussboum', 'blechhilfswerk', 3), -- Hulzstoussboum -> Blechhilfswerk
    ('hundskrippln', 'saustoimusi', 1), -- d''Hundskrippln -> Saustoimusi
    ('hundskrippln', 'gaudinockerl', 2), -- d''Hundskrippln -> Gaudinockerl
    ('james-band', 'lichtfaenger-music', 1), -- James Band -> Lichtfänger
    ('james-band', 'onesee', 2), -- James Band -> Onesee
    ('james-band', 'limited-music', 3), -- James Band -> Limited
    ('jive-live', 'gentle-band', 1), -- Jive -> Gentle
    ('jive-live', 'foxy-gentlemen', 2), -- Jive -> Foxy Gentlemen
    ('jive-live', 'limited-music', 3), -- Jive -> Limited
    ('kapelle-quetschnblech', 'froschenkapelle', 1), -- Quetschnblech -> Froschenkapelle
    ('kapelle-quetschnblech', 'muckasaeck', 2), -- Quetschnblech -> Muckasäck
    ('kapelle-quetschnblech', 'blechstreet-boys', 3), -- Quetschnblech -> Blechstreet Boys
    ('kasplattnrocker-band', 'waidler-power', 1), -- Kasplattnrocker -> Waidler-Power
    ('kasplattnrocker-band', 'route1234-band', 2), -- Kasplattnrocker -> Route 12 34
    ('kasplattnrocker-band', 'urwaidler-band', 3), -- Kasplattnrocker -> Urwaidler
    ('katharina-kornprobst', 'freunde-des-brautpaares', 1), -- Katharina Kornprobst -> Freunde des Brautpaares
    ('katharina-kornprobst', 'claudia-dechand', 2), -- Katharina Kornprobst -> Claudia Dechand
    ('katharina-kornprobst', 'claudia-und-ralph', 3), -- Katharina Kornprobst -> Claudia und Ralf
    ('kizzrock', 'geraldino', 1), -- KIZZRock -> Geraldino
    ('kizzrock', 'schlawindl', 3), -- KIZZRock -> Schlawindl
    ('koeniglich-bayrisches-vollgas-orchester', 'mountaincrew-band', 1), -- Königlich Bayrisches Vollgas Orchester -> Mountain Crew
    ('koeniglich-bayrisches-vollgas-orchester', 'rotzloeffl-band', 2), -- Königlich Bayrisches Vollgas Orchester -> Rotzlöffl
    ('lebensgfuehl-duo', 'gruppe-saitenwind', 1), -- Lebensg''fühl -> Saitenwind
    ('lebensgfuehl-duo', 'sabrina-robold', 3), -- Lebensg''fühl -> Sabrina Robold
    ('letsfetz-band', 'getthatmusic-band', 2), -- Let''s Fetz -> GetThat!
    ('letsfetz-band', 'zruck-zu-dir', 3), -- Let''s Fetz -> zruck zu Dir!
    ('lichtfaenger-music', 'james-band', 1), -- Lichtfänger -> James Band
    ('lichtfaenger-music', 'hot-sugar', 2), -- Lichtfänger -> Hot Sugar
    ('limited-music', 'spotlight-eventband', 1), -- Limited -> SPOTLIGHT Eventband
    ('limited-music', 'whoobers', 2), -- Limited -> Whoobers
    ('limited-music', 'onesee', 3), -- Limited -> Onesee
    ('loops-band', 'glory-times', 1), -- Loops -> Glory Times
    ('loops-band', 'myfriendz', 2), -- Loops -> MyfriendZ
    ('loops-band', 'prime-time', 3), -- Loops -> Prime Time
    ('lpc-music', 'birddogs', 1), -- LPC -> Birddogs
    ('lpc-music', '9to5', 2), -- LPC -> 9to5
    ('lpc-music', 'silk-and-sound', 3), -- LPC -> Silk and Sound
    ('max-headroom', 'michael-jackts-net', 1), -- Max Headroom -> Michael Jackts Net
    ('may-vibes', 'lpc-music', 1), -- May Vibes -> LPC
    ('may-vibes', 'birddogs', 2), -- May Vibes -> Birddogs
    ('may-vibes', 'silk-and-sound', 3), -- May Vibes -> Silk and Sound
    ('michael-jackts-net', 'cherry-pink', 1), -- Michael Jackts Net -> Cherry Pink
    ('michael-jackts-net', 'soiznpepper', 2), -- Michael Jackts Net -> Soiz''n''Pepper
    ('michael-jackts-net', 'max-headroom', 3), -- Michael Jackts Net -> Max Headroom
    ('mix2max', '2-unplugged', 1), -- mix2max -> 2 unplugged
    ('mix2max', 'duo-heartline', 2), -- mix2max -> Heartline
    ('mix2max', 'sommerwind-band', 3), -- mix2max -> Sommerwind
    ('mixtape', 'aufzundn', 1), -- Mixtape -> Aufzundn
    ('mixtape', 'hot-sugar', 2), -- Mixtape -> Hot Sugar
    ('mixtape', 'hob-nou', 3), -- Mixtape -> Hob Nou
    ('moosbueffel', 'partyband-bretterboden', 1), -- Moosbüffel -> Bretterboden
    ('moosbueffel', 'sturschaedl-band', 2), -- Moosbüffel -> Sturschädl
    ('moosbueffel', 'baerntreiber-band', 3), -- Moosbüffel -> Bärntreiber
    ('more-candy', 'birddogs', 1), -- More Candy -> Birddogs
    ('more-candy', 'smooth-n-groove', 2), -- More Candy -> Smooth''n''Groove
    ('more-candy', 'silk-and-sound', 3), -- More Candy -> Silk and Sound
    ('mountaincrew-band', 'rotzloeffl-band', 1), -- Mountain Crew -> Rotzlöffl
    ('mountaincrew-band', 'koeniglich-bayrisches-vollgas-orchester', 2), -- Mountain Crew -> Königlich Bayrisches Vollgas Orchester
    ('muckasaeck', 'froschenkapelle', 1), -- Muckasäck -> Froschenkapelle
    ('muckasaeck', 'blechstreet-boys', 2), -- Muckasäck -> Blechstreet Boys
    ('muckasaeck', 'kapelle-quetschnblech', 3), -- Muckasäck -> Quetschnblech
    ('myfriendz', 'loops-band', 1), -- MyfriendZ -> Loops
    ('myfriendz', 'bigbeat-band', 2), -- MyfriendZ -> BigBeat
    ('myfriendz', 'glory-times', 3), -- MyfriendZ -> Glory Times
    ('nice-ties-band', 'woisbois-band', 1), -- Nice Ties -> Wois Bois
    ('nice-ties-band', 'almdoodler', 2), -- Nice Ties -> Almdoodler
    ('nice-ties-band', 'gentle-band', 3), -- Nice Ties -> Gentle
    ('nicks-nice', 'soiznpepper', 1), -- Nick''s Nice -> Soiz''n''Pepper
    ('nicks-nice', 'prime-time', 2), -- Nick''s Nice -> Prime Time
    ('nicks-nice', 'bigbeat-band', 3), -- Nick''s Nice -> BigBeat
    ('non-stop', 'otterbachtaler', 1), -- Non Stop -> Die Ottis
    ('non-stop', 'bigbeat-band', 2), -- Non Stop -> BigBeat
    ('non-stop', 'hatphones-band', 3), -- Non Stop -> Hatphones
    ('oeha-band', 'gaudinudln', 1), -- Ö''ha -> Gaudinudln
    ('oeha-band', 'spitzafknopf-band', 2), -- Ö''ha -> Spitz af Knopf
    ('oeha-band', 'donnaweda', 3), -- Ö''ha -> Donnaweda
    ('onesee', 'bigbeat-band', 1), -- Onesee -> BigBeat
    ('onesee', 'more-candy', 2), -- Onesee -> More Candy
    ('onesee', 'hatphones-band', 3), -- Onesee -> Hatphones
    ('otterbachtaler', 'non-stop', 1), -- Die Ottis -> Non Stop
    ('otterbachtaler', 'bigbeat-band', 2), -- Die Ottis -> BigBeat
    ('otterbachtaler', 'hatphones-band', 3), -- Die Ottis -> Hatphones
    ('out-of-bayern', 'urwaidler-band', 1), -- Out Of Bayern -> Urwaidler
    ('out-of-bayern', 'route1234-band', 2), -- Out Of Bayern -> Route 12 34
    ('out-of-bayern', 'zwiadn-band', 3), -- Out Of Bayern -> De Zwiadn
    ('partyband-bretterboden', 'moosbueffel', 1), -- Bretterboden -> Moosbüffel
    ('partyband-bretterboden', 'sturschaedl-band', 2), -- Bretterboden -> Sturschädl
    ('partyband-bretterboden', 'baerntreiber-band', 3), -- Bretterboden -> Bärntreiber
    ('partybox-trio', '2-unplugged', 1), -- Partybox -> 2 unplugged
    ('partybox-trio', 'hot-sugar', 2), -- Partybox -> Hot Sugar
    ('prime-time', 'glory-times', 1), -- Prime Time -> Glory Times
    ('prime-time', 'spotlight-eventband', 2), -- Prime Time -> SPOTLIGHT Eventband
    ('prime-time', 'edelwuid', 3), -- Prime Time -> Edelwuid
    ('rotzloeffl-band', 'mountaincrew-band', 1), -- Rotzlöffl -> Mountain Crew
    ('rotzloeffl-band', 'koeniglich-bayrisches-vollgas-orchester', 2), -- Rotzlöffl -> Königlich Bayrisches Vollgas Orchester
    ('route1234-band', 'waidler-power', 1), -- Route 12 34 -> Waidler-Power
    ('route1234-band', 'zwiadn-band', 2), -- Route 12 34 -> De Zwiadn
    ('route1234-band', 'kasplattnrocker-band', 3), -- Route 12 34 -> Kasplattnrocker
    ('ruescherl-muse', 'hochdruck-boehmische', 1), -- Rüscherl Muse -> Hochdruck Böhmische
    ('ruescherl-muse', 'dezent-boehmisch', 2), -- Rüscherl Muse -> Dezent Böhmisch
    ('ruescherl-muse', 'boehmisches-verlangen', 3), -- Rüscherl Muse -> Böhmisches Verlangen
    ('rundumadum-band', 'sakrisch-band', 2), -- Rundumadum -> SaKrisch
    ('rundumadum-band', 'groegoetz-weissbir', 3), -- Rundumadum -> Grögötz Weißbir
    ('sabrina-robold', 'freunde-des-brautpaares', 1), -- Sabrina Robold -> Freunde des Brautpaares
    ('sabrina-robold', 'lebensgfuehl-duo', 2), -- Sabrina Robold -> Lebensg''fühl
    ('sabrina-robold', 'claudia-und-ralph', 3), -- Sabrina Robold -> Claudia und Ralf
    ('sakrisch-band', 'rundumadum-band', 1), -- SaKrisch -> Rundumadum
    ('sappralot', 'spotlight-eventband', 1), -- Sappralot -> SPOTLIGHT Eventband
    ('sappralot', 'almdoodler', 2), -- Sappralot -> Almdoodler
    ('saustoimusi', 'gaudinockerl', 1), -- Saustoimusi -> Gaudinockerl
    ('saustoimusi', 'hundskrippln', 2), -- Saustoimusi -> d''Hundskrippln
    ('schlawindl', 'geraldino', 1), -- Schlawindl -> Geraldino
    ('schlawindl', 'kizzrock', 2), -- Schlawindl -> KIZZRock
    ('schlawindl', 'donikkl-crew', 3), -- Schlawindl -> Donikkl Crew
    ('seubersdorfer-blasmusik', 'dezent-boehmisch', 1), -- Seubersdorfer Blasmusik -> Dezent Böhmisch
    ('seubersdorfer-blasmusik', 'hulzstoussboum', 2), -- Seubersdorfer Blasmusik -> Hulzstoussboum
    ('silk-and-sound', 'birddogs', 1), -- Silk and Sound -> Birddogs
    ('silk-and-sound', 'lpc-music', 2), -- Silk and Sound -> LPC
    ('silk-and-sound', '9to5', 3), -- Silk and Sound -> 9to5
    ('simmisamma-band', 'wiesnkoenige', 1), -- SIMMISAMMA -> Wiesnkönige
    ('simmisamma-band', 'd-rieder', 2), -- SIMMISAMMA -> d''Rieder
    ('smooth-n-groove', 'more-candy', 1), -- Smooth''n''Groove -> More Candy
    ('smooth-n-groove', 'silk-and-sound', 2), -- Smooth''n''Groove -> Silk and Sound
    ('smooth-n-groove', 'may-vibes', 3), -- Smooth''n''Groove -> May Vibes
    ('soiznpepper', 'glory-times', 1), -- Soiz''n''Pepper -> Glory Times
    ('soiznpepper', 'prime-time', 2), -- Soiz''n''Pepper -> Prime Time
    ('soiznpepper', 'nicks-nice', 3), -- Soiz''n''Pepper -> Nick''s Nice
    ('sommerwind-band', 'vier-tell-four', 1), -- Sommerwind -> vier-tell-four
    ('sommerwind-band', 'mix2max', 2), -- Sommerwind -> mix2max
    ('sommerwind-band', 'duo-heartline', 3), -- Sommerwind -> Heartline
    ('spectrum-band', 'bigbeat-band', 1), -- Spectrum -> BigBeat
    ('spectrum-band', 'vier-tell-four', 2), -- Spectrum -> vier-tell-four
    ('spitzafknopf-band', 'donnaweda', 1), -- Spitz af Knopf -> Donnaweda
    ('spitzafknopf-band', 'gaudinudln', 2), -- Spitz af Knopf -> Gaudinudln
    ('spitzafknopf-band', 'oeha-band', 3), -- Spitz af Knopf -> Ö''ha
    ('spotlight-eventband', 'sappralot', 1), -- SPOTLIGHT Eventband  -> Sappralot
    ('spotlight-eventband', 'almdoodler', 2), -- SPOTLIGHT Eventband  -> Almdoodler
    ('spotlight-eventband', 'the-silverhammers', 3), -- SPOTLIGHT Eventband  -> The Silverhammers
    ('steffi-heim', 'hochzeitssangerin-mit-herz', 1), -- Steffi Heim -> Hochzeitssängerin MIT HERZ
    ('steffi-heim', 'claudia-dechand', 2), -- Steffi Heim -> Claudia Dechand
    ('steffi-heim', 'katharina-kornprobst', 3), -- Steffi Heim -> Katharina Kornprobst
    ('sturschaedl-band', 'moosbueffel', 1), -- Sturschädl -> Moosbüffel
    ('sturschaedl-band', 'heimatfieber', 2), -- Sturschädl -> Heimatfieber
    ('sturschaedl-band', 'partyband-bretterboden', 3), -- Sturschädl -> Bretterboden
    ('tegernseer-tanzlmusi', 'duanix-musi', 1), -- Tegernseer Tanzlmusi -> Duanix Musi
    ('tegernseer-tanzlmusi', 'urner-musi', 2), -- Tegernseer Tanzlmusi -> Urner Musi
    ('tegernseer-tanzlmusi', 'kapelle-quetschnblech', 3), -- Tegernseer Tanzlmusi -> Quetschnblech
    ('the-silverhammers', 'whoobers', 1), -- The Silverhammers -> Whoobers
    ('the-silverhammers', 'may-vibes', 2), -- The Silverhammers -> May Vibes
    ('the-silverhammers', 'lpc-music', 3), -- The Silverhammers -> LPC
    ('urner-musi', 'tegernseer-tanzlmusi', 1), -- Urner Musi -> Tegernseer Tanzlmusi
    ('urner-musi', 'duanix-musi', 2), -- Urner Musi -> Duanix Musi
    ('urner-musi', 'kapelle-quetschnblech', 3), -- Urner Musi -> Quetschnblech
    ('urwaidler-band', 'vier-tell-four', 1), -- Urwaidler -> vier-tell-four
    ('urwaidler-band', 'route1234-band', 2), -- Urwaidler -> Route 12 34
    ('urwaidler-band', 'froschhaxn-express', 3), -- Urwaidler -> Froschhaxn Express
    ('vier-tell-four', 'sommerwind-band', 1), -- vier-tell-four -> Sommerwind
    ('vier-tell-four', 'urwaidler-band', 2), -- vier-tell-four -> Urwaidler
    ('vier-tell-four', 'prime-time', 3), -- vier-tell-four -> Prime Time
    ('waidler-power', 'route1234-band', 1), -- Waidler-Power -> Route 12 34
    ('waidler-power', 'kasplattnrocker-band', 2), -- Waidler-Power -> Kasplattnrocker
    ('waidler-power', 'otterbachtaler', 3), -- Waidler-Power -> Die Ottis
    ('whoobers', 'the-silverhammers', 1), -- Whoobers -> The Silverhammers
    ('whoobers', 'may-vibes', 2), -- Whoobers -> May Vibes
    ('whoobers', 'more-candy', 3), -- Whoobers -> More Candy
    ('wiesnkoenige', 'simmisamma-band', 1), -- Wiesnkönige -> SIMMISAMMA
    ('woidrocker-band', 'non-stop', 1), -- Die WoidRocker -> Non Stop
    ('woidrocker-band', 'route1234-band', 2), -- Die WoidRocker -> Route 12 34
    ('woidrocker-band', 'kasplattnrocker-band', 3), -- Die WoidRocker -> Kasplattnrocker
    ('woisbois-band', 'nice-ties-band', 1), -- Wois Bois -> Nice Ties
    ('woisbois-band', 'spectrum-band', 2), -- Wois Bois -> Spectrum
    ('woisbois-band', 'vier-tell-four', 3), -- Wois Bois -> vier-tell-four
    ('xploushn', 'baerntreiber-band', 1), -- X''Ploushn -> Bärntreiber
    ('xploushn', 'heimatfieber', 2), -- X''Ploushn -> Heimatfieber
    ('zechpreller-trio', 'mix2max', 1), -- d''Zechpreller -> mix2max
    ('zechpreller-trio', 'heimatgfuehl-duo', 2), -- d''Zechpreller -> Heimatg’fühl
    ('zechpreller-trio', '2-unplugged', 3), -- d''Zechpreller -> 2 unplugged
    ('zruck-zu-dir', 'mixtape', 1), -- zruck zu Dir! -> Mixtape
    ('zruck-zu-dir', 'getthatmusic-band', 2), -- zruck zu Dir! -> GetThat!
    ('zwiadn-band', 'route1234-band', 1), -- De Zwiadn  -> Route 12 34
    ('zwiadn-band', 'kasplattnrocker-band', 2), -- De Zwiadn  -> Kasplattnrocker
    ('zwiadn-band', 'waidler-power', 3) -- De Zwiadn  -> Waidler-Power
),
missing_sources as (
  select distinct ip.source_slug from import_pairs ip
  left join public.bands b on b.slug = ip.source_slug
  where b.id is null
),
missing_targets as (
  select distinct ip.target_slug from import_pairs ip
  left join public.bands b on b.slug = ip.target_slug
  where b.id is null
)
select 'FEHLENDER SOURCE-SLUG' as problem, source_slug as wert from missing_sources
union all
select 'FEHLENDER TARGET-SLUG' as problem, target_slug as wert from missing_targets
order by problem, wert;
-- Erwartung: 0 Zeilen.


-- ------------------------------------------------------------
-- ETAPPE 0b: ZAEHL-PRECHECK (nur SELECT)
-- Ein einziger kombinierter Query -- deckt alle 8 geforderten
-- Pruefpunkte ab (Fenster-Funktion fuer den Dubletten-Check, damit die
-- 352-Zeilen-VALUES-Liste nicht mehrfach wiederholt werden muss).
-- ------------------------------------------------------------
with import_pairs (source_slug, target_slug, rank) as (
  values
    ('2-unplugged', 'mix2max', 1), -- 2 unplugged -> mix2max
    ('2-unplugged', 'duo-heartline', 2), -- 2 unplugged -> Heartline
    ('2-unplugged', 'czech-aut', 3), -- 2 unplugged -> Czech Aut
    ('5tobeat', 'countryholics', 1), -- 5toBeat -> Countryholics
    ('5tobeat', 'glory-times', 2), -- 5toBeat -> Glory Times
    ('5tobeat', 'soiznpepper', 3), -- 5toBeat -> Soiz''n''Pepper
    ('9to5', 'birddogs', 1), -- 9to5 -> Birddogs
    ('9to5', 'lpc-music', 2), -- 9to5 -> LPC
    ('9to5', 'silk-and-sound', 3), -- 9to5 -> Silk and Sound
    ('a96-musikanten', 'kapelle-quetschnblech', 1), -- A96 Musikanten -> Quetschnblech
    ('a96-musikanten', 'urner-musi', 2), -- A96 Musikanten -> Urner Musi
    ('a96-musikanten', 'duanix-musi', 3), -- A96 Musikanten -> Duanix Musi
    ('almdoodler', 'sappralot', 1), -- Almdoodler -> Sappralot
    ('almdoodler', 'spotlight-eventband', 2), -- Almdoodler -> SPOTLIGHT Eventband
    ('almdoodler', 'urwaidler-band', 3), -- Almdoodler -> Urwaidler
    ('aufzundn', 'mixtape', 1), -- Aufzundn -> Mixtape
    ('aufzundn', 'baerntreiber-band', 2), -- Aufzundn -> Bärntreiber
    ('aufzundn', 'xploushn', 3), -- Aufzundn -> X''Ploushn
    ('baerntreiber-band', 'heimatfieber', 1), -- Bärntreiber -> Heimatfieber
    ('baerntreiber-band', 'xploushn', 2), -- Bärntreiber -> X''Ploushn
    ('baerntreiber-band', 'aufzundn', 3), -- Bärntreiber -> Aufzundn
    ('bayrisch-blau', 'urner-musi', 1), -- Bayrisch Blau -> Urner Musi
    ('bayrisch-blau', 'tegernseer-tanzlmusi', 2), -- Bayrisch Blau -> Tegernseer Tanzlmusi
    ('bayrisch-blau', 'kapelle-quetschnblech', 3), -- Bayrisch Blau -> Quetschnblech
    ('best-of-band', 'xploushn', 1), -- Best-of-Band -> X''Ploushn
    ('best-of-band', 'foxy-gentlemen', 2), -- Best-of-Band -> Foxy Gentlemen
    ('bigband-steinbach', 'lpc-music', 1), -- Bigband STEINBACH -> LPC
    ('bigband-steinbach', 'birddogs', 2), -- Bigband STEINBACH -> Birddogs
    ('bigband-steinbach', 'harmonic-brass', 3), -- Bigband STEINBACH -> Harmonic Brass
    ('bigbeat-band', 'onesee', 1), -- BigBeat -> Onesee
    ('bigbeat-band', 'loops-band', 2), -- BigBeat -> Loops
    ('bigbeat-band', 'myfriendz', 3), -- BigBeat -> MyfriendZ
    ('birddogs', '9to5', 1), -- Birddogs -> 9to5
    ('birddogs', 'more-candy', 2), -- Birddogs -> More Candy
    ('birddogs', 'lpc-music', 3), -- Birddogs -> LPC
    ('blechhilfswerk', 'gaudinockerl', 1), -- Blechhilfswerk -> Gaudinockerl
    ('blechhilfswerk', 'harmonic-brass', 2), -- Blechhilfswerk -> Harmonic Brass
    ('blechhilfswerk', 'urner-musi', 3), -- Blechhilfswerk -> Urner Musi
    ('blechstreet-boys', 'hertz7', 1), -- Blechstreet Boys -> Hertz7 - Die Band
    ('blechstreet-boys', 'desbrassdscho', 2), -- Blechstreet Boys -> des Brassd scho!
    ('blechstreet-boys', 'hulzstoussboum', 3), -- Blechstreet Boys -> Hulzstoussboum
    ('boehmisches-verlangen', 'hertz7', 1), -- Böhmisches Verlangen -> Hertz7 - Die Band
    ('boehmisches-verlangen', 'hochdruck-boehmische', 2), -- Böhmisches Verlangen -> Hochdruck Böhmische
    ('boehmisches-verlangen', 'ennstal-kryner-volksmusik', 3), -- Böhmisches Verlangen -> Ennstal Kryner
    ('breznsalzer', 'rundumadum-band', 1), -- Breznsalzer -> Rundumadum
    ('breznsalzer', 'sappralot', 3), -- Breznsalzer -> Sappralot
    ('broeslschmarrn-duo', 'gaudinockerl', 1), -- Bröslschmarrn -> Gaudinockerl
    ('broeslschmarrn-duo', 'hulzstoussboum', 2), -- Bröslschmarrn -> Hulzstoussboum
    ('campfire-band', 'gaudinudln', 1), -- Campfire -> Gaudinudln
    ('campfire-band', 'oeha-band', 2), -- Campfire -> Ö''ha
    ('campfire-band', 'heimatfieber', 3), -- Campfire -> Heimatfieber
    ('candy-tunes', 'more-candy', 1), -- Candy Tunes -> More Candy
    ('cherry-pink', 'hatphones-band', 1), -- Cherry Pink -> Hatphones
    ('cherry-pink', 'michael-jackts-net', 2), -- Cherry Pink -> Michael Jackts Net
    ('cherry-pink', 'soiznpepper', 3), -- Cherry Pink -> Soiz''n''Pepper
    ('claudia-dechand', 'katharina-kornprobst', 1), -- Claudia Dechand -> Katharina Kornprobst
    ('claudia-dechand', 'freunde-des-brautpaares', 2), -- Claudia Dechand -> Freunde des Brautpaares
    ('claudia-dechand', 'steffi-heim', 3), -- Claudia Dechand -> Steffi Heim
    ('claudia-und-ralph', 'freunde-des-brautpaares', 1), -- Claudia und Ralf -> Freunde des Brautpaares
    ('claudia-und-ralph', 'katharina-kornprobst', 2), -- Claudia und Ralf -> Katharina Kornprobst
    ('countryholics', '5tobeat', 1), -- Countryholics -> 5toBeat
    ('czech-aut', 'duo-heartline', 1), -- Czech Aut -> Heartline
    ('czech-aut', '2-unplugged', 2), -- Czech Aut -> 2 unplugged
    ('czech-aut', 'mix2max', 3), -- Czech Aut -> mix2max
    ('d-quertreiber', 'donnaweda', 1), -- Quertreiber -> Donnaweda
    ('d-quertreiber', 'groegoetz-weissbir', 2), -- Quertreiber -> Grögötz Weißbir
    ('d-quertreiber', 'froschhaxn-express', 3), -- Quertreiber -> Froschhaxn Express
    ('d-rieder', 'kapelle-quetschnblech', 1), -- d''Rieder -> Quetschnblech
    ('d-rieder', 'duanix-musi', 2), -- d''Rieder -> Duanix Musi
    ('d-rieder', 'tegernseer-tanzlmusi', 3), -- d''Rieder -> Tegernseer Tanzlmusi
    ('de-gaudimacha', 'zechpreller-trio', 1), -- De Gaudimacha -> d''Zechpreller
    ('de-gaudimacha', 'extra-die-band', 2), -- De Gaudimacha -> extra … die Band!
    ('de-gaudimacha', 'baerntreiber-band', 3), -- De Gaudimacha -> Bärntreiber
    ('deep-decision', 'freunde-des-brautpaares', 1), -- Deep Decision -> Freunde des Brautpaares
    ('desbrassdscho', 'blechstreet-boys', 1), -- des Brassd scho! -> Blechstreet Boys
    ('desbrassdscho', 'ruescherl-muse', 2), -- des Brassd scho! -> Rüscherl Muse
    ('desbrassdscho', 'dezent-boehmisch', 3), -- des Brassd scho! -> Dezent Böhmisch
    ('dezent-boehmisch', 'seubersdorfer-blasmusik', 1), -- Dezent Böhmisch -> Seubersdorfer Blasmusik
    ('dezent-boehmisch', 'hulzstoussboum', 2), -- Dezent Böhmisch -> Hulzstoussboum
    ('dezent-boehmisch', 'blechstreet-boys', 3), -- Dezent Böhmisch -> Blechstreet Boys
    ('die-gseea-wepsn', 'die-haumdaucher', 1), -- Die Gseea Wepsn -> Die Haumdaucher
    ('die-gseea-wepsn', 'hally-gally', 2), -- Die Gseea Wepsn -> Hally Gally
    ('die-gseea-wepsn', 'hob-nou', 3), -- Die Gseea Wepsn -> Hob Nou
    ('die-haumdaucher', 'die-gseea-wepsn', 1), -- Die Haumdaucher -> Die Gseea Wepsn
    ('die-haumdaucher', 'hally-gally', 2), -- Die Haumdaucher -> Hally Gally
    ('die-haumdaucher', 'hob-nou', 3), -- Die Haumdaucher -> Hob Nou
    ('die-lausbuba', 'mix2max', 1), -- Die Lausbuba -> mix2max
    ('donikkl-crew', 'schlawindl', 1), -- Donikkl Crew -> Schlawindl
    ('donikkl-crew', 'kizzrock', 2), -- Donikkl Crew -> KIZZRock
    ('donikkl-crew', 'geraldino', 3), -- Donikkl Crew -> Geraldino
    ('donnaweda', 'd-quertreiber', 1), -- Donnaweda -> Quertreiber
    ('donnaweda', 'groegoetz-weissbir', 2), -- Donnaweda -> Grögötz Weißbir
    ('donnaweda', 'froschhaxn-express', 3), -- Donnaweda -> Froschhaxn Express
    ('duanix-musi', 'tegernseer-tanzlmusi', 1), -- Duanix Musi -> Tegernseer Tanzlmusi
    ('duanix-musi', 'urner-musi', 3), -- Duanix Musi -> Urner Musi
    ('duo-heartline', '2-unplugged', 1), -- Heartline -> 2 unplugged
    ('duo-heartline', 'mix2max', 2), -- Heartline -> mix2max
    ('duo-heartline', 'zechpreller-trio', 3), -- Heartline -> d''Zechpreller
    ('edelwuid', 'prime-time', 1), -- Edelwuid -> Prime Time
    ('edelwuid', 'soiznpepper', 2), -- Edelwuid -> Soiz''n''Pepper
    ('edelwuid', 'limited-music', 3), -- Edelwuid -> Limited
    ('ennstal-kryner-volksmusik', 'ruescherl-muse', 1), -- Ennstal Kryner -> Rüscherl Muse
    ('ennstal-kryner-volksmusik', 'hochdruck-boehmische', 2), -- Ennstal Kryner -> Hochdruck Böhmische
    ('ennstal-kryner-volksmusik', 'tegernseer-tanzlmusi', 3), -- Ennstal Kryner -> Tegernseer Tanzlmusi
    ('extra-die-band', 'zechpreller-trio', 1), -- extra … die Band! -> d''Zechpreller
    ('extra-die-band', 'de-gaudimacha', 2), -- extra … die Band! -> De Gaudimacha
    ('extra-die-band', 'bigbeat-band', 3), -- extra … die Band! -> BigBeat
    ('foxy-gentlemen', 'gentle-band', 1), -- Foxy Gentlemen -> Gentle
    ('foxy-gentlemen', 'jive-live', 2), -- Foxy Gentlemen -> Jive
    ('freunde-des-brautpaares', 'katharina-kornprobst', 1), -- Freunde des Brautpaares -> Katharina Kornprobst
    ('freunde-des-brautpaares', 'claudia-dechand', 2), -- Freunde des Brautpaares -> Claudia Dechand
    ('freunde-des-brautpaares', 'claudia-und-ralph', 3), -- Freunde des Brautpaares -> Claudia und Ralf
    ('froschenkapelle', 'muckasaeck', 1), -- Froschenkapelle -> Muckasäck
    ('froschenkapelle', 'blechstreet-boys', 2), -- Froschenkapelle -> Blechstreet Boys
    ('froschenkapelle', 'kapelle-quetschnblech', 3), -- Froschenkapelle -> Quetschnblech
    ('froschhaxn-express', 'donnaweda', 1), -- Froschhaxn Express -> Donnaweda
    ('froschhaxn-express', 'groegoetz-weissbir', 2), -- Froschhaxn Express -> Grögötz Weißbir
    ('froschhaxn-express', 'd-quertreiber', 3), -- Froschhaxn Express -> Quertreiber
    ('gary-rhos', 'smooth-n-groove', 1), -- Gary Rhos -> Smooth''n''Groove
    ('gaudinockerl', 'blechhilfswerk', 1), -- Gaudinockerl -> Blechhilfswerk
    ('gaudinockerl', 'saustoimusi', 2), -- Gaudinockerl -> Saustoimusi
    ('gaudinockerl', 'broeslschmarrn-duo', 3), -- Gaudinockerl -> Bröslschmarrn
    ('gaudinudln', 'oeha-band', 1), -- Gaudinudln -> Ö''ha
    ('gaudinudln', 'spitzafknopf-band', 2), -- Gaudinudln -> Spitz af Knopf
    ('gaudinudln', 'donnaweda', 3), -- Gaudinudln -> Donnaweda
    ('gentle-band', 'foxy-gentlemen', 1), -- Gentle -> Foxy Gentlemen
    ('gentle-band', 'jive-live', 2), -- Gentle -> Jive
    ('gentle-band', 'soiznpepper', 3), -- Gentle -> Soiz''n''Pepper
    ('geraldino', 'schlawindl', 1), -- Geraldino -> Schlawindl
    ('geraldino', 'donikkl-crew', 2), -- Geraldino -> Donikkl Crew
    ('geraldino', 'kizzrock', 3), -- Geraldino -> KIZZRock
    ('getthatmusic-band', 'zruck-zu-dir', 1), -- GetThat! -> zruck zu Dir!
    ('groegoetz-weissbir', 'donnaweda', 1), -- Grögötz Weißbir -> Donnaweda
    ('groegoetz-weissbir', 'd-quertreiber', 2), -- Grögötz Weißbir -> Quertreiber
    ('groegoetz-weissbir', 'froschhaxn-express', 3), -- Grögötz Weißbir -> Froschhaxn Express
    ('gruppe-saitenwind', 'freunde-des-brautpaares', 1), -- Saitenwind -> Freunde des Brautpaares
    ('gruppe-saitenwind', 'lebensgfuehl-duo', 2), -- Saitenwind -> Lebensg''fühl
    ('gruppe-saitenwind', 'sabrina-robold', 3), -- Saitenwind -> Sabrina Robold
    ('hally-gally', 'die-haumdaucher', 1), -- Hally Gally -> Die Haumdaucher
    ('hally-gally', 'die-gseea-wepsn', 2), -- Hally Gally -> Die Gseea Wepsn
    ('hally-gally', 'hob-nou', 3), -- Hally Gally -> Hob Nou
    ('harmonic-brass', 'blechhilfswerk', 1), -- Harmonic Brass -> Blechhilfswerk
    ('hatphones-band', 'cherry-pink', 1), -- Hatphones -> Cherry Pink
    ('hatphones-band', 'limited-music', 2), -- Hatphones -> Limited
    ('hatphones-band', 'extra-die-band', 3), -- Hatphones -> extra … die Band!
    ('heimatfieber', 'baerntreiber-band', 1), -- Heimatfieber -> Bärntreiber
    ('heimatfieber', 'xploushn', 2), -- Heimatfieber -> X''Ploushn
    ('heimatfieber', 'donnaweda', 3), -- Heimatfieber -> Donnaweda
    ('heimatgfuehl-duo', 'limited-music', 1), -- Heimatg’fühl -> Limited
    ('heimatgfuehl-duo', '2-unplugged', 2), -- Heimatg’fühl -> 2 unplugged
    ('heimatgfuehl-duo', 'mix2max', 3), -- Heimatg’fühl -> mix2max
    ('herbn-beets', 'mixtape', 1), -- Herb’n Beets -> Mixtape
    ('herbn-beets', 'kasplattnrocker-band', 2), -- Herb’n Beets -> Kasplattnrocker
    ('herbn-beets', 'froschhaxn-express', 3), -- Herb’n Beets -> Froschhaxn Express
    ('hertz7', 'boehmisches-verlangen', 1), -- Hertz7 - Die Band -> Böhmisches Verlangen
    ('hertz7', 'blechstreet-boys', 2), -- Hertz7 - Die Band -> Blechstreet Boys
    ('hob-nou', 'die-haumdaucher', 1), -- Hob Nou -> Die Haumdaucher
    ('hob-nou', 'hally-gally', 2), -- Hob Nou -> Hally Gally
    ('hob-nou', 'aufzundn', 3), -- Hob Nou -> Aufzundn
    ('hochdruck-boehmische', 'boehmisches-verlangen', 1), -- Hochdruck Böhmische -> Böhmisches Verlangen
    ('hochdruck-boehmische', 'ennstal-kryner-volksmusik', 2), -- Hochdruck Böhmische -> Ennstal Kryner
    ('hochdruck-boehmische', 'hertz7', 3), -- Hochdruck Böhmische -> Hertz7 - Die Band
    ('hochzeitssangerin-mit-herz', 'steffi-heim', 1), -- Hochzeitssängerin MIT HERZ -> Steffi Heim
    ('hochzeitssangerin-mit-herz', 'claudia-dechand', 2), -- Hochzeitssängerin MIT HERZ -> Claudia Dechand
    ('hochzeitssangerin-mit-herz', 'katharina-kornprobst', 3), -- Hochzeitssängerin MIT HERZ -> Katharina Kornprobst
    ('hot-sugar', 'mixtape', 1), -- Hot Sugar -> Mixtape
    ('hot-sugar', 'aufzundn', 2), -- Hot Sugar -> Aufzundn
    ('hot-sugar', 'lichtfaenger-music', 3), -- Hot Sugar -> Lichtfänger
    ('hulzstoussboum', 'ruescherl-muse', 1), -- Hulzstoussboum -> Rüscherl Muse
    ('hulzstoussboum', 'dezent-boehmisch', 2), -- Hulzstoussboum -> Dezent Böhmisch
    ('hulzstoussboum', 'blechhilfswerk', 3), -- Hulzstoussboum -> Blechhilfswerk
    ('hundskrippln', 'saustoimusi', 1), -- d''Hundskrippln -> Saustoimusi
    ('hundskrippln', 'gaudinockerl', 2), -- d''Hundskrippln -> Gaudinockerl
    ('james-band', 'lichtfaenger-music', 1), -- James Band -> Lichtfänger
    ('james-band', 'onesee', 2), -- James Band -> Onesee
    ('james-band', 'limited-music', 3), -- James Band -> Limited
    ('jive-live', 'gentle-band', 1), -- Jive -> Gentle
    ('jive-live', 'foxy-gentlemen', 2), -- Jive -> Foxy Gentlemen
    ('jive-live', 'limited-music', 3), -- Jive -> Limited
    ('kapelle-quetschnblech', 'froschenkapelle', 1), -- Quetschnblech -> Froschenkapelle
    ('kapelle-quetschnblech', 'muckasaeck', 2), -- Quetschnblech -> Muckasäck
    ('kapelle-quetschnblech', 'blechstreet-boys', 3), -- Quetschnblech -> Blechstreet Boys
    ('kasplattnrocker-band', 'waidler-power', 1), -- Kasplattnrocker -> Waidler-Power
    ('kasplattnrocker-band', 'route1234-band', 2), -- Kasplattnrocker -> Route 12 34
    ('kasplattnrocker-band', 'urwaidler-band', 3), -- Kasplattnrocker -> Urwaidler
    ('katharina-kornprobst', 'freunde-des-brautpaares', 1), -- Katharina Kornprobst -> Freunde des Brautpaares
    ('katharina-kornprobst', 'claudia-dechand', 2), -- Katharina Kornprobst -> Claudia Dechand
    ('katharina-kornprobst', 'claudia-und-ralph', 3), -- Katharina Kornprobst -> Claudia und Ralf
    ('kizzrock', 'geraldino', 1), -- KIZZRock -> Geraldino
    ('kizzrock', 'schlawindl', 3), -- KIZZRock -> Schlawindl
    ('koeniglich-bayrisches-vollgas-orchester', 'mountaincrew-band', 1), -- Königlich Bayrisches Vollgas Orchester -> Mountain Crew
    ('koeniglich-bayrisches-vollgas-orchester', 'rotzloeffl-band', 2), -- Königlich Bayrisches Vollgas Orchester -> Rotzlöffl
    ('lebensgfuehl-duo', 'gruppe-saitenwind', 1), -- Lebensg''fühl -> Saitenwind
    ('lebensgfuehl-duo', 'sabrina-robold', 3), -- Lebensg''fühl -> Sabrina Robold
    ('letsfetz-band', 'getthatmusic-band', 2), -- Let''s Fetz -> GetThat!
    ('letsfetz-band', 'zruck-zu-dir', 3), -- Let''s Fetz -> zruck zu Dir!
    ('lichtfaenger-music', 'james-band', 1), -- Lichtfänger -> James Band
    ('lichtfaenger-music', 'hot-sugar', 2), -- Lichtfänger -> Hot Sugar
    ('limited-music', 'spotlight-eventband', 1), -- Limited -> SPOTLIGHT Eventband
    ('limited-music', 'whoobers', 2), -- Limited -> Whoobers
    ('limited-music', 'onesee', 3), -- Limited -> Onesee
    ('loops-band', 'glory-times', 1), -- Loops -> Glory Times
    ('loops-band', 'myfriendz', 2), -- Loops -> MyfriendZ
    ('loops-band', 'prime-time', 3), -- Loops -> Prime Time
    ('lpc-music', 'birddogs', 1), -- LPC -> Birddogs
    ('lpc-music', '9to5', 2), -- LPC -> 9to5
    ('lpc-music', 'silk-and-sound', 3), -- LPC -> Silk and Sound
    ('max-headroom', 'michael-jackts-net', 1), -- Max Headroom -> Michael Jackts Net
    ('may-vibes', 'lpc-music', 1), -- May Vibes -> LPC
    ('may-vibes', 'birddogs', 2), -- May Vibes -> Birddogs
    ('may-vibes', 'silk-and-sound', 3), -- May Vibes -> Silk and Sound
    ('michael-jackts-net', 'cherry-pink', 1), -- Michael Jackts Net -> Cherry Pink
    ('michael-jackts-net', 'soiznpepper', 2), -- Michael Jackts Net -> Soiz''n''Pepper
    ('michael-jackts-net', 'max-headroom', 3), -- Michael Jackts Net -> Max Headroom
    ('mix2max', '2-unplugged', 1), -- mix2max -> 2 unplugged
    ('mix2max', 'duo-heartline', 2), -- mix2max -> Heartline
    ('mix2max', 'sommerwind-band', 3), -- mix2max -> Sommerwind
    ('mixtape', 'aufzundn', 1), -- Mixtape -> Aufzundn
    ('mixtape', 'hot-sugar', 2), -- Mixtape -> Hot Sugar
    ('mixtape', 'hob-nou', 3), -- Mixtape -> Hob Nou
    ('moosbueffel', 'partyband-bretterboden', 1), -- Moosbüffel -> Bretterboden
    ('moosbueffel', 'sturschaedl-band', 2), -- Moosbüffel -> Sturschädl
    ('moosbueffel', 'baerntreiber-band', 3), -- Moosbüffel -> Bärntreiber
    ('more-candy', 'birddogs', 1), -- More Candy -> Birddogs
    ('more-candy', 'smooth-n-groove', 2), -- More Candy -> Smooth''n''Groove
    ('more-candy', 'silk-and-sound', 3), -- More Candy -> Silk and Sound
    ('mountaincrew-band', 'rotzloeffl-band', 1), -- Mountain Crew -> Rotzlöffl
    ('mountaincrew-band', 'koeniglich-bayrisches-vollgas-orchester', 2), -- Mountain Crew -> Königlich Bayrisches Vollgas Orchester
    ('muckasaeck', 'froschenkapelle', 1), -- Muckasäck -> Froschenkapelle
    ('muckasaeck', 'blechstreet-boys', 2), -- Muckasäck -> Blechstreet Boys
    ('muckasaeck', 'kapelle-quetschnblech', 3), -- Muckasäck -> Quetschnblech
    ('myfriendz', 'loops-band', 1), -- MyfriendZ -> Loops
    ('myfriendz', 'bigbeat-band', 2), -- MyfriendZ -> BigBeat
    ('myfriendz', 'glory-times', 3), -- MyfriendZ -> Glory Times
    ('nice-ties-band', 'woisbois-band', 1), -- Nice Ties -> Wois Bois
    ('nice-ties-band', 'almdoodler', 2), -- Nice Ties -> Almdoodler
    ('nice-ties-band', 'gentle-band', 3), -- Nice Ties -> Gentle
    ('nicks-nice', 'soiznpepper', 1), -- Nick''s Nice -> Soiz''n''Pepper
    ('nicks-nice', 'prime-time', 2), -- Nick''s Nice -> Prime Time
    ('nicks-nice', 'bigbeat-band', 3), -- Nick''s Nice -> BigBeat
    ('non-stop', 'otterbachtaler', 1), -- Non Stop -> Die Ottis
    ('non-stop', 'bigbeat-band', 2), -- Non Stop -> BigBeat
    ('non-stop', 'hatphones-band', 3), -- Non Stop -> Hatphones
    ('oeha-band', 'gaudinudln', 1), -- Ö''ha -> Gaudinudln
    ('oeha-band', 'spitzafknopf-band', 2), -- Ö''ha -> Spitz af Knopf
    ('oeha-band', 'donnaweda', 3), -- Ö''ha -> Donnaweda
    ('onesee', 'bigbeat-band', 1), -- Onesee -> BigBeat
    ('onesee', 'more-candy', 2), -- Onesee -> More Candy
    ('onesee', 'hatphones-band', 3), -- Onesee -> Hatphones
    ('otterbachtaler', 'non-stop', 1), -- Die Ottis -> Non Stop
    ('otterbachtaler', 'bigbeat-band', 2), -- Die Ottis -> BigBeat
    ('otterbachtaler', 'hatphones-band', 3), -- Die Ottis -> Hatphones
    ('out-of-bayern', 'urwaidler-band', 1), -- Out Of Bayern -> Urwaidler
    ('out-of-bayern', 'route1234-band', 2), -- Out Of Bayern -> Route 12 34
    ('out-of-bayern', 'zwiadn-band', 3), -- Out Of Bayern -> De Zwiadn
    ('partyband-bretterboden', 'moosbueffel', 1), -- Bretterboden -> Moosbüffel
    ('partyband-bretterboden', 'sturschaedl-band', 2), -- Bretterboden -> Sturschädl
    ('partyband-bretterboden', 'baerntreiber-band', 3), -- Bretterboden -> Bärntreiber
    ('partybox-trio', '2-unplugged', 1), -- Partybox -> 2 unplugged
    ('partybox-trio', 'hot-sugar', 2), -- Partybox -> Hot Sugar
    ('prime-time', 'glory-times', 1), -- Prime Time -> Glory Times
    ('prime-time', 'spotlight-eventband', 2), -- Prime Time -> SPOTLIGHT Eventband
    ('prime-time', 'edelwuid', 3), -- Prime Time -> Edelwuid
    ('rotzloeffl-band', 'mountaincrew-band', 1), -- Rotzlöffl -> Mountain Crew
    ('rotzloeffl-band', 'koeniglich-bayrisches-vollgas-orchester', 2), -- Rotzlöffl -> Königlich Bayrisches Vollgas Orchester
    ('route1234-band', 'waidler-power', 1), -- Route 12 34 -> Waidler-Power
    ('route1234-band', 'zwiadn-band', 2), -- Route 12 34 -> De Zwiadn
    ('route1234-band', 'kasplattnrocker-band', 3), -- Route 12 34 -> Kasplattnrocker
    ('ruescherl-muse', 'hochdruck-boehmische', 1), -- Rüscherl Muse -> Hochdruck Böhmische
    ('ruescherl-muse', 'dezent-boehmisch', 2), -- Rüscherl Muse -> Dezent Böhmisch
    ('ruescherl-muse', 'boehmisches-verlangen', 3), -- Rüscherl Muse -> Böhmisches Verlangen
    ('rundumadum-band', 'sakrisch-band', 2), -- Rundumadum -> SaKrisch
    ('rundumadum-band', 'groegoetz-weissbir', 3), -- Rundumadum -> Grögötz Weißbir
    ('sabrina-robold', 'freunde-des-brautpaares', 1), -- Sabrina Robold -> Freunde des Brautpaares
    ('sabrina-robold', 'lebensgfuehl-duo', 2), -- Sabrina Robold -> Lebensg''fühl
    ('sabrina-robold', 'claudia-und-ralph', 3), -- Sabrina Robold -> Claudia und Ralf
    ('sakrisch-band', 'rundumadum-band', 1), -- SaKrisch -> Rundumadum
    ('sappralot', 'spotlight-eventband', 1), -- Sappralot -> SPOTLIGHT Eventband
    ('sappralot', 'almdoodler', 2), -- Sappralot -> Almdoodler
    ('saustoimusi', 'gaudinockerl', 1), -- Saustoimusi -> Gaudinockerl
    ('saustoimusi', 'hundskrippln', 2), -- Saustoimusi -> d''Hundskrippln
    ('schlawindl', 'geraldino', 1), -- Schlawindl -> Geraldino
    ('schlawindl', 'kizzrock', 2), -- Schlawindl -> KIZZRock
    ('schlawindl', 'donikkl-crew', 3), -- Schlawindl -> Donikkl Crew
    ('seubersdorfer-blasmusik', 'dezent-boehmisch', 1), -- Seubersdorfer Blasmusik -> Dezent Böhmisch
    ('seubersdorfer-blasmusik', 'hulzstoussboum', 2), -- Seubersdorfer Blasmusik -> Hulzstoussboum
    ('silk-and-sound', 'birddogs', 1), -- Silk and Sound -> Birddogs
    ('silk-and-sound', 'lpc-music', 2), -- Silk and Sound -> LPC
    ('silk-and-sound', '9to5', 3), -- Silk and Sound -> 9to5
    ('simmisamma-band', 'wiesnkoenige', 1), -- SIMMISAMMA -> Wiesnkönige
    ('simmisamma-band', 'd-rieder', 2), -- SIMMISAMMA -> d''Rieder
    ('smooth-n-groove', 'more-candy', 1), -- Smooth''n''Groove -> More Candy
    ('smooth-n-groove', 'silk-and-sound', 2), -- Smooth''n''Groove -> Silk and Sound
    ('smooth-n-groove', 'may-vibes', 3), -- Smooth''n''Groove -> May Vibes
    ('soiznpepper', 'glory-times', 1), -- Soiz''n''Pepper -> Glory Times
    ('soiznpepper', 'prime-time', 2), -- Soiz''n''Pepper -> Prime Time
    ('soiznpepper', 'nicks-nice', 3), -- Soiz''n''Pepper -> Nick''s Nice
    ('sommerwind-band', 'vier-tell-four', 1), -- Sommerwind -> vier-tell-four
    ('sommerwind-band', 'mix2max', 2), -- Sommerwind -> mix2max
    ('sommerwind-band', 'duo-heartline', 3), -- Sommerwind -> Heartline
    ('spectrum-band', 'bigbeat-band', 1), -- Spectrum -> BigBeat
    ('spectrum-band', 'vier-tell-four', 2), -- Spectrum -> vier-tell-four
    ('spitzafknopf-band', 'donnaweda', 1), -- Spitz af Knopf -> Donnaweda
    ('spitzafknopf-band', 'gaudinudln', 2), -- Spitz af Knopf -> Gaudinudln
    ('spitzafknopf-band', 'oeha-band', 3), -- Spitz af Knopf -> Ö''ha
    ('spotlight-eventband', 'sappralot', 1), -- SPOTLIGHT Eventband  -> Sappralot
    ('spotlight-eventband', 'almdoodler', 2), -- SPOTLIGHT Eventband  -> Almdoodler
    ('spotlight-eventband', 'the-silverhammers', 3), -- SPOTLIGHT Eventband  -> The Silverhammers
    ('steffi-heim', 'hochzeitssangerin-mit-herz', 1), -- Steffi Heim -> Hochzeitssängerin MIT HERZ
    ('steffi-heim', 'claudia-dechand', 2), -- Steffi Heim -> Claudia Dechand
    ('steffi-heim', 'katharina-kornprobst', 3), -- Steffi Heim -> Katharina Kornprobst
    ('sturschaedl-band', 'moosbueffel', 1), -- Sturschädl -> Moosbüffel
    ('sturschaedl-band', 'heimatfieber', 2), -- Sturschädl -> Heimatfieber
    ('sturschaedl-band', 'partyband-bretterboden', 3), -- Sturschädl -> Bretterboden
    ('tegernseer-tanzlmusi', 'duanix-musi', 1), -- Tegernseer Tanzlmusi -> Duanix Musi
    ('tegernseer-tanzlmusi', 'urner-musi', 2), -- Tegernseer Tanzlmusi -> Urner Musi
    ('tegernseer-tanzlmusi', 'kapelle-quetschnblech', 3), -- Tegernseer Tanzlmusi -> Quetschnblech
    ('the-silverhammers', 'whoobers', 1), -- The Silverhammers -> Whoobers
    ('the-silverhammers', 'may-vibes', 2), -- The Silverhammers -> May Vibes
    ('the-silverhammers', 'lpc-music', 3), -- The Silverhammers -> LPC
    ('urner-musi', 'tegernseer-tanzlmusi', 1), -- Urner Musi -> Tegernseer Tanzlmusi
    ('urner-musi', 'duanix-musi', 2), -- Urner Musi -> Duanix Musi
    ('urner-musi', 'kapelle-quetschnblech', 3), -- Urner Musi -> Quetschnblech
    ('urwaidler-band', 'vier-tell-four', 1), -- Urwaidler -> vier-tell-four
    ('urwaidler-band', 'route1234-band', 2), -- Urwaidler -> Route 12 34
    ('urwaidler-band', 'froschhaxn-express', 3), -- Urwaidler -> Froschhaxn Express
    ('vier-tell-four', 'sommerwind-band', 1), -- vier-tell-four -> Sommerwind
    ('vier-tell-four', 'urwaidler-band', 2), -- vier-tell-four -> Urwaidler
    ('vier-tell-four', 'prime-time', 3), -- vier-tell-four -> Prime Time
    ('waidler-power', 'route1234-band', 1), -- Waidler-Power -> Route 12 34
    ('waidler-power', 'kasplattnrocker-band', 2), -- Waidler-Power -> Kasplattnrocker
    ('waidler-power', 'otterbachtaler', 3), -- Waidler-Power -> Die Ottis
    ('whoobers', 'the-silverhammers', 1), -- Whoobers -> The Silverhammers
    ('whoobers', 'may-vibes', 2), -- Whoobers -> May Vibes
    ('whoobers', 'more-candy', 3), -- Whoobers -> More Candy
    ('wiesnkoenige', 'simmisamma-band', 1), -- Wiesnkönige -> SIMMISAMMA
    ('woidrocker-band', 'non-stop', 1), -- Die WoidRocker -> Non Stop
    ('woidrocker-band', 'route1234-band', 2), -- Die WoidRocker -> Route 12 34
    ('woidrocker-band', 'kasplattnrocker-band', 3), -- Die WoidRocker -> Kasplattnrocker
    ('woisbois-band', 'nice-ties-band', 1), -- Wois Bois -> Nice Ties
    ('woisbois-band', 'spectrum-band', 2), -- Wois Bois -> Spectrum
    ('woisbois-band', 'vier-tell-four', 3), -- Wois Bois -> vier-tell-four
    ('xploushn', 'baerntreiber-band', 1), -- X''Ploushn -> Bärntreiber
    ('xploushn', 'heimatfieber', 2), -- X''Ploushn -> Heimatfieber
    ('zechpreller-trio', 'mix2max', 1), -- d''Zechpreller -> mix2max
    ('zechpreller-trio', 'heimatgfuehl-duo', 2), -- d''Zechpreller -> Heimatg’fühl
    ('zechpreller-trio', '2-unplugged', 3), -- d''Zechpreller -> 2 unplugged
    ('zruck-zu-dir', 'mixtape', 1), -- zruck zu Dir! -> Mixtape
    ('zruck-zu-dir', 'getthatmusic-band', 2), -- zruck zu Dir! -> GetThat!
    ('zwiadn-band', 'route1234-band', 1), -- De Zwiadn  -> Route 12 34
    ('zwiadn-band', 'kasplattnrocker-band', 2), -- De Zwiadn  -> Kasplattnrocker
    ('zwiadn-band', 'waidler-power', 3) -- De Zwiadn  -> Waidler-Power
),
resolved as (
  select
    ip.source_slug, ip.target_slug, ip.rank,
    sb.id as source_id, tb.id as target_id,
    count(*) over (partition by ip.source_slug, ip.target_slug) as pair_occurrences
  from import_pairs ip
  left join public.bands sb on sb.slug = ip.source_slug
  left join public.bands tb on tb.slug = ip.target_slug
)
select
  count(*)                                                                        as import_pairs,                 -- erwartet 352
  count(*) filter (where r.source_id is null)                                     as missing_source_pairs,          -- erwartet 0
  count(*) filter (where r.target_id is null)                                     as missing_target_pairs,          -- erwartet 0
  count(*) filter (where r.source_id is not null and r.source_id = r.target_id)   as self_reference_pairs,          -- erwartet 0 (CHECK-Absicherung band_relations_check)
  count(*) filter (where r.rank not in (1,2,3))                                   as invalid_rank_pairs,            -- erwartet 0 (CHECK-Absicherung band_relations_rank_check)
  count(*) filter (where r.pair_occurrences > 1)                                  as duplicate_pairs_in_import,     -- erwartet 0
  count(*) filter (where br.id is not null)                                       as already_existing_pairs,        -- erwartet 3 (Donnaweda-Pilotzeilen)
  count(*) filter (
    where r.source_id is not null and r.target_id is not null
      and r.source_id <> r.target_id and r.rank in (1,2,3)
      and br.id is null
  )                                                                               as pairs_to_insert                -- erwartet 349
from resolved r
left join public.band_relations br
  on br.source_band_id = r.source_id
 and br.target_band_id = r.target_id
 and br.relation_type = 'similar';
-- Erwartung exakt: import_pairs=352, missing_source_pairs=0, missing_target_pairs=0,
-- self_reference_pairs=0, invalid_rank_pairs=0, duplicate_pairs_in_import=0,
-- already_existing_pairs=3, pairs_to_insert=349.
-- Bei JEDER Abweichung: NICHT mit Etappe 1 fortfahren, sondern Ursache klaeren.


-- ------------------------------------------------------------
-- ETAPPE 1: band_relations befuellen
-- source_band_id/target_band_id werden ueber bands.slug aufgeloest.
-- relation_type='similar', is_manual=true, reason/confidence_score=NULL
-- (die 3 Donnaweda-Bestandszeilen behalten dadurch ihre gepflegten
-- reason-Texte -- der Insert fasst bestehende Zeilen nie an).
-- created_at/updated_at bewusst NICHT gesetzt: Default now() + Trigger
-- trg_band_relations_updated_at uebernehmen das automatisch.
-- ------------------------------------------------------------
with import_pairs (source_slug, target_slug, rank) as (
  values
    ('2-unplugged', 'mix2max', 1), -- 2 unplugged -> mix2max
    ('2-unplugged', 'duo-heartline', 2), -- 2 unplugged -> Heartline
    ('2-unplugged', 'czech-aut', 3), -- 2 unplugged -> Czech Aut
    ('5tobeat', 'countryholics', 1), -- 5toBeat -> Countryholics
    ('5tobeat', 'glory-times', 2), -- 5toBeat -> Glory Times
    ('5tobeat', 'soiznpepper', 3), -- 5toBeat -> Soiz''n''Pepper
    ('9to5', 'birddogs', 1), -- 9to5 -> Birddogs
    ('9to5', 'lpc-music', 2), -- 9to5 -> LPC
    ('9to5', 'silk-and-sound', 3), -- 9to5 -> Silk and Sound
    ('a96-musikanten', 'kapelle-quetschnblech', 1), -- A96 Musikanten -> Quetschnblech
    ('a96-musikanten', 'urner-musi', 2), -- A96 Musikanten -> Urner Musi
    ('a96-musikanten', 'duanix-musi', 3), -- A96 Musikanten -> Duanix Musi
    ('almdoodler', 'sappralot', 1), -- Almdoodler -> Sappralot
    ('almdoodler', 'spotlight-eventband', 2), -- Almdoodler -> SPOTLIGHT Eventband
    ('almdoodler', 'urwaidler-band', 3), -- Almdoodler -> Urwaidler
    ('aufzundn', 'mixtape', 1), -- Aufzundn -> Mixtape
    ('aufzundn', 'baerntreiber-band', 2), -- Aufzundn -> Bärntreiber
    ('aufzundn', 'xploushn', 3), -- Aufzundn -> X''Ploushn
    ('baerntreiber-band', 'heimatfieber', 1), -- Bärntreiber -> Heimatfieber
    ('baerntreiber-band', 'xploushn', 2), -- Bärntreiber -> X''Ploushn
    ('baerntreiber-band', 'aufzundn', 3), -- Bärntreiber -> Aufzundn
    ('bayrisch-blau', 'urner-musi', 1), -- Bayrisch Blau -> Urner Musi
    ('bayrisch-blau', 'tegernseer-tanzlmusi', 2), -- Bayrisch Blau -> Tegernseer Tanzlmusi
    ('bayrisch-blau', 'kapelle-quetschnblech', 3), -- Bayrisch Blau -> Quetschnblech
    ('best-of-band', 'xploushn', 1), -- Best-of-Band -> X''Ploushn
    ('best-of-band', 'foxy-gentlemen', 2), -- Best-of-Band -> Foxy Gentlemen
    ('bigband-steinbach', 'lpc-music', 1), -- Bigband STEINBACH -> LPC
    ('bigband-steinbach', 'birddogs', 2), -- Bigband STEINBACH -> Birddogs
    ('bigband-steinbach', 'harmonic-brass', 3), -- Bigband STEINBACH -> Harmonic Brass
    ('bigbeat-band', 'onesee', 1), -- BigBeat -> Onesee
    ('bigbeat-band', 'loops-band', 2), -- BigBeat -> Loops
    ('bigbeat-band', 'myfriendz', 3), -- BigBeat -> MyfriendZ
    ('birddogs', '9to5', 1), -- Birddogs -> 9to5
    ('birddogs', 'more-candy', 2), -- Birddogs -> More Candy
    ('birddogs', 'lpc-music', 3), -- Birddogs -> LPC
    ('blechhilfswerk', 'gaudinockerl', 1), -- Blechhilfswerk -> Gaudinockerl
    ('blechhilfswerk', 'harmonic-brass', 2), -- Blechhilfswerk -> Harmonic Brass
    ('blechhilfswerk', 'urner-musi', 3), -- Blechhilfswerk -> Urner Musi
    ('blechstreet-boys', 'hertz7', 1), -- Blechstreet Boys -> Hertz7 - Die Band
    ('blechstreet-boys', 'desbrassdscho', 2), -- Blechstreet Boys -> des Brassd scho!
    ('blechstreet-boys', 'hulzstoussboum', 3), -- Blechstreet Boys -> Hulzstoussboum
    ('boehmisches-verlangen', 'hertz7', 1), -- Böhmisches Verlangen -> Hertz7 - Die Band
    ('boehmisches-verlangen', 'hochdruck-boehmische', 2), -- Böhmisches Verlangen -> Hochdruck Böhmische
    ('boehmisches-verlangen', 'ennstal-kryner-volksmusik', 3), -- Böhmisches Verlangen -> Ennstal Kryner
    ('breznsalzer', 'rundumadum-band', 1), -- Breznsalzer -> Rundumadum
    ('breznsalzer', 'sappralot', 3), -- Breznsalzer -> Sappralot
    ('broeslschmarrn-duo', 'gaudinockerl', 1), -- Bröslschmarrn -> Gaudinockerl
    ('broeslschmarrn-duo', 'hulzstoussboum', 2), -- Bröslschmarrn -> Hulzstoussboum
    ('campfire-band', 'gaudinudln', 1), -- Campfire -> Gaudinudln
    ('campfire-band', 'oeha-band', 2), -- Campfire -> Ö''ha
    ('campfire-band', 'heimatfieber', 3), -- Campfire -> Heimatfieber
    ('candy-tunes', 'more-candy', 1), -- Candy Tunes -> More Candy
    ('cherry-pink', 'hatphones-band', 1), -- Cherry Pink -> Hatphones
    ('cherry-pink', 'michael-jackts-net', 2), -- Cherry Pink -> Michael Jackts Net
    ('cherry-pink', 'soiznpepper', 3), -- Cherry Pink -> Soiz''n''Pepper
    ('claudia-dechand', 'katharina-kornprobst', 1), -- Claudia Dechand -> Katharina Kornprobst
    ('claudia-dechand', 'freunde-des-brautpaares', 2), -- Claudia Dechand -> Freunde des Brautpaares
    ('claudia-dechand', 'steffi-heim', 3), -- Claudia Dechand -> Steffi Heim
    ('claudia-und-ralph', 'freunde-des-brautpaares', 1), -- Claudia und Ralf -> Freunde des Brautpaares
    ('claudia-und-ralph', 'katharina-kornprobst', 2), -- Claudia und Ralf -> Katharina Kornprobst
    ('countryholics', '5tobeat', 1), -- Countryholics -> 5toBeat
    ('czech-aut', 'duo-heartline', 1), -- Czech Aut -> Heartline
    ('czech-aut', '2-unplugged', 2), -- Czech Aut -> 2 unplugged
    ('czech-aut', 'mix2max', 3), -- Czech Aut -> mix2max
    ('d-quertreiber', 'donnaweda', 1), -- Quertreiber -> Donnaweda
    ('d-quertreiber', 'groegoetz-weissbir', 2), -- Quertreiber -> Grögötz Weißbir
    ('d-quertreiber', 'froschhaxn-express', 3), -- Quertreiber -> Froschhaxn Express
    ('d-rieder', 'kapelle-quetschnblech', 1), -- d''Rieder -> Quetschnblech
    ('d-rieder', 'duanix-musi', 2), -- d''Rieder -> Duanix Musi
    ('d-rieder', 'tegernseer-tanzlmusi', 3), -- d''Rieder -> Tegernseer Tanzlmusi
    ('de-gaudimacha', 'zechpreller-trio', 1), -- De Gaudimacha -> d''Zechpreller
    ('de-gaudimacha', 'extra-die-band', 2), -- De Gaudimacha -> extra … die Band!
    ('de-gaudimacha', 'baerntreiber-band', 3), -- De Gaudimacha -> Bärntreiber
    ('deep-decision', 'freunde-des-brautpaares', 1), -- Deep Decision -> Freunde des Brautpaares
    ('desbrassdscho', 'blechstreet-boys', 1), -- des Brassd scho! -> Blechstreet Boys
    ('desbrassdscho', 'ruescherl-muse', 2), -- des Brassd scho! -> Rüscherl Muse
    ('desbrassdscho', 'dezent-boehmisch', 3), -- des Brassd scho! -> Dezent Böhmisch
    ('dezent-boehmisch', 'seubersdorfer-blasmusik', 1), -- Dezent Böhmisch -> Seubersdorfer Blasmusik
    ('dezent-boehmisch', 'hulzstoussboum', 2), -- Dezent Böhmisch -> Hulzstoussboum
    ('dezent-boehmisch', 'blechstreet-boys', 3), -- Dezent Böhmisch -> Blechstreet Boys
    ('die-gseea-wepsn', 'die-haumdaucher', 1), -- Die Gseea Wepsn -> Die Haumdaucher
    ('die-gseea-wepsn', 'hally-gally', 2), -- Die Gseea Wepsn -> Hally Gally
    ('die-gseea-wepsn', 'hob-nou', 3), -- Die Gseea Wepsn -> Hob Nou
    ('die-haumdaucher', 'die-gseea-wepsn', 1), -- Die Haumdaucher -> Die Gseea Wepsn
    ('die-haumdaucher', 'hally-gally', 2), -- Die Haumdaucher -> Hally Gally
    ('die-haumdaucher', 'hob-nou', 3), -- Die Haumdaucher -> Hob Nou
    ('die-lausbuba', 'mix2max', 1), -- Die Lausbuba -> mix2max
    ('donikkl-crew', 'schlawindl', 1), -- Donikkl Crew -> Schlawindl
    ('donikkl-crew', 'kizzrock', 2), -- Donikkl Crew -> KIZZRock
    ('donikkl-crew', 'geraldino', 3), -- Donikkl Crew -> Geraldino
    ('donnaweda', 'd-quertreiber', 1), -- Donnaweda -> Quertreiber
    ('donnaweda', 'groegoetz-weissbir', 2), -- Donnaweda -> Grögötz Weißbir
    ('donnaweda', 'froschhaxn-express', 3), -- Donnaweda -> Froschhaxn Express
    ('duanix-musi', 'tegernseer-tanzlmusi', 1), -- Duanix Musi -> Tegernseer Tanzlmusi
    ('duanix-musi', 'urner-musi', 3), -- Duanix Musi -> Urner Musi
    ('duo-heartline', '2-unplugged', 1), -- Heartline -> 2 unplugged
    ('duo-heartline', 'mix2max', 2), -- Heartline -> mix2max
    ('duo-heartline', 'zechpreller-trio', 3), -- Heartline -> d''Zechpreller
    ('edelwuid', 'prime-time', 1), -- Edelwuid -> Prime Time
    ('edelwuid', 'soiznpepper', 2), -- Edelwuid -> Soiz''n''Pepper
    ('edelwuid', 'limited-music', 3), -- Edelwuid -> Limited
    ('ennstal-kryner-volksmusik', 'ruescherl-muse', 1), -- Ennstal Kryner -> Rüscherl Muse
    ('ennstal-kryner-volksmusik', 'hochdruck-boehmische', 2), -- Ennstal Kryner -> Hochdruck Böhmische
    ('ennstal-kryner-volksmusik', 'tegernseer-tanzlmusi', 3), -- Ennstal Kryner -> Tegernseer Tanzlmusi
    ('extra-die-band', 'zechpreller-trio', 1), -- extra … die Band! -> d''Zechpreller
    ('extra-die-band', 'de-gaudimacha', 2), -- extra … die Band! -> De Gaudimacha
    ('extra-die-band', 'bigbeat-band', 3), -- extra … die Band! -> BigBeat
    ('foxy-gentlemen', 'gentle-band', 1), -- Foxy Gentlemen -> Gentle
    ('foxy-gentlemen', 'jive-live', 2), -- Foxy Gentlemen -> Jive
    ('freunde-des-brautpaares', 'katharina-kornprobst', 1), -- Freunde des Brautpaares -> Katharina Kornprobst
    ('freunde-des-brautpaares', 'claudia-dechand', 2), -- Freunde des Brautpaares -> Claudia Dechand
    ('freunde-des-brautpaares', 'claudia-und-ralph', 3), -- Freunde des Brautpaares -> Claudia und Ralf
    ('froschenkapelle', 'muckasaeck', 1), -- Froschenkapelle -> Muckasäck
    ('froschenkapelle', 'blechstreet-boys', 2), -- Froschenkapelle -> Blechstreet Boys
    ('froschenkapelle', 'kapelle-quetschnblech', 3), -- Froschenkapelle -> Quetschnblech
    ('froschhaxn-express', 'donnaweda', 1), -- Froschhaxn Express -> Donnaweda
    ('froschhaxn-express', 'groegoetz-weissbir', 2), -- Froschhaxn Express -> Grögötz Weißbir
    ('froschhaxn-express', 'd-quertreiber', 3), -- Froschhaxn Express -> Quertreiber
    ('gary-rhos', 'smooth-n-groove', 1), -- Gary Rhos -> Smooth''n''Groove
    ('gaudinockerl', 'blechhilfswerk', 1), -- Gaudinockerl -> Blechhilfswerk
    ('gaudinockerl', 'saustoimusi', 2), -- Gaudinockerl -> Saustoimusi
    ('gaudinockerl', 'broeslschmarrn-duo', 3), -- Gaudinockerl -> Bröslschmarrn
    ('gaudinudln', 'oeha-band', 1), -- Gaudinudln -> Ö''ha
    ('gaudinudln', 'spitzafknopf-band', 2), -- Gaudinudln -> Spitz af Knopf
    ('gaudinudln', 'donnaweda', 3), -- Gaudinudln -> Donnaweda
    ('gentle-band', 'foxy-gentlemen', 1), -- Gentle -> Foxy Gentlemen
    ('gentle-band', 'jive-live', 2), -- Gentle -> Jive
    ('gentle-band', 'soiznpepper', 3), -- Gentle -> Soiz''n''Pepper
    ('geraldino', 'schlawindl', 1), -- Geraldino -> Schlawindl
    ('geraldino', 'donikkl-crew', 2), -- Geraldino -> Donikkl Crew
    ('geraldino', 'kizzrock', 3), -- Geraldino -> KIZZRock
    ('getthatmusic-band', 'zruck-zu-dir', 1), -- GetThat! -> zruck zu Dir!
    ('groegoetz-weissbir', 'donnaweda', 1), -- Grögötz Weißbir -> Donnaweda
    ('groegoetz-weissbir', 'd-quertreiber', 2), -- Grögötz Weißbir -> Quertreiber
    ('groegoetz-weissbir', 'froschhaxn-express', 3), -- Grögötz Weißbir -> Froschhaxn Express
    ('gruppe-saitenwind', 'freunde-des-brautpaares', 1), -- Saitenwind -> Freunde des Brautpaares
    ('gruppe-saitenwind', 'lebensgfuehl-duo', 2), -- Saitenwind -> Lebensg''fühl
    ('gruppe-saitenwind', 'sabrina-robold', 3), -- Saitenwind -> Sabrina Robold
    ('hally-gally', 'die-haumdaucher', 1), -- Hally Gally -> Die Haumdaucher
    ('hally-gally', 'die-gseea-wepsn', 2), -- Hally Gally -> Die Gseea Wepsn
    ('hally-gally', 'hob-nou', 3), -- Hally Gally -> Hob Nou
    ('harmonic-brass', 'blechhilfswerk', 1), -- Harmonic Brass -> Blechhilfswerk
    ('hatphones-band', 'cherry-pink', 1), -- Hatphones -> Cherry Pink
    ('hatphones-band', 'limited-music', 2), -- Hatphones -> Limited
    ('hatphones-band', 'extra-die-band', 3), -- Hatphones -> extra … die Band!
    ('heimatfieber', 'baerntreiber-band', 1), -- Heimatfieber -> Bärntreiber
    ('heimatfieber', 'xploushn', 2), -- Heimatfieber -> X''Ploushn
    ('heimatfieber', 'donnaweda', 3), -- Heimatfieber -> Donnaweda
    ('heimatgfuehl-duo', 'limited-music', 1), -- Heimatg’fühl -> Limited
    ('heimatgfuehl-duo', '2-unplugged', 2), -- Heimatg’fühl -> 2 unplugged
    ('heimatgfuehl-duo', 'mix2max', 3), -- Heimatg’fühl -> mix2max
    ('herbn-beets', 'mixtape', 1), -- Herb’n Beets -> Mixtape
    ('herbn-beets', 'kasplattnrocker-band', 2), -- Herb’n Beets -> Kasplattnrocker
    ('herbn-beets', 'froschhaxn-express', 3), -- Herb’n Beets -> Froschhaxn Express
    ('hertz7', 'boehmisches-verlangen', 1), -- Hertz7 - Die Band -> Böhmisches Verlangen
    ('hertz7', 'blechstreet-boys', 2), -- Hertz7 - Die Band -> Blechstreet Boys
    ('hob-nou', 'die-haumdaucher', 1), -- Hob Nou -> Die Haumdaucher
    ('hob-nou', 'hally-gally', 2), -- Hob Nou -> Hally Gally
    ('hob-nou', 'aufzundn', 3), -- Hob Nou -> Aufzundn
    ('hochdruck-boehmische', 'boehmisches-verlangen', 1), -- Hochdruck Böhmische -> Böhmisches Verlangen
    ('hochdruck-boehmische', 'ennstal-kryner-volksmusik', 2), -- Hochdruck Böhmische -> Ennstal Kryner
    ('hochdruck-boehmische', 'hertz7', 3), -- Hochdruck Böhmische -> Hertz7 - Die Band
    ('hochzeitssangerin-mit-herz', 'steffi-heim', 1), -- Hochzeitssängerin MIT HERZ -> Steffi Heim
    ('hochzeitssangerin-mit-herz', 'claudia-dechand', 2), -- Hochzeitssängerin MIT HERZ -> Claudia Dechand
    ('hochzeitssangerin-mit-herz', 'katharina-kornprobst', 3), -- Hochzeitssängerin MIT HERZ -> Katharina Kornprobst
    ('hot-sugar', 'mixtape', 1), -- Hot Sugar -> Mixtape
    ('hot-sugar', 'aufzundn', 2), -- Hot Sugar -> Aufzundn
    ('hot-sugar', 'lichtfaenger-music', 3), -- Hot Sugar -> Lichtfänger
    ('hulzstoussboum', 'ruescherl-muse', 1), -- Hulzstoussboum -> Rüscherl Muse
    ('hulzstoussboum', 'dezent-boehmisch', 2), -- Hulzstoussboum -> Dezent Böhmisch
    ('hulzstoussboum', 'blechhilfswerk', 3), -- Hulzstoussboum -> Blechhilfswerk
    ('hundskrippln', 'saustoimusi', 1), -- d''Hundskrippln -> Saustoimusi
    ('hundskrippln', 'gaudinockerl', 2), -- d''Hundskrippln -> Gaudinockerl
    ('james-band', 'lichtfaenger-music', 1), -- James Band -> Lichtfänger
    ('james-band', 'onesee', 2), -- James Band -> Onesee
    ('james-band', 'limited-music', 3), -- James Band -> Limited
    ('jive-live', 'gentle-band', 1), -- Jive -> Gentle
    ('jive-live', 'foxy-gentlemen', 2), -- Jive -> Foxy Gentlemen
    ('jive-live', 'limited-music', 3), -- Jive -> Limited
    ('kapelle-quetschnblech', 'froschenkapelle', 1), -- Quetschnblech -> Froschenkapelle
    ('kapelle-quetschnblech', 'muckasaeck', 2), -- Quetschnblech -> Muckasäck
    ('kapelle-quetschnblech', 'blechstreet-boys', 3), -- Quetschnblech -> Blechstreet Boys
    ('kasplattnrocker-band', 'waidler-power', 1), -- Kasplattnrocker -> Waidler-Power
    ('kasplattnrocker-band', 'route1234-band', 2), -- Kasplattnrocker -> Route 12 34
    ('kasplattnrocker-band', 'urwaidler-band', 3), -- Kasplattnrocker -> Urwaidler
    ('katharina-kornprobst', 'freunde-des-brautpaares', 1), -- Katharina Kornprobst -> Freunde des Brautpaares
    ('katharina-kornprobst', 'claudia-dechand', 2), -- Katharina Kornprobst -> Claudia Dechand
    ('katharina-kornprobst', 'claudia-und-ralph', 3), -- Katharina Kornprobst -> Claudia und Ralf
    ('kizzrock', 'geraldino', 1), -- KIZZRock -> Geraldino
    ('kizzrock', 'schlawindl', 3), -- KIZZRock -> Schlawindl
    ('koeniglich-bayrisches-vollgas-orchester', 'mountaincrew-band', 1), -- Königlich Bayrisches Vollgas Orchester -> Mountain Crew
    ('koeniglich-bayrisches-vollgas-orchester', 'rotzloeffl-band', 2), -- Königlich Bayrisches Vollgas Orchester -> Rotzlöffl
    ('lebensgfuehl-duo', 'gruppe-saitenwind', 1), -- Lebensg''fühl -> Saitenwind
    ('lebensgfuehl-duo', 'sabrina-robold', 3), -- Lebensg''fühl -> Sabrina Robold
    ('letsfetz-band', 'getthatmusic-band', 2), -- Let''s Fetz -> GetThat!
    ('letsfetz-band', 'zruck-zu-dir', 3), -- Let''s Fetz -> zruck zu Dir!
    ('lichtfaenger-music', 'james-band', 1), -- Lichtfänger -> James Band
    ('lichtfaenger-music', 'hot-sugar', 2), -- Lichtfänger -> Hot Sugar
    ('limited-music', 'spotlight-eventband', 1), -- Limited -> SPOTLIGHT Eventband
    ('limited-music', 'whoobers', 2), -- Limited -> Whoobers
    ('limited-music', 'onesee', 3), -- Limited -> Onesee
    ('loops-band', 'glory-times', 1), -- Loops -> Glory Times
    ('loops-band', 'myfriendz', 2), -- Loops -> MyfriendZ
    ('loops-band', 'prime-time', 3), -- Loops -> Prime Time
    ('lpc-music', 'birddogs', 1), -- LPC -> Birddogs
    ('lpc-music', '9to5', 2), -- LPC -> 9to5
    ('lpc-music', 'silk-and-sound', 3), -- LPC -> Silk and Sound
    ('max-headroom', 'michael-jackts-net', 1), -- Max Headroom -> Michael Jackts Net
    ('may-vibes', 'lpc-music', 1), -- May Vibes -> LPC
    ('may-vibes', 'birddogs', 2), -- May Vibes -> Birddogs
    ('may-vibes', 'silk-and-sound', 3), -- May Vibes -> Silk and Sound
    ('michael-jackts-net', 'cherry-pink', 1), -- Michael Jackts Net -> Cherry Pink
    ('michael-jackts-net', 'soiznpepper', 2), -- Michael Jackts Net -> Soiz''n''Pepper
    ('michael-jackts-net', 'max-headroom', 3), -- Michael Jackts Net -> Max Headroom
    ('mix2max', '2-unplugged', 1), -- mix2max -> 2 unplugged
    ('mix2max', 'duo-heartline', 2), -- mix2max -> Heartline
    ('mix2max', 'sommerwind-band', 3), -- mix2max -> Sommerwind
    ('mixtape', 'aufzundn', 1), -- Mixtape -> Aufzundn
    ('mixtape', 'hot-sugar', 2), -- Mixtape -> Hot Sugar
    ('mixtape', 'hob-nou', 3), -- Mixtape -> Hob Nou
    ('moosbueffel', 'partyband-bretterboden', 1), -- Moosbüffel -> Bretterboden
    ('moosbueffel', 'sturschaedl-band', 2), -- Moosbüffel -> Sturschädl
    ('moosbueffel', 'baerntreiber-band', 3), -- Moosbüffel -> Bärntreiber
    ('more-candy', 'birddogs', 1), -- More Candy -> Birddogs
    ('more-candy', 'smooth-n-groove', 2), -- More Candy -> Smooth''n''Groove
    ('more-candy', 'silk-and-sound', 3), -- More Candy -> Silk and Sound
    ('mountaincrew-band', 'rotzloeffl-band', 1), -- Mountain Crew -> Rotzlöffl
    ('mountaincrew-band', 'koeniglich-bayrisches-vollgas-orchester', 2), -- Mountain Crew -> Königlich Bayrisches Vollgas Orchester
    ('muckasaeck', 'froschenkapelle', 1), -- Muckasäck -> Froschenkapelle
    ('muckasaeck', 'blechstreet-boys', 2), -- Muckasäck -> Blechstreet Boys
    ('muckasaeck', 'kapelle-quetschnblech', 3), -- Muckasäck -> Quetschnblech
    ('myfriendz', 'loops-band', 1), -- MyfriendZ -> Loops
    ('myfriendz', 'bigbeat-band', 2), -- MyfriendZ -> BigBeat
    ('myfriendz', 'glory-times', 3), -- MyfriendZ -> Glory Times
    ('nice-ties-band', 'woisbois-band', 1), -- Nice Ties -> Wois Bois
    ('nice-ties-band', 'almdoodler', 2), -- Nice Ties -> Almdoodler
    ('nice-ties-band', 'gentle-band', 3), -- Nice Ties -> Gentle
    ('nicks-nice', 'soiznpepper', 1), -- Nick''s Nice -> Soiz''n''Pepper
    ('nicks-nice', 'prime-time', 2), -- Nick''s Nice -> Prime Time
    ('nicks-nice', 'bigbeat-band', 3), -- Nick''s Nice -> BigBeat
    ('non-stop', 'otterbachtaler', 1), -- Non Stop -> Die Ottis
    ('non-stop', 'bigbeat-band', 2), -- Non Stop -> BigBeat
    ('non-stop', 'hatphones-band', 3), -- Non Stop -> Hatphones
    ('oeha-band', 'gaudinudln', 1), -- Ö''ha -> Gaudinudln
    ('oeha-band', 'spitzafknopf-band', 2), -- Ö''ha -> Spitz af Knopf
    ('oeha-band', 'donnaweda', 3), -- Ö''ha -> Donnaweda
    ('onesee', 'bigbeat-band', 1), -- Onesee -> BigBeat
    ('onesee', 'more-candy', 2), -- Onesee -> More Candy
    ('onesee', 'hatphones-band', 3), -- Onesee -> Hatphones
    ('otterbachtaler', 'non-stop', 1), -- Die Ottis -> Non Stop
    ('otterbachtaler', 'bigbeat-band', 2), -- Die Ottis -> BigBeat
    ('otterbachtaler', 'hatphones-band', 3), -- Die Ottis -> Hatphones
    ('out-of-bayern', 'urwaidler-band', 1), -- Out Of Bayern -> Urwaidler
    ('out-of-bayern', 'route1234-band', 2), -- Out Of Bayern -> Route 12 34
    ('out-of-bayern', 'zwiadn-band', 3), -- Out Of Bayern -> De Zwiadn
    ('partyband-bretterboden', 'moosbueffel', 1), -- Bretterboden -> Moosbüffel
    ('partyband-bretterboden', 'sturschaedl-band', 2), -- Bretterboden -> Sturschädl
    ('partyband-bretterboden', 'baerntreiber-band', 3), -- Bretterboden -> Bärntreiber
    ('partybox-trio', '2-unplugged', 1), -- Partybox -> 2 unplugged
    ('partybox-trio', 'hot-sugar', 2), -- Partybox -> Hot Sugar
    ('prime-time', 'glory-times', 1), -- Prime Time -> Glory Times
    ('prime-time', 'spotlight-eventband', 2), -- Prime Time -> SPOTLIGHT Eventband
    ('prime-time', 'edelwuid', 3), -- Prime Time -> Edelwuid
    ('rotzloeffl-band', 'mountaincrew-band', 1), -- Rotzlöffl -> Mountain Crew
    ('rotzloeffl-band', 'koeniglich-bayrisches-vollgas-orchester', 2), -- Rotzlöffl -> Königlich Bayrisches Vollgas Orchester
    ('route1234-band', 'waidler-power', 1), -- Route 12 34 -> Waidler-Power
    ('route1234-band', 'zwiadn-band', 2), -- Route 12 34 -> De Zwiadn
    ('route1234-band', 'kasplattnrocker-band', 3), -- Route 12 34 -> Kasplattnrocker
    ('ruescherl-muse', 'hochdruck-boehmische', 1), -- Rüscherl Muse -> Hochdruck Böhmische
    ('ruescherl-muse', 'dezent-boehmisch', 2), -- Rüscherl Muse -> Dezent Böhmisch
    ('ruescherl-muse', 'boehmisches-verlangen', 3), -- Rüscherl Muse -> Böhmisches Verlangen
    ('rundumadum-band', 'sakrisch-band', 2), -- Rundumadum -> SaKrisch
    ('rundumadum-band', 'groegoetz-weissbir', 3), -- Rundumadum -> Grögötz Weißbir
    ('sabrina-robold', 'freunde-des-brautpaares', 1), -- Sabrina Robold -> Freunde des Brautpaares
    ('sabrina-robold', 'lebensgfuehl-duo', 2), -- Sabrina Robold -> Lebensg''fühl
    ('sabrina-robold', 'claudia-und-ralph', 3), -- Sabrina Robold -> Claudia und Ralf
    ('sakrisch-band', 'rundumadum-band', 1), -- SaKrisch -> Rundumadum
    ('sappralot', 'spotlight-eventband', 1), -- Sappralot -> SPOTLIGHT Eventband
    ('sappralot', 'almdoodler', 2), -- Sappralot -> Almdoodler
    ('saustoimusi', 'gaudinockerl', 1), -- Saustoimusi -> Gaudinockerl
    ('saustoimusi', 'hundskrippln', 2), -- Saustoimusi -> d''Hundskrippln
    ('schlawindl', 'geraldino', 1), -- Schlawindl -> Geraldino
    ('schlawindl', 'kizzrock', 2), -- Schlawindl -> KIZZRock
    ('schlawindl', 'donikkl-crew', 3), -- Schlawindl -> Donikkl Crew
    ('seubersdorfer-blasmusik', 'dezent-boehmisch', 1), -- Seubersdorfer Blasmusik -> Dezent Böhmisch
    ('seubersdorfer-blasmusik', 'hulzstoussboum', 2), -- Seubersdorfer Blasmusik -> Hulzstoussboum
    ('silk-and-sound', 'birddogs', 1), -- Silk and Sound -> Birddogs
    ('silk-and-sound', 'lpc-music', 2), -- Silk and Sound -> LPC
    ('silk-and-sound', '9to5', 3), -- Silk and Sound -> 9to5
    ('simmisamma-band', 'wiesnkoenige', 1), -- SIMMISAMMA -> Wiesnkönige
    ('simmisamma-band', 'd-rieder', 2), -- SIMMISAMMA -> d''Rieder
    ('smooth-n-groove', 'more-candy', 1), -- Smooth''n''Groove -> More Candy
    ('smooth-n-groove', 'silk-and-sound', 2), -- Smooth''n''Groove -> Silk and Sound
    ('smooth-n-groove', 'may-vibes', 3), -- Smooth''n''Groove -> May Vibes
    ('soiznpepper', 'glory-times', 1), -- Soiz''n''Pepper -> Glory Times
    ('soiznpepper', 'prime-time', 2), -- Soiz''n''Pepper -> Prime Time
    ('soiznpepper', 'nicks-nice', 3), -- Soiz''n''Pepper -> Nick''s Nice
    ('sommerwind-band', 'vier-tell-four', 1), -- Sommerwind -> vier-tell-four
    ('sommerwind-band', 'mix2max', 2), -- Sommerwind -> mix2max
    ('sommerwind-band', 'duo-heartline', 3), -- Sommerwind -> Heartline
    ('spectrum-band', 'bigbeat-band', 1), -- Spectrum -> BigBeat
    ('spectrum-band', 'vier-tell-four', 2), -- Spectrum -> vier-tell-four
    ('spitzafknopf-band', 'donnaweda', 1), -- Spitz af Knopf -> Donnaweda
    ('spitzafknopf-band', 'gaudinudln', 2), -- Spitz af Knopf -> Gaudinudln
    ('spitzafknopf-band', 'oeha-band', 3), -- Spitz af Knopf -> Ö''ha
    ('spotlight-eventband', 'sappralot', 1), -- SPOTLIGHT Eventband  -> Sappralot
    ('spotlight-eventband', 'almdoodler', 2), -- SPOTLIGHT Eventband  -> Almdoodler
    ('spotlight-eventband', 'the-silverhammers', 3), -- SPOTLIGHT Eventband  -> The Silverhammers
    ('steffi-heim', 'hochzeitssangerin-mit-herz', 1), -- Steffi Heim -> Hochzeitssängerin MIT HERZ
    ('steffi-heim', 'claudia-dechand', 2), -- Steffi Heim -> Claudia Dechand
    ('steffi-heim', 'katharina-kornprobst', 3), -- Steffi Heim -> Katharina Kornprobst
    ('sturschaedl-band', 'moosbueffel', 1), -- Sturschädl -> Moosbüffel
    ('sturschaedl-band', 'heimatfieber', 2), -- Sturschädl -> Heimatfieber
    ('sturschaedl-band', 'partyband-bretterboden', 3), -- Sturschädl -> Bretterboden
    ('tegernseer-tanzlmusi', 'duanix-musi', 1), -- Tegernseer Tanzlmusi -> Duanix Musi
    ('tegernseer-tanzlmusi', 'urner-musi', 2), -- Tegernseer Tanzlmusi -> Urner Musi
    ('tegernseer-tanzlmusi', 'kapelle-quetschnblech', 3), -- Tegernseer Tanzlmusi -> Quetschnblech
    ('the-silverhammers', 'whoobers', 1), -- The Silverhammers -> Whoobers
    ('the-silverhammers', 'may-vibes', 2), -- The Silverhammers -> May Vibes
    ('the-silverhammers', 'lpc-music', 3), -- The Silverhammers -> LPC
    ('urner-musi', 'tegernseer-tanzlmusi', 1), -- Urner Musi -> Tegernseer Tanzlmusi
    ('urner-musi', 'duanix-musi', 2), -- Urner Musi -> Duanix Musi
    ('urner-musi', 'kapelle-quetschnblech', 3), -- Urner Musi -> Quetschnblech
    ('urwaidler-band', 'vier-tell-four', 1), -- Urwaidler -> vier-tell-four
    ('urwaidler-band', 'route1234-band', 2), -- Urwaidler -> Route 12 34
    ('urwaidler-band', 'froschhaxn-express', 3), -- Urwaidler -> Froschhaxn Express
    ('vier-tell-four', 'sommerwind-band', 1), -- vier-tell-four -> Sommerwind
    ('vier-tell-four', 'urwaidler-band', 2), -- vier-tell-four -> Urwaidler
    ('vier-tell-four', 'prime-time', 3), -- vier-tell-four -> Prime Time
    ('waidler-power', 'route1234-band', 1), -- Waidler-Power -> Route 12 34
    ('waidler-power', 'kasplattnrocker-band', 2), -- Waidler-Power -> Kasplattnrocker
    ('waidler-power', 'otterbachtaler', 3), -- Waidler-Power -> Die Ottis
    ('whoobers', 'the-silverhammers', 1), -- Whoobers -> The Silverhammers
    ('whoobers', 'may-vibes', 2), -- Whoobers -> May Vibes
    ('whoobers', 'more-candy', 3), -- Whoobers -> More Candy
    ('wiesnkoenige', 'simmisamma-band', 1), -- Wiesnkönige -> SIMMISAMMA
    ('woidrocker-band', 'non-stop', 1), -- Die WoidRocker -> Non Stop
    ('woidrocker-band', 'route1234-band', 2), -- Die WoidRocker -> Route 12 34
    ('woidrocker-band', 'kasplattnrocker-band', 3), -- Die WoidRocker -> Kasplattnrocker
    ('woisbois-band', 'nice-ties-band', 1), -- Wois Bois -> Nice Ties
    ('woisbois-band', 'spectrum-band', 2), -- Wois Bois -> Spectrum
    ('woisbois-band', 'vier-tell-four', 3), -- Wois Bois -> vier-tell-four
    ('xploushn', 'baerntreiber-band', 1), -- X''Ploushn -> Bärntreiber
    ('xploushn', 'heimatfieber', 2), -- X''Ploushn -> Heimatfieber
    ('zechpreller-trio', 'mix2max', 1), -- d''Zechpreller -> mix2max
    ('zechpreller-trio', 'heimatgfuehl-duo', 2), -- d''Zechpreller -> Heimatg’fühl
    ('zechpreller-trio', '2-unplugged', 3), -- d''Zechpreller -> 2 unplugged
    ('zruck-zu-dir', 'mixtape', 1), -- zruck zu Dir! -> Mixtape
    ('zruck-zu-dir', 'getthatmusic-band', 2), -- zruck zu Dir! -> GetThat!
    ('zwiadn-band', 'route1234-band', 1), -- De Zwiadn  -> Route 12 34
    ('zwiadn-band', 'kasplattnrocker-band', 2), -- De Zwiadn  -> Kasplattnrocker
    ('zwiadn-band', 'waidler-power', 3) -- De Zwiadn  -> Waidler-Power
)
insert into public.band_relations (
  source_band_id, target_band_id, relation_type, rank, is_manual, reason, confidence_score
)
select
  sb.id, tb.id, 'similar', ip.rank, true, null, null
from import_pairs ip
join public.bands sb on sb.slug = ip.source_slug
join public.bands tb on tb.slug = ip.target_slug
on conflict (source_band_id, target_band_id, relation_type) do nothing
returning source_band_id, target_band_id, rank;
-- Erwartung: 349 zurueckgegebene Zeilen.


-- ------------------------------------------------------------
-- ETAPPE 2: KONTROLLE
-- ------------------------------------------------------------

-- 2.1 Gesamtzahl relation_type='similar' nach Import
select count(*) as total_similar_relations
from public.band_relations
where relation_type = 'similar';
-- Erwartung: 352.

-- 2.2 Donnaweda-Stichprobe: exakt 3 Zeilen, ranks 1-3, reason-Texte erhalten
select
  sb.slug as source_slug, tb.slug as target_slug, tb.name as target_name,
  br.rank, br.is_manual, br.confidence_score, br.reason
from public.band_relations br
join public.bands sb on sb.id = br.source_band_id
join public.bands tb on tb.id = br.target_band_id
where sb.slug = 'donnaweda' and br.relation_type = 'similar'
order by br.rank;
-- Erwartung: 3 Zeilen, ranks 1/2/3, reason JEWEILS NICHT NULL
-- (Quertreiber/Groegoetz Weissbir/Froschhaxn Express mit den bekannten
-- handisch gepflegten reason-Texten -- muessen unveraendert sein).

-- 2.3 Psyco-Dad-Stichprobe: Pruefstein aus dem Preflight-Bericht
select count(*) as psyco_dad_similar_count
from public.band_relations br
join public.bands sb on sb.id = br.source_band_id
where sb.slug = 'psyco-dad' and br.relation_type = 'similar';
-- Erwartung: 0.

-- 2.4 Optional: Hatphones als Ziel
select count(*) as hatphones_as_target
from public.band_relations br
join public.bands tb on tb.id = br.target_band_id
where tb.slug = 'hatphones-band' and br.relation_type = 'similar';
-- Erwartung: 4.

-- 2.5 Optional: Top 10 Source-Bands nach Anzahl Similar-Relationen
select sb.name, sb.slug, count(*) as similar_count
from public.band_relations br
join public.bands sb on sb.id = br.source_band_id
where br.relation_type = 'similar'
group by sb.name, sb.slug
order by similar_count desc, sb.name
limit 10;


-- ------------------------------------------------------------
-- ROLLBACK (nur im Notfall, NICHT aktiv -- auskommentiert)
--
-- Zwei Varianten geprueft:
--
-- Variante A -- ueber dieselbe Import-CTE, minus die 3 Donnaweda-Paare:
--   Muesste die komplette 352-Zeilen VALUES-Liste ein weiteres Mal
--   1:1 reproduzieren und zusaetzlich die 3 Donnaweda-Paare explizit
--   ausschliessen. Risiko: ein Copy-Paste-Fehler beim Reproduzieren der
--   Liste im Rollback-Fall wuerde falsche Zeilen loeschen oder die
--   Donnaweda-Zeilen NICHT sicher aussparen. Nicht gewaehlt.
--
-- Variante B -- scharf ueber die Importsignatur eingegrenzt:
--   Alle von diesem Import erzeugten Zeilen haben is_manual=true UND
--   reason IS NULL. Die 3 Donnaweda-Bestandszeilen haben reason NICHT
--   NULL (handisch gepflegte Texte) und werden dadurch nie getroffen --
--   unabhaengig davon, ob die 352er-Liste sich seither veraendert hat.
--   Robuster, einfacher, kein Bezug auf die VALUES-Liste noetig.
--
-- Gewaehlt: Variante B.
--
-- delete from public.band_relations
-- where relation_type = 'similar'
--   and is_manual = true
--   and reason is null;
-- ------------------------------------------------------------
