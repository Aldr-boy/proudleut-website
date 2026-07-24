# Musikalisch verortet – Production-Rollout

## 1. Ziel und Scope

Dokumentiert den erfolgreich abgeschlossenen Production-Rollout des Features „Musikalisch verortet" – die musikalische Einordnung aller aktiven Proudleut-Bands als geordnete Chip-Liste. Umfasst: sicheren RPC-Schreibweg, Transaktionstests, Read-only-Verify der Rechte, finalen Datenimport (Katalog + Bandzuordnungen) und abschließende Read-only-Verifikation. Kein Admin-UI, kein Filter, keine SEO-Arbeit – diese bleiben spätere Blöcke.

## 2. Fachlicher Zielstand

- Quelle: `tmp/musikalisch-verortet/musikalisch_verortet_review_final_v2.csv` (lokal, nicht versioniert)
- SHA-256: `d48c041e8f7db1f751b5e5f49bc463c8c51c33f7d958a0bc449707e378594230`
- 141 aktive Bands, 135 mit finaler musikalischer Einordnung, 6 bewusste Empty States, 322 eindeutige aktive Katalogchips, 0 Namens-/Slug-Kollisionen.

## 3. Technisches Modell

- Katalog: `public.repertoire_styles` (id, name, slug, description, status, sort_order)
- Bandzuordnung: `public.band_repertoire_styles` (band_id, repertoire_style_id, sort_order; PK auf beiden Spalten)
- Reihenfolge: `band_repertoire_styles.sort_order` (1-basiert, Array-Position)
- Empty State: keine Relationszeile für die betreffende Band (kein NULL, kein Leerstring)
- Schreibweg: ausschließlich `public.set_band_repertoire_styles(p_band_id uuid, p_repertoire_style_ids uuid[])`

## 4. Sicherheitsmodell

- RPC `SECURITY DEFINER`, fester `search_path = pg_catalog, pg_temp` (bewusst ohne bare `public`, identisch zum bereits etablierten Muster von `fn_set_band_moods.sql`/`fn_set_similar_bands.sql`)
- `EXECUTE` ausschließlich für `service_role`; `PUBLIC`/`anon`/`authenticated` explizit entzogen
- `service_role` besitzt `SELECT` auf `repertoire_styles` und `band_repertoire_styles` (für Preflight/Verify), aber keine direkten `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`-Rechte auf beiden Tabellen – jedes Schreiben läuft durch die validierende RPC

## 5. Manuelle Production-Schritte (tatsächliche Reihenfolge)

1. `supabase/fn_set_band_repertoire_styles.sql` – RPC-Migration
2. `supabase/band_repertoire_styles_transaction_tests.sql` – Transaktionstests
3. `supabase/fn_set_band_repertoire_styles_verify.sql` – Rechte-/Struktur-Verify
4. `supabase/musikalisch_verortet_import_v2.sql` – Datenimport
5. `supabase/musikalisch_verortet_verify_v2.sql` – finales Read-only-Verify

## 6. Production-Ergebnisse

- RPC-Verify: 50/50 Prüfzeilen `match = true`
- Transaktionstests: Erfolgs-Sentinel `ALLE TESTS BESTANDEN -- ERZWUNGENER ROLLBACK` erreicht, sämtliche Teständerungen zurückgerollt; Test für unzulässigen Style-Status (PR007) mangels passendem Production-Datensatz bewusst nicht ausführbar, kein Testobjekt angelegt
- Import: normal beendet mit „Success. No rows returned", 319 neue Katalogeinträge, 134 RPC-Aufrufe, In-Transaction-Endverifikation erfolgreich, kein Retry nötig
- Finales Verify: 643 Prüfzeilen, 643 × `match = true`, 0 × `match = false`
- Bestätigt: 141 aktive Bands / 135 mit Wert / 6 Empty States, Deep Decision exakt „Moderne Kirchenmusik", Donnaweda unverändert korrekt (war bereits identisch, No-op), alle 7 geschützten Referenzbands exakt, die 5 ausgeschlossenen CSV-Bands weiterhin ohne Datensatz, Glory Times (Status `draft`) unangetastet

## 7. Live-Smoke (read-only, gegen die bestehende Production-Deployment-URL)

| Route | Status | Ergebnis |
|---|---|---|
| `/band/donnaweda` | lädt normal | „Volksmusik bis Charts", „Gabalier bis Fliegerlied", „Walzer bis aktuelle Hits" – exakte Reihenfolge |
| `/band/heimatfieber` | lädt normal | genau 1 Chip: „Bayerischer Partysound" |
| `/band/die-haumdaucher` | lädt normal | bewusster Empty State: kein „Musikalisch verortet"-Abschnitt im HTML, kein „undefined"/„null", keine leere Pill, keine kaputte Section |
| `/band/hochdruck-boehmische` | lädt normal | „Ernst Mosch bis Fäaschtbänkler", „Böhmische Klassiker & Eigenkompositionen", „Blasmusik mit Partyeinlage" – exakte Reihenfolge, keine erkennbare Textabschneidung |

Visueller Browser-Check (Desktop/Mobile-Viewport) war in dieser Umgebung nicht mit einem vorhandenen Werkzeug möglich – siehe Parkliste.

## 8. Versionierte SQL-Artefakte

- `supabase/fn_set_band_repertoire_styles.sql`
- `supabase/band_repertoire_styles_transaction_tests.sql`
- `supabase/fn_set_band_repertoire_styles_verify.sql`
- `supabase/musikalisch_verortet_import_v2.sql`
- `supabase/musikalisch_verortet_verify_v2.sql`

## 9. SHA-256 der tatsächlich ausgeführten/verifizierten Fassungen

(berechnet unmittelbar vor der reinen Nachdokumentation der Ausführungsvermerke; die ausführbare SQL-Logik dieser Dateien ist danach unverändert geblieben)

| Datei | SHA-256 |
|---|---|
| `fn_set_band_repertoire_styles.sql` | `4d2ebdabcccc3b3827be5ae946fa4e74612372db3c337feab7551ac550afe995` |
| `band_repertoire_styles_transaction_tests.sql` | `eccc728185ce57f4e2ce5a65b1b1b41a150f905f2702fd0714b7146d500d3737` |
| `fn_set_band_repertoire_styles_verify.sql` | `7feee54ec899e2034b3b195ad631e6c525f362bf2e76e0202ea40cab365c8691` |
| `musikalisch_verortet_import_v2.sql` | `41b28988660f7ef1fcb86ad7cf5a0752eefb0e1e512bcc687cf4e3e674df298f` |
| `musikalisch_verortet_verify_v2.sql` | `59f4c597888439ac79e11fbc7336886ef18b4013348c1c452f0c8e94794d406c` |

## 10. B-Parkliste (nicht bearbeitet)

- Visueller Desktop-/Mobile-Browser-Check der vier Bandseiten (kein Browser-Werkzeug in dieser Umgebung verfügbar; HTML-/Response-Smoke wurde vollständig durchgeführt)
- Weitere Bandseiten-Stichproben über die vier geprüften hinaus
- Admin-Pflege des `repertoire_styles`-Katalogs
- Filter- und Suchfacette auf Basis von „Musikalisch verortet"
- SEO-Einsatz der Chips
- Beschreibungen (`description`) für die 322 Katalogeinträge
- Zusammenführung semantisch ähnlicher, aber nicht identischer Chips
- Bereinigung historischer, breiter Grant-Dateien (`grant-service-role-permissions*.sql`, `setup-grants-and-seed.sql`)
