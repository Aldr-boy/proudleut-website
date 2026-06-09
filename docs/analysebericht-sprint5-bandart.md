# Analysebericht Sprint 5 – Bandart-Zuordnung im Admin

**Stand:** 2026-06-09
**Scope:** Achse 1 des Drei-Achsen-Systems — Bandart
**Einschränkung:** Alle Aussagen über die Datenbankstruktur basieren ausschließlich auf
Repo-Dateien (Schema-Files, Seed-Files, Migrations-Dokumentation). Kein aktueller
Live-DB-Dump liegt vor. Wo der Live-DB-Stand nicht verifizierbar ist, ist das
ausdrücklich gekennzeichnet.

---

## 1. Ausgangslage

Proudleut.com baut ein Drei-Achsen-System für die Band-Datenbank. Dieser Bericht
betrifft ausschließlich **Achse 1: Bandart**.

**Fachliches Ziel:**
- Jede Band hat genau eine **primäre Bandart** (Pflicht).
- Optional sind weitere **Sekundär-Zuordnungen** möglich.
- Altwerte aus dem Airtable-Erbe bleiben zunächst sichtbar und sollen später
  **kuratiert im Admin aufgelöst** werden — keine automatische Migration fachlich
  unscharfer Altwerte.
- Die Struktur läuft über eine Junction-Tabelle `band_band_types` mit `is_primary`-Flag.

**Entscheidender Befund:** Laut Repo-Schema sind sowohl die Junction-Tabelle
`band_band_types` als auch der zugehörige Partial Unique Index bereits angelegt.
Sprint 5 ist damit **kein Struktur-Sprint**, sondern primär ein
**Admin-UI- und Daten-Kurationssprint**.

---

## 2. Bestehende Strukturen für Bandarten

### 2.1 `band_types` — Lookup-Tabelle

**Fundstelle:** `supabase/proudleut-schema.sql`, Zeilen 73–82

```
Tabelle: band_types
Spalten:
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
  name        text NOT NULL CHECK (char_length(name) <= 100)
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$')
  description text
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'draft', 'archived'))
  sort_order  integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()
```

**Geseedete Werte (Stand 2026-06-01):**

4 Werte nachgeseedet via `supabase/setup-grants-and-seed.sql` (Zeilen 191–205)
und `supabase/seed-missing-lookups-for-band-migration.sql` (Zeilen 55–67):

| Name | Slug |
|------|------|
| Blasmusik / Wirtshausmusik | `blasmusik-wirtshausmusik` |
| Hochzeitssänger\*in | `hochzeitssaengerin` |
| Akustikband | `akustikband` |
| Kinder- & Jugendband | `kinder-und-jugendband` |

**Nicht geseedete Nischen-Typen:**

`Backgroundmusic`, `Classic Rock Band`, `Kirchenband`, `Konzert`, `Metal Band`,
`Vocal Band`

Fundstelle: `docs/supabase-band-migration-completion-report.md`, Zeilen 155–159

Hinweis zu `Konzert`: Bewusst nicht geseedet — semantisch als `band_type` unklar,
da gleichnamiger `event_type` existiert.

**Vollständiger Live-Bestand von `band_types`:** Nicht verifizierbar ohne aktuellen
Live-DB-Dump. Die Migration (`scripts/migrate-bands.mjs`) hat weitere Werte aus
Airtable übernommen. Deren genaue Anzahl und Bezeichnungen sind aus dem Repo allein
nicht vollständig rekonstruierbar.

### 2.2 `band_band_types` — Junction-Tabelle

**Fundstelle:** `supabase/proudleut-schema.sql`, Zeilen 267–279

```sql
CREATE TABLE band_band_types (
  band_id      uuid NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
  band_type_id uuid NOT NULL REFERENCES band_types(id) ON DELETE CASCADE,
  is_primary   boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (band_id, band_type_id)
);

-- Partial Unique Index (im Repo bereits definiert):
CREATE UNIQUE INDEX one_primary_band_type_per_band
  ON band_band_types (band_id) WHERE is_primary = true;
```

**Constraints im Überblick:**

| Constraint | Detail |
|------------|--------|
| Primary Key | `(band_id, band_type_id)` — Composite |
| FK `band_id` | → `bands(id)` mit `ON DELETE CASCADE` |
| FK `band_type_id` | → `band_types(id)` mit `ON DELETE CASCADE` |
| NOT NULL `is_primary` | `DEFAULT false` — kein NULL-Bypass möglich |
| Partial Unique Index | `(band_id) WHERE is_primary = true` — max. eine Primärzeile pro Band |

**Grants:**
- `service_role`: SELECT, INSERT, UPDATE, DELETE
  Fundstelle: `supabase/setup-grants-and-seed.sql`, Zeile 46
- `anon`: nur SELECT
  Fundstelle: `supabase/setup-grants-and-seed.sql`, Zeile 73

### 2.3 `bands` — Haupttabelle

**Fundstelle:** `supabase/proudleut-schema.sql`, Zeilen 14–26

Kein `band_type`- oder `band_type_id`-Feld auf `bands`. Die Tabelle enthält
ausschließlich: `id`, `name`, `slug`, `status`, `is_published`,
`lineup_flexibility`, `default_member_count`, `home_location_id`, `website_url`,
`created_at`, `updated_at`.

### 2.4 Relevante Seed- und Schema-Stellen (Übersicht)

| Datei | Inhalt |
|-------|--------|
| `supabase/proudleut-schema.sql`, Z. 73–82 | `band_types` CREATE TABLE |
| `supabase/proudleut-schema.sql`, Z. 267–279 | `band_band_types` CREATE TABLE + Index |
| `supabase/setup-grants-and-seed.sql`, Z. 191–205 | 4 `band_types` geseedet |
| `supabase/seed-missing-lookups-for-band-migration.sql`, Z. 55–67 | dieselben 4 Werte (idempotent) |
| `supabase/grant-service-role-permissions.sql` | Grants für service_role und anon |
| `docs/supabase-band-migration-completion-report.md`, Z. 155–159 | nicht geseedete Nischen-Typen |

### 2.5 Frontend-Nutzung (READ — bereits funktionierend)

**`lib/supabase/queries.ts`**, Zeilen 14–15 und 50:
- `getBandFromSupabase`: fetcht `band_band_types ( band_types (*) )`
- `getAllBandsFromSupabase`: fetcht
  `band_band_types ( is_primary, sort_order, band_types ( name, slug ) )`

**`lib/supabase/normalizeBand.ts`**, Zeilen 55–68:
- Sortiert `band_band_types`-Zeilen: `is_primary` zuerst, dann nach `sort_order`
- Produziert `bandartNames: string[]` und `bandartSlugs: string[]`

**`lib/types/band.ts`:**
- `Band`-Type enthält: `bandartNames: string[]`, `bandartSlugs: string[]`,
  `category?: string`

---

## 3. Zwei Quellen der Wahrheit

### Ergebnis: Kein direktes Altfeld auf `bands`

Laut `supabase/proudleut-schema.sql` (Zeilen 14–26) gibt es **kein** `band_type`-
oder `band_type_id`-Feld auf der Tabelle `bands`. Das klassische
„Zwei-Quellen-Problem" (direkte FK-Spalte auf `bands` + parallele Junction)
besteht im Repo-Schema nicht.

**Einschränkung:** Da kein aktueller Live-DB-Dump vorliegt, kann nicht
ausgeschlossen werden, dass die Live-DB durch Ad-hoc-Änderungen im Supabase Studio
vom Repo-Schema abweicht. Dies ist **nicht verifizierbar ohne Live-Dump**.

### Faktischer kritischer Punkt: Datenvollständigkeit der Junction

Nicht ein paralleles Altfeld, sondern der **Live-Befüllungsstand von
`band_band_types`** ist das eigentliche Risiko:

1. **Strukturelle Quelle ist laut Repo `band_band_types`** — korrekt angelegt.
2. **Live-Befüllungsstand unklar** — welche der 142 migrierten Bands haben bereits
   eine oder mehrere `band_band_types`-Zeilen? Nicht verifizierbar ohne Live-Dump.
3. **Fachliche Schärfung nötig** — `band_types` enthält sowohl neue, kuratierte
   Werte als auch ältere Airtable-Erbe-Werte. Welche Altwerte behalten werden,
   welche abgelöst werden, ist eine redaktionelle Entscheidung.

### Offene Designfrage — explizit zu entscheiden

`is_primary boolean NOT NULL DEFAULT false` bedeutet: Eine Band kann technisch
**ohne** primäre Bandart-Zeile existieren. Der Index erzwingt höchstens eine
Primärzeile pro Band, nicht mindestens eine.

Das steht im Widerspruch zum fachlichen Ziel „jede Band hat genau eine primäre
Bandart."

**Offene Entscheidung, die vor Implementierung getroffen werden muss:**
- Soll die primäre Bandart **bei Band-Neuanlage** als Pflichtfeld erzwungen werden?
- Oder sollen Bands zunächst **ohne Bandart angelegt** und später kuratiert
  ergänzt werden dürfen?

Diese Frage wird hier bewusst nicht stillschweigend beantwortet.

---

## 4. Betroffene Admin-Seiten

### 4.1 `app/admin/bands/page.tsx` — Bandübersicht

**Warum betroffen:** Zeigt aktuell Name, Slug, Status, is_published. Für das
kuratierte Durcharbeiten unsicherer Fälle wäre eine Spalte „primäre Bandart"
wertvoll — Bands ohne Eintrag wären sofort erkennbar. Keine funktionale Pflicht
für Sprint 5, aber hohe praktische Relevanz für Kuration.

**Aktuell:** Kein `band_band_types`-Join in der Übersicht.

### 4.2 `app/admin/bands/[id]/page.tsx` — Band-Edit-Seite

**Warum betroffen:** Zentrale Bearbeitungsseite. Hier fehlt das komplette UI für
Bandart-Zuordnungen. Kein aktueller Query auf `band_band_types`, keine Anzeige,
kein Select oder Checkbox für Bandart.

**Referenz im selben File:** Event-Type-UI (Checkbox-Grid, ca. Zeilen 248–321)
zeigt, wie Zuordnungslogik bereits umgesetzt ist. Für Bandart muss das Muster
erweitert werden (→ Abschnitt 6).

### 4.3 `app/admin/bands/[id]/actions.ts` — Server Actions

**Warum betroffen:** Enthält alle Schreiboperationen der Edit-Seite. Bisher keine
Action für `band_band_types`. Eine neue `updateBandBandTypesAction` muss angelegt
werden — mit eigener Transaktionslogik für den Primär-Wechsel (→ Abschnitt 6).

**Referenz:** `updateBandEventTypesAction` (Zeilen 367–435) — kann als Vorlage für
die Diff-Logik dienen, muss aber für den `is_primary`-Constraint angepasst werden.

### 4.4 `app/admin/bands/new/page.tsx` — Band-Neuanlage

**Warum betroffen:** Kein Bandart-Feld im Create-Formular. Ob das ein Pflichtfeld
werden soll, hängt von der offenen Designfrage (→ Abschnitt 3) ab. Bei Pflicht:
`Select` für primäre Bandart einbauen, `createBandAction` entsprechend erweitern.

### 4.5 `app/admin/bands/new/actions.ts` — Create Action

**Warum betroffen:** `createBandAction` legt aktuell nur den `bands`-Eintrag an.
Bei Pflicht-Bandart müsste die Action nach dem `bands`-INSERT auch eine
`band_band_types`-Zeile mit `is_primary = true` anlegen — innerhalb derselben
Transaktion oder zumindest atomar.

---

## 5. Sicherer Migrationspfad

**Vorbemerkung:** Da `band_band_types` und der Partial Unique Index laut Repo-Schema
bereits existieren, ist kein Struktur-Redesign erforderlich. Der Pfad betrifft
ausschließlich die Admin-Nutzung und kuratierte Datenpflege.

### Empfohlene Reihenfolge

**Schritt 1 — Live-DB-Dump bereitstellen (Voraussetzung)**

Prüfen:
- Existiert `band_band_types` und der Index in der Live-DB?
- Welche Bands haben bereits Bandart-Einträge, welche nicht?
- Gibt es `is_primary = true`-Duplikate, die die Admin-Logik blockieren würden?

*Kuratierte Entscheidung erforderlich:* Keine automatische Prüfung kann fachliche
Unsicherheiten auflösen.

**Schritt 2 — Offene Designfrage entscheiden**

Pflichtfeld bei Neuanlage oder nachträgliche Kuration? Diese Entscheidung
bestimmt den Umfang der Änderungen an `new/page.tsx` und `new/actions.ts`.

**Schritt 3 — Admin-UI für `band_band_types` bauen**

Band-Edit-Seite:
- Query für `band_band_types` ergänzen
- UI einbauen (→ Abschnitt 7 für Konzept)
- Neue `updateBandBandTypesAction` schreiben (→ Abschnitt 6 für Transaktionslogik)
- Keine neue parallele Struktur entwerfen — bestehende Junction nutzen

**Schritt 4 — Pro Band primäre Bandart kuratiert setzen**

Über das neue Admin-UI, nicht per Skript. Bands ohne Bandart-Eintrag priorisiert
abarbeiten.

*Kuratierte Entscheidung erforderlich:* Welcher `band_type` für welche Band
fachlich korrekt ist, kann nur redaktionell entschieden werden.

**Schritt 5 — Altwerte kuratiert auflösen**

Ältere Airtable-Erbe-Werte in `band_types` bleiben zunächst erhalten.
`status = 'archived'` erst setzen, wenn keine Band mehr fachlich davon abhängt.

*Kuratierte Entscheidung erforderlich:* Welche Altwerte als veraltet gelten —
keine automatische Archivierung.

**Schritt 6 — Nischen-Typen nachrüsten (bedarfsgesteuert)**

Fehlende Werte (`Backgroundmusic`, `Classic Rock Band` etc.) nur seeden, wenn
konkret Bands damit zugeordnet werden sollen.

**Nicht empfohlen:** Automatische Migration aller Altwerte. Ohne redaktionelle
Prüfung würden semantisch unklare Airtable-Begriffe 1:1 in die neue Struktur
übernommen.

---

## 6. Partial Unique Index: Risiken & Vorbereitung

### Status

**Laut Repo-Schema bereits definiert:**

```sql
CREATE UNIQUE INDEX one_primary_band_type_per_band
  ON band_band_types (band_id) WHERE is_primary = true;
```

Fundstelle: `supabase/proudleut-schema.sql`, Zeilen 277–279

**Nicht verifizierbar:** Ob dieser Index in der Live-DB tatsächlich existiert
(→ Abschnitt 8).

### Welche Datenzustände lassen `CREATE INDEX` fehlschlagen?

Falls der Index in der Live-DB noch nicht existiert und nachträglich angelegt
werden soll:
- Der Index-Aufbau scheitert, wenn mindestens eine `band_id` **mehr als eine**
  Zeile mit `is_primary = true` hat.
- Solche Duplikate müssen vorher bereinigt werden — eine **kuratierte Entscheidung**,
  welche der mehreren Primärzeilen korrekt ist.

### NULL-Risiko

Keines. `is_primary boolean NOT NULL DEFAULT false` lässt NULL nicht zu. Auch
konzeptionell wäre NULL beim Partial Unique Index unkritisch (NULL-Werte werden
vom `WHERE is_primary = true`-Filter ausgeschlossen), aber der Constraint macht
diesen Fall vollständig unmöglich.

### Verhalten bei Admin-Primär-Wechsel

Wenn Band X aktuell `BandType A` als primär hat und zu `BandType B` wechseln soll:

**Problematische Reihenfolge (nicht verwenden):**

1. INSERT `(band_id, BandType_B_id, is_primary=true)`
   → **Index-Verletzung** — `BandType A` ist noch `is_primary=true`

**Sichere Reihenfolge — innerhalb einer Transaktion:**

1. UPDATE `band_band_types SET is_primary = false WHERE band_id = X AND is_primary = true`
2. UPSERT / UPDATE `band_band_types SET is_primary = true WHERE band_id = X AND band_type_id = BandType_B_id`
   (falls `BandType B` noch nicht in der Junction ist: INSERT statt UPDATE)
3. COMMIT

Diese Reihenfolge stellt sicher, dass zu keinem Zeitpunkt innerhalb der Transaktion
zwei Primärzeilen für dieselbe `band_id` existieren.

### Kollisionsgefahr: Das Event-Types-Muster ist nicht direkt übertragbar

**`updateBandEventTypesAction`**, `app/admin/bands/[id]/actions.ts`, Zeilen 367–435:

Das bestehende Muster für Event-Types:
- Berechnet `to_add` (neue IDs) und `to_remove` (zu löschende IDs)
- Führt zuerst INSERT für neue durch, dann DELETE für entfernte
- Kein `delete-all-then-insert`

Dieses Diff-Muster funktioniert für Event-Types, weil es **keinen**
`is_primary`-Constraint gibt.

**Für `band_band_types` bei einem Primär-Wechsel ungeeignet**, weil:
- Ein INSERT mit `is_primary=true` für die neue Primär-Bandart fehlschlägt,
  solange die alte noch `true` hat
- Auch ein reines Diff-INSERT ohne vorheriges Zurücksetzen des alten Primär-Flags
  verletzt den Index

Die neue `updateBandBandTypesAction` muss den Primär-Wechsel **explizit
handhaben**: erst altes Primär-Flag zurücksetzen, dann neues setzen — alles in
einer Transaktion. Das Diff-Muster der Event-Types kann für Sekundär-Zuordnungen
übernommen werden, aber der Primär-Teil braucht eigene Logik.

---

## 7. Admin-UI-Konzept

Nur konzeptionell, kein Code.

### Ziel des UI

Pro Band:
- Genau eine **primäre Bandart** wählbar (Pflichtauswahl, sobald Designfrage
  aus Abschnitt 3 entschieden)
- Optional beliebig viele **Sekundär-Bandarten**
- **Legacy-/Altwert** aus Airtable sichtbar (sofern vorhanden)
- **Divergenz-Hinweis** wenn Altwert und neue Zuordnung auseinanderlaufen
- **Taxonomie-Vorschlag** aus `band-taxonomie-vorschlaege.md` sichtbar (sofern
  für diese Band ein Vorschlag existiert)

### Vorschlag für die Band-Edit-Seite — neuer Abschnitt „Bandart"

**Block 1 — Primäre Bandart**

- Select oder Radio-Group aus allen aktiven `band_types`
- Label: „Primäre Bandart" (Pflichtfeld, markiert)
- Wenn kein Eintrag vorhanden: Feld leer + Hinweistext „Noch nicht zugeordnet"

**Block 2 — Sekundäre Bandarten (optional)**

- Checkbox-Grid aus allen aktiven `band_types`
- Primär ausgewählter Wert ist in den Checkboxen ausgeblendet oder deaktiviert
  (verhindert Doppelbelegung)
- Analog zur bestehenden Event-Types-UI — dieses Muster ist für Sekundär
  direkt übertragbar

**Block 3 — Legacy-Hinweis (schreibgeschützt)**

- Zeigt den alten Airtable-Wert, sofern als `band_type` im System erhalten
- Label: „Airtable-Altwert (nur Referenz, nicht führend)"
- Wenn Altwert ≠ aktueller primärer Wert: farblicher Info-Hinweis
  „Abweichung zum Altwert"

**Block 4 — Taxonomie-Vorschlag (schreibgeschützt)**

- Wenn ein Vorschlag aus `band-taxonomie-vorschlaege.md` für diese Band existiert:
  anzeigen
- Label: „Vorschlag aus Taxonomie-Analyse (nicht verbindlich)"
- Optional: Schaltfläche „Vorschlag als Primäre übernehmen" als Quick-Fill

### Unterschied zum Event-Types-Muster

Das Event-Types-UI ist ein flaches Checkbox-Grid ohne Primär-Unterscheidung.
Bandart braucht darüber hinaus:
- Eine Einzelauswahl (Radio / Select) für den Primär-Wert
- Klare visuelle Trennung zwischen Primär und Sekundär
- Legacy- und Vorschlags-Kontext

### Kuratierter Workflow für unsichere Fälle

Bandübersicht (`app/admin/bands/page.tsx`): Spalte „Bandart" ergänzen:
- „✓" wenn primäre Bandart gesetzt
- „⚠ fehlt" wenn nicht gesetzt — diese Fälle sind dann priorisiert sichtbar

---

## 8. Nicht verifizierbare Punkte

Alle folgenden Punkte können nur durch einen aktuellen Live-DB-Dump oder gezielte
SQL-Abfragen verifiziert werden. Aus dem Repo allein sind sie nicht feststellbar:

| Punkt | Warum nicht verifizierbar |
|-------|--------------------------|
| Ob der Partial Unique Index `one_primary_band_type_per_band` live existiert | Kein `pg_dump` im Repo |
| Welche Bands in der Live-DB bereits `band_band_types`-Einträge haben | Keine Datenauszüge im Repo |
| Ob `is_primary = true`-Duplikate in der Live-DB existieren | Keine Datenauszüge im Repo |
| Ob ein direktes `band_type`-Feld auf `bands` in der Live-DB existiert | Ad-hoc-Änderungen in Supabase Studio möglich |
| Vollständiger aktueller Bestand von `band_types` in der Live-DB | Migration hat weitere Werte aus Airtable übernommen |
| Ob jede aktive Band bereits genau eine primäre Bandart hat | Nur über DB-Abfrage feststellbar |
| Genaue Anzahl der Bands ohne `band_band_types`-Eintrag | Nur über DB-Abfrage feststellbar |
| Ob die Live-DB exakt dem Schema-File entspricht | Kein `pg_dump --schema-only` im Repo |

---

## 9. Klare Empfehlung zum nächsten Schritt

### Befund

Sprint 5 ist **kein Struktur-Sprint**.

Laut Repo-Schema existieren `band_band_types` und der Partial Unique Index bereits.
Es muss keine neue Datenbankstruktur entworfen werden.

Sprint 5 ist ein **Admin-UI- und Daten-Kurationssprint**:
- Bandart-UI in der Band-Edit-Seite bauen
- `updateBandBandTypesAction` schreiben (mit korrekter Primär-Wechsel-Logik)
- Pro Band primäre Bandart kuratiert setzen
- Altwerte sichtbar halten, später schrittweise auflösen

### Voraussetzung vor Implementierungsstart

**Live-DB-Dump bereitstellen.** Ohne ihn können folgende Fragen nicht beantwortet
werden:
- Existiert der Partial Unique Index live?
- Welche Bands sind ohne Bandart-Eintrag?
- Gibt es `is_primary = true`-Duplikate, die die Admin-Logik blockieren würden?

Empfohlene Abfragen in Supabase Studio (kein Tool-Einsatz nötig):

```sql
-- Duplikate prüfen (sollte leer sein wenn Index korrekt greift):
SELECT band_id, count(*)
FROM band_band_types
WHERE is_primary = true
GROUP BY band_id
HAVING count(*) > 1;

-- Bands ohne Bandart-Eintrag:
SELECT b.id, b.name, b.slug
FROM bands b
WHERE NOT EXISTS (
  SELECT 1 FROM band_band_types bbt WHERE bbt.band_id = b.id
)
AND b.status = 'active';
```

### Empfohlene Schritte (in Reihenfolge)

1. **Live-DB-Dump oder gezielte SQL-Abfragen** → Ist-Stand klären
2. **Offene Designfrage entscheiden** → Pflichtfeld bei Neuanlage oder
   nachträgliche Kuration?
3. **Admin-UI für `band_band_types`** auf Band-Edit-Seite bauen
4. **`updateBandBandTypesAction`** mit Primär-Wechsel-Transaktionslogik schreiben
5. **Optional:** Bandübersicht um Bandart-Spalte ergänzen (für kuratiertes
   Durcharbeiten)
6. **Primäre Bandarten** für alle aktiven Bands kuratiert setzen
7. **Nischen-Typen** bei Bedarf nachrüsten
8. **Altwerte** schrittweise archivieren (nach redaktioneller Freigabe)

### Keine parallele Struktur

Nicht empfohlen: ein neues `band_type_id`-Feld auf `bands` oder eine separate
Zwischen-Tabelle einführen. Die vorhandene Junction-Struktur ist korrekt und
vollständig. Sie muss genutzt, nicht ersetzt werden.
