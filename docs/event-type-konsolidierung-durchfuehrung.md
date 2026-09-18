# Event-Type-Konsolidierung — Durchführungsprotokoll

Bezug: Bestandschecks in dieser Session (nicht als Datei versioniert, siehe Chat-Verlauf) — Analysebericht + Korrektur zum nativen Anfragesystem. Owner-Freigabe für die unten beschriebenen Änderungen liegt vor.

**Status dieser Datei:** wird in zwei Schritten befüllt — zuerst der Plan (vor Ausführung), danach das tatsächliche Ergebnis (nach Ausführung). Beide Abschnitte bleiben stehen, damit Vorher/Nachher nachvollziehbar ist.

## 1. Umgebung

- Repository-Commit zum Zeitpunkt der Ausführung: `1152dc7242922684f1e11ccab6103618eb4d0e4a` (`main`)
- Supabase-Projekt: `bfyucjjyarvqeftqqihm.supabase.co` (dasselbe Projekt, das auch die live erreichbare Seite bedient — kein separates Testprojekt)
- Zugriff: `SUPABASE_SERVICE_ROLE_KEY` aus `.env.local`, ausschließlich über die bereits bestehenden, produktiv genutzten RPCs (keine neuen Funktionen, keine neuen Grants)
- Vor Ausführung wurde der Datenstand erneut mit dem letzten Bestandscheck abgeglichen: `event_types` (46 Zeilen) und `band_event_types` (1000 Zeilen) waren **byte-identisch** zum zuletzt geprüften Stand — kein Drift, keine zwischenzeitlichen Änderungen.

## 2. Sicherung

Vollständige Sicherung der 13 betroffenen `event_types`-Zeilen (id, name, slug, status, parent_id, anfrage_label, sort_order, Zeitstempel) sowie aller zugehörigen `band_event_types`-Zuordnungen (band_id, Name, Slug, Status) **vor** jeder Schreiboperation:

→ [`supabase/backups/event_types_consolidation_2026-09-18_pre.json`](../supabase/backups/event_types_consolidation_2026-09-18_pre.json)

### Wiederherstellung (manuell, falls jemals nötig)

Diese Sicherung ist eine reine Datenmomentaufnahme, kein automatisches Rollback-Skript (identisches Prinzip zu bestehenden `supabase/*.sql`-Migrationen in diesem Repo: kein automatisierter Rückbau, nur eine dokumentierte, manuell auszuführende Anleitung). Wiederherstellung falls nötig:

1. Für jede Zeile in `event_types` aus der Sicherung: `status`, `name`, `anfrage_label` auf den gesicherten Wert zurücksetzen (z. B. über `update_event_type`/`reactivate_event_type`, oder direkt über die `id`).
2. Für jeden Eintrag in `band_event_types_by_slug`: die dort gelistete Band-ID-Menge exakt für diesen `event_type_id` wiederherstellen (`update_event_type_band_assignments` mit den fehlenden IDs als `p_add_band_ids`, und jeder aktuell vorhandenen, aber in der Sicherung nicht enthaltenen Zuordnung als `p_remove_band_ids`).
3. Keine Wiederherstellung für unbeteiligte Event-Types/Bands nötig — diese wurden nie verändert.

## 3. Plan (vor Ausführung geprüft, exakte IDs)

| Gruppe | Ziel (ID/Slug unverändert) | neuer Name | Add-Liste (Band-IDs) | Erwartete Zielsumme |
|---|---|---|---|---|
| Ball & Gala | `ball` (`163aefc8-ba73-428c-a3be-be06ef51aa4d`) | „Ball & Gala" | The Silverhammers (`96aa49dc-…`), BigBeat (`180c5296-…`), Lichtfänger (`2ea3f8c2-…`) | 19 + 3 = **22** |
| Empfang & Dinner | `empfang` (`787c536a-bd77-4037-b1ed-9c88cc012948`) | „Empfang & Dinner" | 4 Bankett-exklusive Bands (5toBeat, Bigband STEINBACH, Silk and Sound, Soiz'n'Pepper) | 12 + 4 = **16** |
| Stadt- und Bürgerfest | `stadt-und-buergerfest` (`5506c9e2-f803-421c-9659-76d0220a0c38`) | unverändert | 12 Bürgerfest-exklusive Bands | 73 + 12 = **85** |
| private Feiern | `private-feiern` (`4165cc4e-e49f-4d9b-a8c4-31bf0f2999aa`) | unverändert | 13 exklusive-Privatfeiern-exklusive Bands | 37 + 13 = **50** |

Quellen, die anschließend vollständig geleert und archiviert werden: `gala`, `abschlussfeier`, `bankett`, `buergerfest`, `exklusive-privatfeiern`.

Ohne Bandumhängen, nur leeren + archivieren: `geistliche-anlaesse` (0 Zuordnungen), `benefizveranstaltung` (0 Zuordnungen), `award-show` (4 Zuordnungen entfernen), `ehrenabende` (4 Zuordnungen entfernen — Böhmisches Verlangen und Dezent Böhmisch verlieren dadurch bewusst und akzeptiert ihre einzige Gala-Sichtbarkeit, keine Ersatzzuordnung).

Vollständige exakte Band-ID-Listen je Schritt: [`supabase/backups/event_types_consolidation_2026-09-18_pre.json`](../supabase/backups/event_types_consolidation_2026-09-18_pre.json) (Ist-Zustand vor Ausführung, daraus sind alle Add-/Remove-Mengen deterministisch ableitbar).

### Reihenfolge je Gruppe (Sicherheitsregel: Ziel-Add vor Quell-Remove vor Archivierung)

1. `update_event_type` (nur bei Ball/Empfang: Namensänderung)
2. `update_event_type_band_assignments(ZIEL, add=[…], remove=[])`
3. `update_event_type_band_assignments(QUELLE, add=[], remove=[alle bisherigen QUELLE-Bands])`
4. `archive_event_type(QUELLE)`

Diese Reihenfolge ist zwingend, weil `update_event_type_band_assignments` für einen nicht-leeren Diff `status='active'` auf dem behandelten Typ voraussetzt (Fehlercode `EB004`) — eine bereits archivierte Quelle könnte nicht mehr geleert werden.

## 4. Ergebnis (nach Ausführung)

Ausgeführt am 2026-09-18 gegen `bfyucjjyarvqeftqqihm.supabase.co`, ausschließlich über die bestehenden RPCs `update_event_type`, `update_event_type_band_assignments`, `archive_event_type` (keine neuen Funktionen, keine neuen Grants, keine direkte Tabellenschreibung). Vollständiges Aufruf-Protokoll (jeder einzelne Request + Response): [`supabase/backups/event_types_consolidation_2026-09-18_execution_log.json`](../supabase/backups/event_types_consolidation_2026-09-18_execution_log.json). Verifizierter Endzustand (korrekt paginiert): [`supabase/backups/event_types_consolidation_2026-09-18_post.json`](../supabase/backups/event_types_consolidation_2026-09-18_post.json).

### Während der Ausführung entdeckter und behobener Fehler

Der zu Beginn dieses Auftrags gelesene Gesamtbestand von `band_event_types` (aus den vorangegangenen Bestandschecks sowie der Pre-Sicherung dieses Auftrags) wurde über einen ungefilterten Bulk-Read ermittelt. Der damalige tatsächliche Gesamtbestand lag bei 1103 Zeilen — oberhalb der stillen PostgREST-Standardgrenze von 1000 Zeilen pro Antwort ohne explizite Paginierung. Dadurch waren die in beiden vorherigen Bestandscheck-Berichten genannten Bandzahlen für mehrere Event-Types zu niedrig, teils auch für gar nicht angefasste.

Für die eigentlichen Schreiboperationen war das nur dort real relevant, wo eine **vorab aus dem trunkierten Bestand berechnete** Add-Liste verwendet wurde. Alle Remove-Operationen und alle "ist X bereits im Ziel"-Prüfungen liefen dagegen als gezielte, auf einen einzelnen `event_type_id` gefilterte Live-Abfragen und waren dadurch selbst nicht trunkierungsanfällig. Nach Abschluss aller 13 Gruppen wurde deshalb zusätzlich eine vollständige, korrekt paginierte Gegenprüfung durchgeführt (jede tatsächlich aus einer Quelle entfernte Band-ID gegen den tatsächlichen Endbestand des jeweiligen Ziels).

**Befund:** Bürgerfest hatte tatsächlich 31 statt der gemeldeten 24 Zuordnungen. 29 davon waren korrekt erfasst; **Rundumadum und Froschenkapelle fehlten im ursprünglichen Add-Set für Stadt- und Bürgerfest**, wurden aber bereits (korrekt) aus Bürgerfest entfernt, bevor der Fehler auffiel. Sofort nachträglich per `update_event_type_band_assignments` ergänzt, **vor** dem Archivieren von `buergerfest`. Nach der Korrektur: 0 verbleibende Lücken in allen vier Merge-Gruppen, bestätigt durch erneute vollständige Gegenprüfung.

Alle anderen scheinbaren Abweichungen von den ursprünglich erwarteten Zahlen (Empfang & Dinner: exakt 16 wie erwartet; private Feiern: exakt 50 wie erwartet; Ball & Gala: exakt 22 wie erwartet) waren **nicht** von diesem Fehler betroffen — dort deckte sich die vorab berechnete Liste zufällig mit dem echten Bestand.

### Tatsächliche Endzahlen (verifiziert, korrekt paginiert)

| Ziel | erwartet lt. Auftrag | tatsächlich |
|---|---|---|
| Ball & Gala (`ball`) | 22 | **22** |
| Empfang & Dinner (`empfang`) | 16 | **16** |
| Stadt- und Bürgerfest (`stadt-und-buergerfest`) | 85 | **89** (Abweichung ausschließlich durch den oben beschriebenen, jetzt behobenen Zählfehler in der Vorabanalyse — kein Datenverlust, sondern zwei zuvor nicht sichtbare, jetzt korrekt ergänzte Bands) |
| private Feiern (`private-feiern`) | 50 | **50** |

Alle neun Quelltypen archiviert, 0 verbleibende Bandzuordnungen: `gala`, `abschlussfeier`, `bankett`, `buergerfest`, `exklusive-privatfeiern`, `geistliche-anlaesse`, `benefizveranstaltung`, `award-show`, `ehrenabende`.

`ball` trägt jetzt `name = "Ball & Gala"`, `empfang` trägt `name = "Empfang & Dinner"` — jeweils `id`, `slug`, `anfrage_label` (beide weiterhin `null`, Fallback auf `name` greift) unverändert.

Bewusst nicht automatisch übertragen (Owner-Entscheidung): 2 bislang nur unter `gala` geführte Bands (2 unplugged, **Loops** — letztere Band war durch denselben Zählfehler bislang nicht bekannt/gemeldet) sowie 9 bislang nur unter `abschlussfeier` geführte Bands verlieren diese Zuordnung ersatzlos, ohne in `ball` zu erscheinen. Keine der betroffenen Bands steht dadurch ohne jede Event-Type-Zuordnung da (einzeln geprüft).
