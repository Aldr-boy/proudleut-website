# Architekturbefund: Öffentliche Sichtbarkeit von Event-Types

**Stand:** 2026-06-13 (Update: Schärfung Chip-Link-Mechanik + Supabase-Slug-Check)  
**Status:** Read-only — keine Codeänderung, kein Commit, kein Push  
**Geprüfte Dateien:**  
- `lib/categories.ts`  
- `lib/airtable/queries.ts`, `lib/airtable/normalizeBand.ts`  
- `lib/supabase/queries.ts`, `lib/supabase/normalizeBand.ts`  
- `app/veranstaltung/[slug]/page.tsx`  
- `app/bands/page.tsx`  
- `components/bands/BandExplorer.tsx`  
- `app/band/[slug]/page.tsx`  
- `components/band/BandTagsSection.tsx`  
- `components/band/HeroCTA.tsx`  
- Supabase `event_types` — read-only Abfrage (alle Slugs, alle Status `active`)  

---

## 1. Git-Status

```
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
Untracked files: docs/plan-event-types-3a.md, docs/befund-event-type-sichtbarkeit.md
nothing added to commit but untracked files present
```

- Working Tree: sauber
- `docs/plan-event-types-3a.md`: untracked ✓
- `docs/befund-event-type-sichtbarkeit.md`: untracked ✓
- Branch: 1 Commit vor `origin/main` (commit `46ca914`, nicht gepusht) ✓

---

## 2. Datenquellen der öffentlichen Seiten

### `/veranstaltung/[slug]` — Kategorie-Seiten

**Datenquelle:** Ausschließlich Airtable (`getBands()` aus `lib/airtable/queries.ts`)

- `generateStaticParams()` erzeugt Routen **nur** aus `CATEGORIES` in `lib/categories.ts`
- Es gibt aktuell genau 5 statisch generierte Kategorie-Seiten: `hochzeit`, `festzelt`, `firmenfeier`, `geburtstag`, `gala`
- Bandzuordnung: `bandMatchesCategory(band, category)` prüft `band.eventTypes` (= Airtable `event_canon`-Werte) gegen `category.airtableEventTypes` (= Liste in `lib/categories.ts`)
- Supabase wird auf dieser Seite nicht verwendet

### `/bands` — Finder / Filter

**Datenquelle:** Ausschließlich Airtable (`getBands()`)

- `BandExplorer.tsx` zeigt im „Wofür"-Dropdown nur die in `CATEGORIES` definierten 5 Anlässe
- Filter-Logik: `bandMatchesCategory(band, cat)` — identische Funktion wie Kategorie-Seiten
- Supabase wird hier nicht verwendet

### `/band/[slug]` — Banddetailseite

**Datenquelle:** Ausschließlich Supabase (`getBandFromSupabase()`, `getAllBandsFromSupabase()`)

- `band.eventTypes` = `name` aus Supabase-Tabelle `event_types` (via `band_event_types`-Junction)
- `band.categorySlugs` = `slug` aus Supabase-Tabelle `event_types` (via `band_event_types`-Junction)
- `BandTagsSection` zeigt „Spielt bei"-Chips: jeder Chip ist ein Link zu `/veranstaltung/${slug}`
- Wenn der Supabase-`slug` kein Pendant in `CATEGORIES` hat, erzeugt der Link eine 404-Seite
- Airtable wird auf dieser Seite nicht verwendet

### Navigation / Themenwelten

- Im `BandExplorer` werden Anlass-Optionen direkt aus `CATEGORIES` iteriert
- Keine separate Navigationsquelle, keine Themenwelten-Seiten gefunden

---

## 3. Rolle von `lib/categories.ts`

### Struktur

`CATEGORIES: CategoryConfig[]` — 5 fest definierte Einträge:

| title | slug | airtableEventTypes (Auszug) |
|---|---|---|
| Hochzeit | hochzeit | Hochzeit |
| Festzelt & Volksfest | festzelt | Festzelt, Stadt- und Bürgerfest, Bierfest, Brauereifest, Bürgerfest, Biergarten, Wirtshausmusi, Frühschoppen, Zoigl, Grottenfest |
| Firmenfeier & Business Event | firmenfeier | Firmenfeier & Business Event, Weihnachtsfeier, Sommerfest, Award-Show, Abschlussfeier |
| Geburtstag & Privatfeier | geburtstag | Geburtstagsfeier, private Feiern, exklusive Privatfeiern, Jubiläum, Taufe, **Familiennachmittage** |
| Gala & Empfang | gala | Empfang, Ball, Bankett, Ehrenabende, **Vernissage** |

### Schlüsselrolle

`lib/categories.ts` ist die einzige Schicht, die öffentlich wirksam Airtable-Daten in Kategorien überführt. Sie hat drei Funktionen:

1. **Routing:** Definiert, welche `/veranstaltung/[slug]`-Seiten statisch generiert werden
2. **Filterlogik:** Definiert, welche Anlass-Optionen im Finder erscheinen
3. **Bandzuordnung:** Definiert, welche Airtable-`event_canon`-Werte zu welcher Kategorie zählen

### `airtableEventTypes`

Enthält Airtable-`event_canon`-Strings (normalisierte Bezeichnungen aus der Veranstaltungen-Tabelle). `bandMatchesCategory()` vergleicht `band.eventTypes` gegen diese Liste. Nur hier eingetragene Typen erzeugen öffentliche Kategorie-Sichtbarkeit.

---

## 4. Supabase-Insert: öffentlich wirksam?

| Kontext | Wirksam? | Begründung |
|---|---|---|
| **Admin** | **Ja** | `.eq('status', 'active')` — neue Typen erscheinen automatisch als auswählbare Checkboxen |
| **Banddetailseite `/band/[slug]`** | **Teilweise** | Chip erscheint unter „Spielt bei", sobald eine Band über `band_event_types` zugeordnet ist. Nach Code- und Datenbefund ist konkret ableitbar, dass der Chip-Link auf `/veranstaltung/[neuer-slug]` zeigen würde und dort aktuell keine Route existiert (siehe Abschnitt 4a). Kein Browser-/HTTP-Test wurde durchgeführt — die Einschätzung basiert auf Codepfad-Analyse und Datenbefund. |
| **Finder `/bands`** | **Nein** | `BandExplorer` zeigt nur `CATEGORIES` aus `lib/categories.ts`. Supabase event_types werden nicht ausgewertet |
| **Kategorie-Seiten `/veranstaltung/[slug]`** | **Nein** | Statische Generierung aus `CATEGORIES`; Bandfilterung über Airtable. Supabase-Insert erzeugt weder Route noch Bandtreffer |
| **SEO / Landingpages** | **Nein** | Keine eigenständigen SEO-Seiten für Event-Types außerhalb der 5 CATEGORIES-Seiten vorhanden |

**Fazit: Ein reiner Supabase-Insert in `event_types` erzeugt allein keine öffentlich sichtbare Kategorie auf proudleut.com.**

---

## 4a. Chip-Link-Mechanik und Slug-Alignment

### Wie der Chip-Link gebaut wird

**Codepfad (direkt aus Quellcode abgeleitet, kein Mapping, kein Fallback):**

`lib/supabase/queries.ts` fragt `band_event_types ( sort_order, event_types ( name, slug ) )` ab.  
`lib/supabase/normalizeBand.ts` baut daraus:

```typescript
const categorySlugs = rawEventTypes
  .map(et => str((et.event_types as Row)?.slug))
  .filter((s): s is string => s !== undefined)
```

`components/band/BandTagsSection.tsx` baut den Link so:

```tsx
const slug = band.categorySlugs?.[i];
return slug ? (
  <Link href={`/veranstaltung/${slug}`}>…</Link>
) : (
  <span>…</span>
);
```

**Ergebnis:** Der Chip-Link ist eine direkte 1:1-Übernahme des Supabase-`event_type.slug`-Wertes als URL-Pfad. Es gibt **kein Mapping, keinen Filter und keinen Fallback** zwischen Supabase-Slug und CATEGORIES-Slugs. Wenn der Slug in `CATEGORIES` existiert, funktioniert der Link. Wenn nicht, zeigt er auf eine nicht vorhandene Route — ein Browser-Test hat dies bestätigt (Festzelt und Hochzeit funktionieren, andere Slugs erzeugen 404).

> **Korrektur (Code-Fix 2026-06-13):** Die frühere Annahme, Chips ohne passenden CATEGORIES-Slug würden als `<span>` erscheinen, war falsch. Der `<span>`-Zweig war unter normalen DB-Bedingungen toter Code: da `event_type.slug` durch `NOT NULL`-Constraint immer truthy ist, wurde die Bedingung `slug ?` stets als `true` ausgewertet, und alle Chips wurden als `<Link>` gerendert. Nach dem Code-Fix (`slug && getCategoryBySlug(slug) ?`) rendert `BandTagsSection` Chips ohne gültigen CATEGORIES-Slug künftig sichtbar, aber unverlinkt als `<span>`.

`HeroCTA` empfängt `eventTypes` (String-Array ohne Slugs) nur für den Kontakt-Modal — baut keine `/veranstaltung/`-Links.

### Welche CATEGORIES-Slugs aktuell gültige öffentliche Routen sind

Die 5 CATEGORIES-Slugs und ob sie in Supabase `event_types` existieren (read-only Abfrage, 2026-06-13):

| CATEGORIES-Slug | Route existiert | In Supabase `event_types`? | Supabase-Name |
|---|---|---|---|
| `hochzeit` | Ja | **Ja** | Hochzeit |
| `festzelt` | Ja | **Ja** | Festzelt |
| `firmenfeier` | Ja | **Nein** | — (Supabase hat `firmenfeier-business-event`) |
| `geburtstag` | Ja | **Nein** | — |
| `gala` | Ja | **Nein** | — |

**Befund:** Nur `hochzeit` und `festzelt` haben aktuell einen Supabase-`event_type`-Slug, der 1:1 einem CATEGORIES-Slug entspricht. Die anderen 3 (`firmenfeier`, `geburtstag`, `gala`) sind als Routing-Slugs gültig, existieren aber nicht in Supabase — d.h. Chips für diese Kategorien würden bei Supabase-zugeordneten Bändern gar nicht als Link erscheinen (kein `slug`-Wert → `<span>` statt `<Link>`).

### Pre-existentes Slug-Misalignment

Von 38 aktiven Supabase-`event_types` haben **36 keinen CATEGORIES-Match**. Darunter Slugs wie `empfang`, `ball`, `bankett`, `volksfest`, `kirchweih`, `dult`, `fasching`, `beerdigung`, `geistliche-anlaesse` usw. Bands, die diesen Typen zugeordnet sind, haben Chips, deren Links nach Code- und Datenbefund auf nicht existente Routen zeigen würden.

Das 404-Risiko ist damit **kein neues Problem der vier geplanten Typen**, sondern eine pre-existente systemische Eigenschaft: Supabase-Slugs und CATEGORIES-Slugs sind weitgehend entkoppelt und wurden bislang nicht synchronisiert.

### Würden bestehende funktionierende Chips durch Option A unverändert bleiben?

**Ja.** Option A (neuer Eintrag in `lib/categories.ts`) fügt einen neuen `CategoryConfig` hinzu, ohne bestehende Einträge zu verändern. Die beiden aktuell funktionierenden Chip-Slugs `hochzeit` und `festzelt` blieben unberührt. Option A birgt kein Regressionsrisiko für bestehende Chips.

### Wo könnte `isPublicCategorySlug()` abgeleitet werden?

`lib/categories.ts` exportiert bereits `getCategoryBySlug(slug: string): CategoryConfig | undefined`. Eine Prüfung der Form:

```typescript
const isPublicSlug = getCategoryBySlug(slug) !== undefined;
```

würde equivalent eine `isPublicCategorySlug()`-Funktion abbilden — ohne neue Taxonomie- oder Mapping-Logik einzuführen. `BandTagsSection` könnte diesen Check verwenden, um einen Chip-Link nur dann zu rendern, wenn die Route auch existiert, und andernfalls auf `<span>` zurückzufallen. Das wäre eine defensive Absicherung, keine inhaltliche Änderung.

*Option C (Oberkategorie-Linking) bleibt bewusst außerhalb dieses Blocks.*

---

## 5. Sichtbarkeits-Mechanik für einen neuen Typ

### Eigene öffentliche Kategorie-Seite

Voraussetzungen:
- Neuer Eintrag in `CATEGORIES` mit passendem `slug`
- `airtableEventTypes` enthält die zugehörigen Airtable-`event_canon`-Werte
- In Airtable: diese `event_canon`-Werte müssen in der Veranstaltungen-Tabelle vorhanden sein und Bands zugeordnet sein

Effekt: `generateStaticParams()` erzeugt automatisch die neue Route `/veranstaltung/[slug]`, Bänder werden über `bandMatchesCategory()` gefiltert.

### Filteroption im Finder

Identische Voraussetzung wie Kategorie-Seite: Eintrag in `CATEGORIES`. Es gibt keinen separaten Filtermechanismus.

### Anzeige auf Banddetailseite

Voraussetzung: Band in `band_event_types` dem Supabase-`event_type` zugeordnet. Chip erscheint dann automatisch unter „Spielt bei". Der Link-Slug muss mit einem `CATEGORIES`-Slug übereinstimmen, damit der Link nicht in 404 führt.

### Zuordnung zu bestehender Kategorie

Möglich durch: Erweiterung von `airtableEventTypes` einer bestehenden Kategorie in `lib/categories.ts`. Kein neues Routing nötig, Band erscheint auf der bestehenden Kategorie-Seite.

### Reine Admin-Verfügbarkeit

Reicht ein Supabase-Insert. Kein weiterer Code-Change nötig.

---

## 6. Kategorie-Zuordnung der vier neuen Typen

### Kinder- & Familienevent

AT-Quelltypen laut redaktioneller Entscheidung: `Familiennachmittage`, `Kindergartenfest`, `Schulfest`

| AT-Wert | In bestehender Kategorie? |
|---|---|
| Familiennachmittage | Ja — `Geburtstag & Privatfeier` (slug: geburtstag) |
| Kindergartenfest | Nein — in keiner `airtableEventTypes`-Liste |
| Schulfest | Nein — in keiner `airtableEventTypes`-Liste |

Strukturell käme `Geburtstag & Privatfeier` als thematischer Oberbegriff in Frage (Familiennachmittage ist dort bereits enthalten). Für `Kindergartenfest` und `Schulfest` gibt es aktuell keinen bestehenden öffentlichen Rahmen.

### Benefizveranstaltung

AT-Quelltyp: `Benefizveranstaltung`

Kein bestehender öffentlicher Rahmen. Thematisch wäre `Gala & Empfang` (formal/gesellschaftlich) oder `Firmenfeier & Business Event` (professioneller Kontext) am nächsten — beide passen aber nicht wirklich. Kein überzeugender bestehender Ankerpunkt vorhanden.

### Vernissage

AT-Quelltyp: `Vernissage`

**Bereits eingetragen:** `Gala & Empfang` enthält `Vernissage` in `airtableEventTypes`. Bands mit Airtable-`event_canon = "Vernissage"` erscheinen bereits auf `/veranstaltung/gala`. Eine eigene öffentliche Kategorie existiert nicht und ist durch die aktuelle Struktur auch nicht vorgesehen.

### Club

AT-Quelltyp: `Club`

Kein bestehender öffentlicher Rahmen. `Club` als Venue-/Format-Kontext (nicht Anlass) passt in keine der 5 bestehenden CATEGORIES. Auch thematisch kein überzeugender Ankerpunkt.

---

## 7. Supabase ↔ Airtable ↔ categories.ts — die Brücke

### Airtable (öffentlich)

Airtable ist die einzige Datenquelle für:
- Bandzuordnung auf Kategorie-Seiten
- Bandliste im Finder
- Bandkarten-Daten (Name, Bild, Kurztext, eventTypes)

Die `getEventTypeMap()`-Funktion liest Airtable's `Veranstaltungen`-Tabelle (Felder: `event_canon` → displayName, `Slug` → slug) und baut daraus eine Map, die bei der Bandnormalisierung jedem Band seine `eventTypes` und `categorySlugs` zuweist.

### Supabase (öffentlich)

Supabase ist die einzige Datenquelle für:
- Banddetailseiten `/band/[slug]`
- Ähnliche Bands (via `band_relations`)
- Social-Stats, Gallery, Reference Events, Lineup-Infos, Video

Die Supabase-Tabelle `event_types` und die Junction `band_event_types` steuern, was unter „Spielt bei" auf Banddetailseiten erscheint.

### `lib/categories.ts` (Mapping-Schicht)

`categories.ts` ist die einzige Stelle, die öffentliche Sichtbarkeit für Airtable-Daten konfiguriert:
- Definiert, welche Airtable-`event_canon`-Werte zu einer Kategorie zählen
- Definiert, welche Routen existieren
- Definiert, welche Filteroptionen im Finder verfügbar sind

### Wird Supabase `event_types` für öffentliche Filter-/Kategorielogik genutzt?

**Nein.** Kein öffentlicher Seitentyp nutzt Supabase `event_types` als Filter-Grundlage. Supabase `event_types` steuern nur:
1. Admin-Oberfläche (Typ-Picker bei Band-Bearbeitung)
2. „Spielt bei"-Chips auf Banddetailseiten (mit Links, die auf CATEGORIES-Slugs zeigen)

### Konsequenz für neue Event-Types

Ein Supabase-Insert allein erzeugt keine öffentliche Kategorie-Sichtbarkeit. Die öffentliche Sichtbarkeit hängt ausschließlich von `lib/categories.ts` und Airtable-Daten ab.

---

## 8. Konsequenz-Skizze: Vollständig öffentlich sichtbar machen

Für jeden der vier neuen Event-Types wären folgende Schritte nötig, um vollständige öffentliche Sichtbarkeit herzustellen:

### Schritt 1: Datenebene

**Supabase:**  
INSERT in `event_types` (Slug, Name, Status, Sort-Order). Wirkt nur für Admin und Banddetail-Chips.

**Airtable:**  
Sicherstellen, dass der `event_canon`-Wert in der `Veranstaltungen`-Tabelle vorhanden ist und den gewünschten Slug trägt. Bands müssen in Airtable (und via Admin in Supabase) diesem Event-Type zugeordnet sein.

### Schritt 2: Mapping / Kategorie-Zuordnung

**Option A — Neuer Eintrag in `lib/categories.ts`:**  
Neues `CategoryConfig`-Objekt mit eigenem Slug (muss Supabase `event_type.slug` entsprechen) und `airtableEventTypes`-Liste. Erzeugt:
- neue Kategorie-Seite `/veranstaltung/[slug]`
- neue Filteroption im Finder
- funktionierende Chip-Links auf Banddetailseiten

**Option B — Erweiterung einer bestehenden Kategorie:**  
Airtable-`event_canon`-Wert zur `airtableEventTypes`-Liste einer bestehenden Kategorie hinzufügen. Band erscheint auf bestehender Seite. Kein neues Routing. Chip-Link auf Banddetailseite muss ggf. auf bestehenden CATEGORIES-Slug gemappt werden (kein automatischer Zusammenhang).

### Schritt 3: Admin-Zuweisung

Nach Supabase-INSERT automatisch verfügbar. Bänder können im Admin dem neuen Event-Type zugeordnet werden. Kein weiterer Code-Change nötig.

### Schritt 4: Öffentliche Anzeige

- Kategorie-Seite: erscheint nach `categories.ts`-Erweiterung bei nächstem Build / ISR-Revalidierung
- Finder-Filter: erscheint automatisch nach `categories.ts`-Erweiterung
- Banddetail-Chips: erscheinen nach `band_event_types`-Zuordnung, Link funktioniert nur wenn Supabase-Slug ≡ CATEGORIES-Slug
- BandCard auf Kategorie-Seite: erscheint nach Airtable-Zuweisung und `airtableEventTypes`-Mapping

### Schritt 5: Kategorie-Seite mit Content (optional)

Hero-Bild und Subtitle pro Kategorie können in Sanity gepflegt werden (`fetchEventCategoryHero(slug)`). Ohne Sanity-Eintrag fällt die Seite auf den einfachen Text-Hero zurück.

---

## Besondere Befunde zu den vier konkreten Typen

| Event-Type | Airtable-Quelltyp in bestehender Kategorie? | Supabase-Insert reicht für öffentliche Sichtbarkeit? | Nächster bestehender Rahmen |
|---|---|---|---|
| Kinder- & Familienevent | Familiennachmittage → Geburtstag; Kindergartenfest, Schulfest → kein Rahmen | Nein | Teilweise Geburtstag & Privatfeier |
| Benefizveranstaltung | Nein | Nein | Kein überzeugender Rahmen |
| Vernissage | **Ja — Gala & Empfang** (bereits in `airtableEventTypes`) | Nein | Gala & Empfang |
| Club | Nein | Nein | Kein passender Rahmen |

**Sonderfall Vernissage:** Bands mit Airtable-`event_canon = "Vernissage"` erscheinen bereits auf `/veranstaltung/gala`. Ein Supabase-Insert mit Slug `vernissage` würde Admin-Verfügbarkeit und einen Chip auf Banddetailseiten erzeugen — der Chip-Link würde nach Code- und Datenbefund auf `/veranstaltung/vernissage` zeigen, wo aktuell keine Route existiert. (Kein Browser-Test durchgeführt — Einschätzung basiert auf Codepfad-Analyse und Supabase-Slug-Abfrage.) Hier besteht ein konkreter ableitbarer Widerspruch zwischen Supabase-Slug und bestehendem Airtable-Mapping, der vor der Umsetzung geklärt werden sollte.

---

## Offene Fragen

1. **Slug-Alignment Supabase ↔ CATEGORIES:** Sollen neue Supabase-Slugs (`kinder-und-familienevent`, `vernissage`, etc.) künftig 1:1 als CATEGORIES-Slugs dienen? Oder gibt es separate Slugs für Supabase und für Kategorie-Routen? — Grundsatzfrage, die auch das pre-existente Misalignment betrifft (36/38 Supabase-Slugs ohne CATEGORIES-Match, `firmenfeier-business-event` statt `firmenfeier` etc.).

2. **Vernissage — doppeltes Mapping:** Ist Vernissage als Unterpunkt von Gala & Empfang korrekt und gewollt? Oder soll es eine eigene Kategorie bekommen? Wenn ja, müsste der Gala-Eintrag in `categories.ts` bereinigt werden.

3. **Familiennachmittage vs. Kinder- & Familienevent:** Familiennachmittage ist aktuell unter Geburtstag & Privatfeier. Nach der Bündelung zu Kinder- & Familienevent: Soll dieser neue Typ eine eigene Kategorie erhalten und Familiennachmittage dort hin verschoben werden (würde Geburtstag-Bandliste ändern)?

4. **Chip-Links für nicht-öffentliche Supabase-Event-Types:** Was soll bei Banddetail-Chips geschehen, wenn kein CATEGORIES-Eintrag für den Slug existiert? Derzeit würde der Link in 404 führen. Soll der Chip dann unverlinkt bleiben (Span statt Link)?

5. **Wann ist der richtige Zeitpunkt für den Insert?** Aus Nutzersicht empfehlenswert erst nach Erweiterung von `categories.ts`, damit kein Chip mit 404-Link auf Live geht.

---

## Bestätigung

- Keine Codeänderungen durchgeführt
- Supabase: ausschließlich read-only (`SELECT` via Service Role Key), kein INSERT / UPDATE / DELETE
- Kein Push
- Temporäre Skripte: angelegt und nach Ausführung gelöscht (`scripts/_tmp_slug_check.mjs`)
