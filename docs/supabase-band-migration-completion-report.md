# Supabase Band Migration – Abschlussbericht

**Stand:** 2026-06-01  
**Ergebnis:** Alle 142 aktiven Airtable-Bands wurden vollständig nach Supabase migriert.

---

## 1. Migrationsziel

- Alle aktiven Airtable-Bands nach Supabase migrieren
- `/band/[slug]` soll für jede aktive Band grundsätzlich rendern
- Bilder sollen aus Supabase Storage kommen, nicht direkt von Airtable CDN-URLs
- Airtable bleibt read-only Source of Truth für Banddaten

---

## 2. Finaler Stand

| Kennzahl | Wert |
|---|---|
| Aktive Bands in Supabase | **142** |
| Vollständig mit Daten + Hero-Bild | **142** |
| Ohne Hero-Bild | **0** |
| Verbleibende Airtable-Bands für Migration | **0** |

---

## 3. Verwendete Scripts

### `scripts/migrate-bands.mjs`

**Zweck:** Migriert Kern-Banddaten von Airtable nach Supabase (bands, band_profiles, locations, band_event_types, band_band_types).

**Tabellen:** `bands`, `band_profiles`, `locations`, `band_event_types`, `band_band_types`  
Nicht migriert: `videos`, `social_profiles`, `reference_events`, `band_sound_worlds`, `band_moods`, `band_contacts` (spätere Phasen)

**Wichtige Flags:**

| Flag | Bedeutung |
|---|---|
| `--dry-run` | Analyse ohne Schreiben – immer zuerst ausführen |
| `--execute` | Schreibt in Supabase (erfordert `--confirm-bulk-execute` für Bulk) |
| `--confirm-bulk-execute` | Pflicht für Bulk-Execute ohne `--slug` |
| `--slug=<slug>` | Verarbeitet nur eine Band – kein Confirm nötig |
| `--limit=N` | Maximale Anzahl zu bearbeitender Bands |
| `--skip=a,b,c` | Kommagetrennte Slugs manuell überspringen |
| `--skip-existing-complete` | Überspringt vollständige Supabase-Bands automatisch; `--limit=N` zählt dann die tatsächlich zu bearbeitenden Bands |

**Definition „existing complete":** Ein Supabase-Eintrag gilt als vollständig, wenn `band_profiles` vorhanden ist, `home_location_id` gesetzt ist sowie mindestens eine `band_event_types`- und eine `band_band_types`-Relation existiert. Bilder zählen nicht zur Vollständigkeitsdefinition.

**Sicherheitsmechanismen:**
- Bulk-Execute (`--execute` ohne `--slug`) bricht ab ohne `--confirm-bulk-execute`
- Lookup-Werte werden nie automatisch angelegt (bewusst deaktiviert)
- UPSERT ist idempotent – Doppelläufe erzeugen keine Duplikate

**Typische Nutzung für künftige Updates (neue Band in Airtable):**
```bash
# 1. Dry Run
node scripts/migrate-bands.mjs --dry-run --slug=<neuer-slug>
# 2. Execute
node scripts/migrate-bands.mjs --execute --slug=<neuer-slug>
```

**Typische Nutzung für Batch-Updates:**
```bash
# 1. Dry Run
node scripts/migrate-bands.mjs --dry-run --limit=20 --skip-existing-complete
# 2. Review
# 3. Execute
node scripts/migrate-bands.mjs --execute --limit=20 --skip-existing-complete --confirm-bulk-execute
```

---

### `scripts/migrate-band-images.mjs`

**Zweck:** Lädt Airtable-Attachment-Bilder nach Supabase Storage hoch und schreibt `media_assets`-Einträge.

**Tabellen:** `media_assets`; Storage-Bucket: `band-media`

**Wichtige Flags:**

| Flag | Bedeutung |
|---|---|
| `--dry-run` | Zeigt geplante Uploads ohne Schreiben |
| `--slug=<slug>` | Nur eine Band (empfohlen, Multi-Slug nicht unterstützt) |
| `--limit=N` | Erste N Bands (nur für einfache Fälle) |

**MIME-Type-Handling:** `mimeFrom()` leitet den Content-Type aus dem Airtable-`att.type`-Feld ab. Fehlt dieses, wird er aus der Dateiendung abgeleitet. Unterstützte Formate: WebP, PNG, JPG, GIF, SVG.

**Sicherheitsmechanismen:**
- Pro Slug einzeln ausführen (kein Multi-Skip, kein Blind-Limit)
- Dry Run prüft Storage-Pfade und URL-Struktur vorab
- Script stoppt bei Download-/Upload-Fehlern

**Typische Nutzung:**
```bash
# Dry Run zuerst
node scripts/migrate-band-images.mjs --dry-run --slug=<slug>
# Echter Lauf
node scripts/migrate-band-images.mjs --slug=<slug>
```

---

## 4. Sicherheitsmechanismen – Übersicht

| Mechanismus | Beschreibung |
|---|---|
| `--dry-run` | Kein Schreiben, vollständige Analyse des geplanten Laufs |
| `--execute` allein | Blockiert bei Bulk-Execute ohne `--confirm-bulk-execute` |
| `--confirm-bulk-execute` | Explizite Bestätigung für Batches ohne `--slug` |
| `--skip-existing-complete` | Überspringt vollständige Bands; `--limit` zählt nur processable Bands |
| `--slug=X` | Scope auf eine Band begrenzt; kein Confirm für Execute nötig |
| Bildmigration slug-genau | `migrate-band-images.mjs` immer pro `--slug`, nie mit blindem Limit |
| UPSERT-Logik | Idempotent – kein Datenverlust bei Doppelläufen |
| Lookup-Anlage gesperrt | `--create-missing-lookups` bewusst deaktiviert |

---

## 5. Supabase-Rechte

### service_role (Backend-only, nie an Client weitergeben)

`SELECT, INSERT, UPDATE, DELETE` auf:  
`bands`, `band_profiles`, `locations`, `event_types`, `band_types`, `lineups`, `sound_worlds`, `moods`, `repertoire_styles`, `services`, `band_event_types`, `band_band_types`, `band_lineups`, `band_sound_worlds`, `band_moods`, `band_repertoire_styles`, `band_services`, `band_relations`, `media_assets`, `videos`, `social_profiles`, `reference_events`

### anon (öffentliche Frontend-Queries)

**Nur `SELECT`** auf allen Frontend-relevanten Tabellen (alle Tabellen, die `getBandFromSupabase()` und `getAllBandsFromSupabase()` benötigen).

**Kein Schreibrecht für anon** – verifiziert: HTTP 401 bei INSERT-Versuchen.

### Explizit ausgeschlossen

| Tabelle | Begründung |
|---|---|
| `band_contacts` | Enthält E-Mail und Telefon – kein öffentlicher Zugriff |
| `plz_reference` | Reine Infrastruktur-Tabelle, nicht in Frontend-Queries |

Referenz: `supabase/grant-service-role-permissions.sql`

---

## 6. Bekannte Restfälle / Cleanup-Themen

### Fehlende event_types (Nischen-Typen, ≤ 4 Bands je)

Diese Airtable-Veranstaltungstypen haben kein Supabase-Gegenstück. Bands, die sie verwenden, sind trotzdem renderfähig – die Relationen werden beim nächsten Migrations-Lauf automatisch ergänzt, sobald die Werte geseedet sind.

`Apreski-Party`, `Benefizveranstaltung`, `Club`, `Familiennachmittage`, `Fernsehauftritt`, `Fernsehaufttritte` *(Tippfehler!)*, `Kindergartenfest`, `Schulfest`, `Senioren60+`, `Ski-Opening`, `Theater`, `Vernissage`, `politische Veranstaltung`

**Tippfehler:** `Fernsehaufttritte` (doppeltes `t`) ist in Airtable als solches gespeichert und sollte zusammen mit `Fernsehauftritt` zu einem einzigen Wert zusammengeführt werden. Dies erfordert eine redaktionelle Entscheidung (welcher Name kanonisch ist) und ein SQL-Update auf `band_event_types` + `event_types`.

### Fehlende band_types (Nischen-Typen, ≤ 5 Bands je)

`Backgroundmusic`, `Classic Rock Band`, `Kirchenband`, `Konzert`, `Metal Band`, `Vocal Band`

**Hinweis zu `Konzert`:** Dieser Begriff ist auch als `event_type` vorhanden. Als `band_type` ist er semantisch unklar und wurde bewusst nicht geseedet.

### Österreichische / fehlende Locations

Bands mit österreichischen PLZ (4-stellig) haben keine auflösbare `home_location_id`. Dies ist ein Airtable-Datenqualitätsfall – die Seiten rendern trotzdem korrekt, zeigen aber keine Ortsangabe an.

Betroffene Beispiele: `broadway`, `coverage-band`

### Strukturell unvollständige Bands

Einige Bands tauchen bei zukünftigen `--skip-existing-complete`-Läufen weiterhin als `existing incomplete` auf, weil `band_types` oder `home_location_id` fehlen. Das ist kein Fehler – sie sind vollständig renderfähig und haben Bilder.

---

## 7. Empfehlung für künftige Routine

### Neue Band in Airtable hinzugefügt

```bash
# 1. Dry Run
node scripts/migrate-bands.mjs --dry-run --slug=<slug>

# 2. Daten migrieren
node scripts/migrate-bands.mjs --execute --slug=<slug>

# 3. Bilder migrieren
node scripts/migrate-band-images.mjs --slug=<slug>

# 4. Route prüfen: /band/<slug>
```

### Bestehende Band in Airtable aktualisiert (Texte, Kategorien)

```bash
# UPSERT ist idempotent – einfach erneut ausführen
node scripts/migrate-bands.mjs --execute --slug=<slug>
```

### Bestehende Band – Bilder aktualisiert

```bash
# migrate-band-images.mjs löscht alte Assets für die Band und erstellt neue
node scripts/migrate-band-images.mjs --slug=<slug>
```

### Batch-Review (z. B. nach größeren Airtable-Updates)

```bash
node scripts/migrate-bands.mjs --dry-run --limit=20 --skip-existing-complete
```

---

## 8. Dateien und Commit-Empfehlung

### Committen empfohlen

| Datei | Begründung |
|---|---|
| `scripts/migrate-bands.mjs` | Neues Migrations-Script, produktiv validiert |
| `scripts/migrate-band-images.mjs` | `mimeFrom()`-Fix + Robustheitskorrekturen |
| `supabase/grant-service-role-permissions.sql` | Autorisierte Grants für service_role + anon |
| `supabase/seed-missing-lookups-for-band-migration.sql` | Idempotentes Lookup-Seeding |
| `supabase/setup-grants-and-seed.sql` | Kombiniertes Setup (Grants + Seed), tatsächlich ausgeführt |
| `package.json` | `dotenv@^16` als explizite devDependency hinzugefügt |
| `package-lock.json` | Lockfile-Update |
| `docs/supabase-band-migration-completion-report.md` | Diese Datei |

### Nicht committen

| Datei/Verzeichnis | Begründung |
|---|---|
| `logs/` | Ephemere Migration-Logs, kein dauerhafter Wert |
| `supabase/diagnose-minimal.sql` | Einmaliges Debug-Tool, keine Produktionsrelevanz |
| `supabase/grant-service-role-permissions-v2.sql` | Superseded durch `setup-grants-and-seed.sql` |

### `.gitignore`-Ergänzung empfohlen

```
logs/
```

---

## 9. Nächste sinnvolle Arbeitsschritte

1. **Commit** der oben gelisteten Dateien
2. **`Fernsehaufttritte` → `Fernsehauftritt`** zusammenführen (SQL-Update, nach redaktioneller Freigabe)
3. **Fehlende Nischen-Lookups** bei Bedarf nachseeden (event_types, band_types)
4. **Österreichische Bands / fehlende Locations** in Airtable bereinigen, dann erneut migrieren
5. **Phase 2 der Migration** vorbereiten: `videos`, `social_profiles`, `reference_events` (Daten liegen in Airtable vor, Schema ist in Supabase bereits vorhanden)
