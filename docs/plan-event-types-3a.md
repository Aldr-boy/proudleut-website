# Plan: Neue Event-Types anlegen – Block 3A

> **Pausiert seit 2026-06-13:** Dieser Insert-Plan ist fachlich korrekt, wird aber vorerst nicht ausgeführt. Der Sichtbarkeitsbefund in `docs/befund-event-type-sichtbarkeit.md` hat gezeigt, dass ein reiner Supabase-Insert die neuen Event-Types zwar im Admin verfügbar machen würde, öffentlich aber nicht vollständig sichtbar macht und auf Banddetailseiten 404-Links erzeugen kann, solange kein passender `CATEGORIES`-Eintrag existiert. Vor dem Insert soll zuerst die Chip-Linking-Logik defensiv abgesichert werden.

**Stand:** 2026-06-13  
**Status:** Read-only Plan — noch keine Supabase-Schreiboperation durchgeführt  
**Basis:** [`docs/event-type-redaktionsentscheidungen.md`](event-type-redaktionsentscheidungen.md), Section 2

---

## Geplante Event-Types

Vier neue öffentliche Event-Types gemäß redaktionellen Entscheidungen in Phase 2:

| name | slug |
|---|---|
| Kinder- & Familienevent | kinder-und-familienevent |
| Benefizveranstaltung | benefizveranstaltung |
| Vernissage | vernissage |
| Club | club |

**Explizit ausgeschlossen (separater Sprint):** Trauerfeier & Zeremonie

---

## Schema-Befund

Geprüft gegen `supabase/proudleut-schema.sql`, Tabelle `event_types`:

| Spalte | Typ | Pflicht | Constraint | Bemerkung |
|---|---|---|---|---|
| `id` | uuid | auto | PRIMARY KEY, DEFAULT gen_random_uuid() | — |
| `name` | text | ja | CHECK char_length <= 100; **kein UNIQUE** | Duplikat-Name wäre technisch möglich |
| `slug` | text | ja | NOT NULL UNIQUE; CHECK `^[a-z0-9-]+$` | Einziger DB-Uniqueness-Schutz |
| `parent_id` | uuid | nein | REFERENCES event_types(id) ON DELETE SET NULL | NULL für alle vier Typen |
| `description` | text | nein | — | NULL für alle vier Typen |
| `status` | text | ja | DEFAULT 'active'; CHECK IN ('active','draft','archived') | Default reicht |
| `sort_order` | integer | ja | DEFAULT 0; CHECK >= 0 | Wird empfohlen: 0 |
| `created_at` | timestamptz | auto | DEFAULT now() | — |
| `updated_at` | timestamptz | auto | DEFAULT now() | — |

**Hinweis zu `name`:** Die DB erzwingt keinen UNIQUE auf `name` — nur auf `slug`. Die Prüfung auf Namens-Duplikate ist daher Betreiber-Verantwortung, nicht DB-Constraint.

---

## Admin-Ladeverhalten

`app/admin/bands/[id]/page.tsx` lädt Event-Types so:

```typescript
client
  .from('event_types')
  .select('id, name, sort_order')
  .eq('status', 'active')
  .order('sort_order', { ascending: true })
  .order('name', { ascending: true })
```

**Konsequenz:** Neue Typen mit `status = 'active'` erscheinen im Admin **automatisch** nach dem INSERT. Kein Code-Change nötig.

---

## Slug-Format-Check

Constraint: `^[a-z0-9-]+$` (nur Kleinbuchstaben, Ziffern, Bindestriche)

| slug | Zeichen | Constraint erfüllt |
|---|---|---|
| `kinder-und-familienevent` | a–z, Bindestrich | ✓ |
| `benefizveranstaltung` | a–z | ✓ |
| `vernissage` | a–z | ✓ |
| `club` | a–z | ✓ |

**Hinweis:** Der Anzeigename `Kinder- & Familienevent` enthält `&` und `-` — im Slug wird `&` zu `und` und `-` bleibt als Bindestrich. Slug ist korrekt: `kinder-und-familienevent`.

---

## Konfliktcheck (Stand vor INSERT)

Geprüft: aktuelle Supabase-Datenbank via Schreibrechte-freiem `select`.

| Typ | Name-Konflikt | Slug-Konflikt | Ähnliche Treffer |
|---|---|---|---|
| Kinder- & Familienevent | nein | nein | keine |
| Benefizveranstaltung | nein | nein | keine |
| Vernissage | nein | nein | keine |
| Club | nein | nein | keine |

Alle vier Typen können konfliktfrei angelegt werden.

---

## Sort-Order-Analyse

Aktuelle Verteilung in der DB:

| sort_order | Anzahl Typen | Bedeutung |
|---|---|---|
| 0 | 28 | Standard-Bucket; in Admin alphabetisch nach `name` sortiert |
| 1 | 2 | (Hochzeit, Gründungsfest) |
| 2 | 2 | (Festzelt, Volksfest) |
| 3 | 2 | (Firmenfeier & Business Event, Kirchweih) |
| 4 | 2 | (Dult, Fasching) |
| 5 | 1 | (Oktoberfest) |
| 6 | 1 | (Bürgerfest) |

**Empfehlung: `sort_order = 0`** für alle vier neuen Typen.

Begründung: Kinder- & Familienevent, Benefizveranstaltung, Vernissage und Club sind Nischentypen ohne eigene Priorisierung. Die sort_order 1–6 sind reserviert für Festzelt-Detailtypen und besonders prominente Haupttypen aus dem Donnaweda-Kontext. Neue Nischentypen gehören in den alphabetischen Standard-Bucket.

---

## Insert-Vorschau

Die vier Datensätze, die per INSERT angelegt werden sollen:

| name | slug | status | sort_order | parent_id | description |
|---|---|---|---|---|---|
| Kinder- & Familienevent | kinder-und-familienevent | active | 0 | null | null |
| Benefizveranstaltung | benefizveranstaltung | active | 0 | null | null |
| Vernissage | vernissage | active | 0 | null | null |
| Club | club | active | 0 | null | null |

`id`, `created_at`, `updated_at` werden von Supabase automatisch generiert.

**Als SQL** (zur manuellen Prüfung, noch nicht ausgeführt):

```sql
INSERT INTO event_types (name, slug, status, sort_order)
VALUES
  ('Kinder- & Familienevent', 'kinder-und-familienevent', 'active', 0),
  ('Benefizveranstaltung',    'benefizveranstaltung',    'active', 0),
  ('Vernissage',              'vernissage',              'active', 0),
  ('Club',                   'club',                    'active', 0);
```

---

## Offene Fragen vor der Umsetzung

1. **Anzeigename `Kinder- & Familienevent`:** Das Sonderzeichen `&` im `name`-Feld ist technisch erlaubt (kein UNIQUE, kein Format-Constraint auf `name`). Redaktionell ist der Name so entschieden. Kein Blocker.

2. **`parent_id` = null für alle vier:** Die Hierarchie-Funktion im Schema ist vorbereitet, aber alle bestehenden Typen haben `parent_id = null`. Konsistenz gewahrt.

3. **Kein UNIQUE auf `name`:** Ein versehentlicher Doppel-INSERT mit gleichem Namen würde die DB nicht blockieren (nur Slug würde duplizieren und scheitern). Prüfung beim INSERT sinnvoll.

4. **Trauerfeier & Zeremonie:** Explizit ausgeschlossen aus diesem Block. Separater Sprint mit eigener Konflikt- und Tonfall-Prüfung.

5. **`Geistliche Anlässe`-Zuordnung (1 Band AT):** Muss händisch geprüft und vor dem Go-Live zu einem der bestehenden Typen zugeordnet werden. Kein Blocker für diesen Insert-Block.

6. **Wann ist der richtige Moment für den INSERT?** Erst wenn die öffentlichen Kategorie-Seiten diese Typen auch abbilden — sonst erscheinen sie im Admin als auswählbar, sind aber auf der Seite nicht auffindbar.

---

## Abgrenzung

Dieses Dokument ist ein Read-only-Plan. Es wurde:

- **kein INSERT** ausgeführt
- **kein UPDATE** ausgeführt
- **kein Supabase-Schreibzugriff** durchgeführt
- **kein Commit** angelegt (Datei bleibt untracked)
- **keine Airtable-Schreiboperation** durchgeführt
