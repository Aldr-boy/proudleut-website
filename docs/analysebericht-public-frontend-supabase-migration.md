# Analysebericht: Public-Frontend-Migration auf Supabase

**Fragestellung:** Wie können die öffentlichen Seiten `/bands` und `/veranstaltung/[slug]` von Airtable/`lib/categories.ts` auf Supabase als Single Source of Truth migriert werden?

**Stand:** 2026-06-17  
**Harte Leitplanken dieses Berichts:** Kein Code, keine DB, kein SQL, kein Commit, kein Push. Nur Analyse.

---

## 1. Ist-Zustand der öffentlichen Datenquellen

### Routing-Übersicht

| Bereich | Datei | Funktion / Komponente | Datenquelle | konkrete Abhängigkeit | Bemerkung |
|---|---|---|---|---|---|
| `/bands` (Server) | `app/bands/page.tsx` | `BandsPage()` | **Airtable** | `getBands()` aus `lib/airtable/queries.ts` | ISR `revalidate = 300` |
| `/bands` (Client-Filter) | `components/bands/BandExplorer.tsx` | `BandExplorer` | **lib/categories.ts** | `CATEGORIES`, `bandMatchesCategory`, `CATEGORIES.some()`, `CATEGORIES.find()` | Anlass-Dropdown + URL-Param-Validierung |
| `/veranstaltung/[slug]` | `app/veranstaltung/[slug]/page.tsx` | `VeranstaltungPage()` | **Airtable + lib/categories.ts + Sanity** | `getBands()` für Banddaten; `CATEGORIES`, `bandMatchesCategory`, `getCategoryBySlug`, `getRelatedCategories`; `fetchEventCategoryHero(slug)` | ISR `revalidate = 300` |
| `/veranstaltung/[slug]` Static | `app/veranstaltung/[slug]/page.tsx` | `generateStaticParams()` | **lib/categories.ts** | `CATEGORIES.map(c => ({slug: c.slug}))` | Keine Airtable-/Supabase-Abfrage |
| `/veranstaltung/[slug]` Meta | `app/veranstaltung/[slug]/page.tsx` | `generateMetadata()` | **lib/categories.ts** | `getCategoryBySlug(slug).seoTitle/.seoDescription` | Keine Airtable-/Supabase-Abfrage |
| `/band/[slug]` | `app/band/[slug]/page.tsx` | (default export) | **Supabase** | `getBandFromSupabase()` + `getAllBandsFromSupabase()` aus `lib/supabase/queries.ts`; `normalizeBandFromSupabase()` | `force-dynamic`, kein ISR |
| Homepage Quicklinks | `components/homepage/HeroMosaic.tsx` | `HeroMosaic` | **lib/categories.ts** | `CATEGORIES.slice(0, 5)` für Pill-Links | Keine Datenbankabfrage |
| BandCard Chips | `components/BandCard.tsx` | `buildChips()` | Band-Props (Airtable-normalisiert) | `band.eventTypes[]`, `band.category`, `band.location.administrativeRegion` | Kein eigener Datenzugriff |
| Event-Chips + Chip-Links | `components/band/BandTagsSection.tsx` | `BandTagsSection` | **lib/categories.ts** | `getCategoryBySlug(band.categorySlugs?.[i])` — nur `<Link>` wenn Slug matched | Kein `<Link>` für AT-Slugs ohne CATEGORIES-Eintrag |
| Region-Filter | `lib/regions.ts` | `getBandRegionBucket()` | Band-Props | `band.location.administrativeRegion` | Keine Datenbankabfrage |

### Rolle von `lib/categories.ts`

`lib/categories.ts` erfüllt aktuell **fünf verschiedene Aufgaben** gleichzeitig:

1. **Routing-Konfiguration**: `generateStaticParams()` liest `CATEGORIES.map(c => ({slug: c.slug}))` — bestimmt, welche Slugs als statische Routen gebaut werden.
2. **SEO-Metadaten**: Jede `CategoryConfig` enthält `seoTitle`, `seoDescription`, `h1Title`, `description` — wird direkt in `generateMetadata()` und dem Hero gerendert.
3. **Band-Matching**: `bandMatchesCategory(band, category)` vergleicht `band.eventTypes[]` (= `event_canon`-Strings aus Airtable) mit `category.airtableEventTypes[]` (= curated event_canon-Strings).
4. **Filter-Optionen**: `BandExplorer` rendert `CATEGORIES.map()` als Anlass-Dropdown und validiert URL-Parameter gegen `CATEGORIES.some(c => c.slug === p)`.
5. **Cross-Links**: `getRelatedCategories(slug)` und `getCategoryBySlug(slug)` erzeugen die "Weitere Anlässe"-Links und Chip-Links auf Bandprofilen.

### Kritischer Mechanismus: `event_canon` als Mapping-Brücke

```
Airtable Veranstaltungen.event_canon  →  eventTypeMap (id → {displayName, slug})
                                     ↓
normalizeBand() → band.eventTypes[]  = [event_canon strings]
                  band.categorySlugs[] = [AT Veranstaltungen.Slug strings]
                                     ↓
bandMatchesCategory(band, category)  = band.eventTypes.some(et => category.airtableEventTypes.includes(et.trim()))
```

Das Matching basiert vollständig auf `event_canon`-String-Gleichheit — nicht auf Slugs, nicht auf IDs. Das ist wichtig für die Migration, weil Supabase `event_types.name` und `event_canon` nicht zwingend identisch sind.

---

## 2. Datenmodell-Vergleich Airtable vs. Supabase

Die folgende Tabelle bezieht sich auf das, was `/bands` und `/veranstaltung/[slug]` tatsächlich benötigen. Grundlage: `BandCard`, `BandExplorer`, `VeranstaltungPage`.

| Public-Bedarf (aus `Band`-Typ) | Airtable-Quelle (Feld/Funktion) | Supabase-Entsprechung | Status | Risiko / offene Prüfung |
|---|---|---|---|---|
| `band.name` | `Bandname` → `normalizeBand()` | `bands.name` | **direkt vorhanden** | — |
| `band.slug` | `Slug` → `normalizeBand()` | `bands.slug` | **direkt vorhanden** | — |
| `band.status` | `Webflow Status` → `normalizeStatus()` | `bands.status` (`'active'`) | **vorhanden, anderes Format** | AT: `'Active'`; SB: `'active'`. `normalizeBandFromSupabase()` handled das bereits. |
| `band.shortDescription` | `Short Descripton / Subheadline` | `band_profiles.short_description` | **direkt vorhanden** | Im `getAllBandsFromSupabase()` enthalten. |
| `band.category` | `Name (Kurzform)` (primary Bandart) | `band_band_types(is_primary) → band_types.name` | **direkt vorhanden** | Im `getAllBandsFromSupabase()` enthalten. |
| `band.bandartNames[]` | `Name (Kurzform)[]` | `band_band_types → band_types.name` | **direkt vorhanden** | — |
| `band.bandartSlugs[]` | `Slug (from Hauptkategorie/Bandart)[]` | `band_band_types → band_types.slug` | **direkt vorhanden** | — |
| `band.eventTypes[]` | `Veranstaltungstypen` → `event_canon` via Map | `band_event_types → event_types.name` | **vorhanden, aber Wert ≠ event_canon** | `event_types.name` in Supabase ist NICHT dasselbe wie `event_canon` in Airtable. `bandMatchesCategory()` braucht Anpassung. |
| `band.categorySlugs[]` | `Veranstaltungen.Slug` via eventTypeMap | `band_event_types → event_types.slug` | **vorhanden, aber andere Slugs** | AT-Slug z.B. `firmenfeier-business-event`; CATEGORIES-Slug ist `firmenfeier`. Chip-Links in `BandTagsSection` würden nicht matchen. |
| `band.heroImage` / `band.thumbnailImage` | AT Attachment → `normalizeImage()` | `media_assets` (role: `'hero'`, `'thumbnail'`) | **vorhanden** | `media_assets.width`, `media_assets.height` werden in `getAllBandsFromSupabase()` abgefragt, existieren aber NICHT im Schema (`proudleut-schema.sql`). **unklar – gegen reale DB zu prüfen** |
| `band.location.city` | `orte (from Orte-Master)[0]` | `locations.city_name` | **direkt vorhanden** | In Query enthalten. |
| `band.location.district` | `landkreise (from Orte-Master)[0]` | `locations.landkreis` | **direkt vorhanden** | In Query enthalten. |
| `band.location.administrativeRegion` | `regierungsbezirk (from Orte-Master)[0]` | `locations.regierungsbezirk` | **direkt vorhanden** | In Query enthalten. Wird von `getBandRegionBucket()` benötigt. |
| `band.location.postalCode` | `plz (from Orte-Master)` | `locations.plz` | **fehlt in Query** | `getAllBandsFromSupabase()` fragt `plz` NICHT ab. PLZ-Textsuche im `BandExplorer` (Zeile 222: `loc.postalCode?.includes(q)`) würde nie matchen. |
| `band.location.latitude` | `lat (from Orte-Master)` | `locations.latitude` | **fehlt in Query** | `getAllBandsFromSupabase()` fragt `latitude`/`longitude` NICHT ab. PLZ-Umkreissuche (`haversineKm()`) würde nie Treffer liefern. |
| `band.location.longitude` | `lon (from Orte-Master)` | `locations.longitude` | **fehlt in Query** | Wie `latitude`. |
| `band.klingtNach[]` | `Klingt_Nach` (pipe-getrennt) | `band_sound_worlds → sound_worlds.name` + `band_moods → moods.name` | **fehlt in `getAllBandsFromSupabase()`** | Für BandCard und BandExplorer nicht direkt benötigt, aber für `BandTagsSection` auf Detailseite. |
| `band.musikalischVerortet[]` | `Musikalisch_Verortet` (pipe-getrennt) | `band_repertoire_styles → repertoire_styles.name` | **unklar – gegen reale DB zu prüfen** | `repertoire_styles`-Tabelle + `band_repertoire_styles`-Junction fehlen im `proudleut-schema.sql`. Query in `getBandFromSupabase()` referenziert sie. |

### Zusammenfassung der Lücken in `getAllBandsFromSupabase()`

Für eine funktionsfähige Migration müssen in `getAllBandsFromSupabase()` mindestens ergänzt werden:

- `locations ( ..., plz, latitude, longitude )` — PLZ-Suche und Umkreissuche
- Optional: `band_sound_worlds ( sound_worlds (*) )` + `band_moods ( moods (*) )` — klingtNach für Chips

---

## 3. Kritische Architekturfragen

### 3.1 Das Slug-Mismatch-Problem

Dies ist der zentrale Knoten der Migration.

**Airtable-Welt heute:**

```
band.eventTypes[]    = ["Firmenfeier & Business Event", "Sommerfest", ...]   ← event_canon strings
band.categorySlugs[] = ["firmenfeier-business-event", "sommerfest", ...]     ← AT Veranstaltungen.Slug

category.airtableEventTypes = ["Firmenfeier & Business Event", "Sommerfest", ...]  ← event_canon strings
bandMatchesCategory = band.eventTypes.some(et => airtableEventTypes.includes(et.trim()))
```

**Supabase-Welt künftig:**

```
band.eventTypes[]    = ["Firmenfeier & Business Event", ...]   ← event_types.name (unklar ob = event_canon)
band.categorySlugs[] = ["firmenfeier-business-event", ...]     ← event_types.slug (SB-eigene Slugs)

category.??? = ??? ← Hier fehlt das Mapping
```

**Konkrete Slug-Abweichungen (bekannt):**

| CATEGORIES-Slug | Supabase `event_types.slug` | AT-Slug (Veranstaltungen.Slug) | Match? |
|---|---|---|---|
| `hochzeit` | `hochzeit` (vermutet) | `hochzeit` | wahrscheinlich ✓ |
| `festzelt` | `festzelt` (vermutet) | `festzelt` | wahrscheinlich ✓ |
| `firmenfeier` | `firmenfeier-business-event` | `firmenfeier-business-event` | ✗ |
| `geburtstag` | unklar – gegen reale DB zu prüfen | `geburtstagsfeier` (?) | unklar |
| `gala` | unklar – gegen reale DB zu prüfen | `gala` (?) | unklar |
| `fasching` | `fasching` | `fasching` | wahrscheinlich ✓ |
| `weihnachtsfeier` | `weihnachtsfeier` | `weihnachtsfeier` | wahrscheinlich ✓ |
| `festival` | `festival` | `festival` | wahrscheinlich ✓ |

**Empfohlene Kurzfristlösung:** Ein neues Feld `supabaseEventTypeSlugs: string[]` in `CategoryConfig` (in `lib/categories.ts`). Damit wird das Matching von event_canon-Strings auf Supabase-Slugs umgestellt:

```typescript
// neu statt airtableEventTypes:
supabaseEventTypeSlugs: ['firmenfeier-business-event', 'sommerfest', 'award-show', 'abschlussfeier']

// neue bandMatchesCategory-Logik (nach Migration):
band.categorySlugs?.some(s => category.supabaseEventTypeSlugs.includes(s))
```

### 3.2 Soll `lib/categories.ts` bestehen bleiben?

**Ja — für kuratierte Themenwelt-Konfiguration ist `lib/categories.ts` langfristig sinnvoll.** Die Aufgabenteilung nach Migration:

| Aufgabe | Aktuell | Nach Migration |
|---|---|---|
| Welche Slugs werden als Routen gebaut? | `lib/categories.ts` | Bleibt `lib/categories.ts` |
| SEO-Titel, Beschreibungen, h1 | `lib/categories.ts` | Bleibt `lib/categories.ts` (oder Sanity) |
| Welche event_types gehören zu welcher Kategorie? | `lib/categories.ts` → `airtableEventTypes` | `lib/categories.ts` → `supabaseEventTypeSlugs` |
| Welche Bands kommen auf welche Kategorieseite? | `bandMatchesCategory()` via event_canon | `bandMatchesCategory()` via SB-Slug |
| Cross-Link-Chips auf Bandprofilen | `getCategoryBySlug(band.categorySlugs?.[i])` | Bleibt, aber AT-Slug ≠ SB-Slug — Anpassung nötig |

### 3.3 Welche Daten bleiben im Code, welche in Supabase?

**Bleibt bewusst im Code (`lib/categories.ts`):**

- `slug` der Kategorie (Route-Definition)
- `title`, `h1Title`, `description` (kuratierter Text)
- `seoTitle`, `seoDescription` (SEO-Texte)
- `supabaseEventTypeSlugs` (Mapping zu Supabase-Slugs)

**Gehört in Supabase:**

- Alle Banddaten (Name, Slug, Status, Beschreibungen, Medien, Kontakt)
- `event_types` (Veranstaltungstypen-Taxonomie)
- `band_event_types` (Band ↔ Event-Type-Zuordnungen)
- `locations` (Geodaten)
- `band_types` (Bandart-Taxonomie)

**In Supabase erst in Phase E (event_groups):**

- Strukturelle Zuordnung mehrerer `event_types` zu einer Oberkategorie — ersetzt dann `supabaseEventTypeSlugs` im Code

### 3.4 Was braucht `event_canon` als Ersatz?

In der Supabase-Welt ist `event_types.name` der Anzeigetext (ersetzt `event_canon`). Damit `band.eventTypes[]` sinnvolle Labels zeigt, muss `event_types.name` in Supabase lesbare Bezeichnungen enthalten (z.B. "Firmenfeier & Business Event", nicht "firmenfeier-business-event"). Das muss beim Daten-Import sichergestellt werden.

**Prüfpunkt vor Migration:** Stimmen `event_types.name` aus Supabase mit den aktuellen `event_canon`-Werten aus Airtable überein? — **unklar – gegen reale DB zu prüfen**

### 3.5 event_groups jetzt vs. später?

**Gegen sofortige `event_groups`-Einführung spricht:**

- Kein Routing ohne Code-Änderung (Slugs bleiben in `lib/categories.ts` definiert)
- Redaktionelle Inhalte (SEO-Texte) müssten in die DB wandern (eigene Aufgabe)
- Sanity-Anbindung für Hero/Subtitle würde doppelte Datenpflege erzeugen
- Erhöht Migrations-Komplexität erheblich ohne sofortigen Nutzen

**Für Phase E (event_groups) ist sinnvoll:**

- Wenn neue Kategorien ohne Deployment angelegt werden sollen
- Wenn Kategorie-SEO-Texte redaktionell gepflegt werden sollen
- Wenn viele Kategorien entstehen, die kein eigenes Sanity-Dokument rechtfertigen

---

## 4. Migrationsplan in kleinen Phasen

| Phase | Ziel | betroffene Dateien | DB-Änderung nötig? | Risiken | Route-Checks | einzeln commitbar? |
|---|---|---|---|---|---|---|
| **A** | `getAllBandsFromSupabase()` um fehlende Felder erweitern; `normalizeBandFromSupabase()` für Listen-Kontext prüfen | `lib/supabase/queries.ts` | Nein (nur Query erweitern) | `width`/`height` in `media_assets` unklar — ggf. aus Query entfernen. Fehlende DB-Spalten können PostgREST-Fehler werfen. | `/band/[slug]` weiterhin OK; kein öffentlicher Route-Impact | ✓ |
| **B** | `lib/categories.ts` um `supabaseEventTypeSlugs: string[]` erweitern; neue `bandMatchesCategorySB()` neben bestehender Funktion einführen | `lib/categories.ts` | Nein | Noch keine Seite nutzt die neue Funktion — rein additiv. Slug-Vollständigkeit aller 8 Kategorien muss verifiziert werden | Nur Type-Check, keine Route-Änderung | ✓ |
| **C** | `/veranstaltung/[slug]` von `getBands()` (Airtable) auf `getAllBandsFromSupabase()` umstellen; `bandMatchesCategory` auf SB-Slugs umschalten | `app/veranstaltung/[slug]/page.tsx`, `lib/categories.ts` (Funktion anpassen), `lib/supabase/queries.ts` | Nein (wenn Phase A abgeschlossen) | Kategorie-Seiten zeigen ggf. weniger/andere Bands als bisher, wenn Supabase-Datenbasis noch nicht vollständig migriert ist. `categorySlugs`-Matching muss 1:1 verifiziert werden. Sanity-Hero bleibt unverändert. | `/veranstaltung/hochzeit`, `/veranstaltung/firmenfeier`, `/veranstaltung/fasching` etc. — Band-Zahl vergleichen mit Airtable-Stand | Ja, aber erst nach Daten-Verifikation |
| **D** | `/bands` (Finder) von `getBands()` (Airtable) auf `getAllBandsFromSupabase()` umstellen | `app/bands/page.tsx` | Nein (wenn Phase A abgeschlossen) | PLZ-Suche und Umkreissuche brechen ohne `latitude`/`longitude`/`plz` in Query. `bandtyp`-Filter nutzt `band.category` (aus band_types — in Supabase vorhanden). | `/bands`, PLZ-Eingabe, Anlass-Filter, Region-Filter, Bandtyp-Filter | Ja, aber PLZ-Umkreissuche muss getestet werden |
| **E** | ISR für Supabase-Seiten einführen (statt `force-dynamic`) | `app/band/[slug]/page.tsx`, `app/bands/page.tsx`, `app/veranstaltung/[slug]/page.tsx` | Nein (ISR-Strategie) | `force-dynamic` war für Supabase-anon-Client nötig — prüfen ob ISR + anon-Client kompatibel; evtl. Server-Client (service_role) für SSR nötig | Alle betroffenen Routen | Ja |
| **F** *(spätere Phase)* | `event_groups`-Tabelle einführen; redaktionelle Kategorie-Verwaltung über Supabase | `supabase/schema/`, `lib/categories.ts` (vereinfachen), ggf. neues Admin-Interface | **Ja** — neue Tabelle + Daten | Sanity-Anbindung für Hero bleibt unklar. Routing müsste dynamisch aus DB kommen. Hohe Komplexität. | Vollständiger Kategorie-Test | Separater Sprint |

---

## 5. Offene Daten-Cleanups

| Thema | Einschätzung | Blocker? | Warum / Risiko | empfohlene Behandlung |
|---|---|---|---|---|
| `media_assets.width` / `.height` in `getAllBandsFromSupabase()` | Query fragt Spalten ab, die im Schema (`proudleut-schema.sql`) nicht definiert sind | **Ja für Phase A** | PostgREST würde PGRST106 oder leere Felder zurückgeben; `normalizeBandFromSupabase()` erwartet die Werte für `ImageAsset.width/.height` | **Erst gegen reale DB prüfen.** Wenn Spalten fehlen: aus Query entfernen. `normalizeImg()` setzt `width`/`height` auf `undefined` — kein Render-Fehler, nur Next.js Image ohne explizite Dimensionen. |
| `repertoire_styles` + `band_repertoire_styles` fehlen im Schema | Beide Tabellen werden in `getBandFromSupabase()` und `normalizeBandFromSupabase()` referenziert, aber sind nicht in `proudleut-schema.sql` | **Ja für /band/[slug]** | Live-Query wirft wahrscheinlich Fehler oder gibt leeres Array zurück | **Gegen reale DB prüfen.** Falls nicht vorhanden: aus Query entfernen, `musikalischVerortet` bleibt leer. |
| Slug-Mapping `firmenfeier` (CATEGORIES) vs. `firmenfeier-business-event` (Supabase) | Bekannte Abweichung | **Ja für Phase B/C** | `getCategoryBySlug(band.categorySlugs?.[i])` matched nie → alle Chip-Links auf Bandprofilen für Firmenfeier bleiben als `<span>` | `supabaseEventTypeSlugs` in CategoryConfig muss `'firmenfeier-business-event'` enthalten; `getCategoryBySlug()` weiterhin nach CATEGORIES-Slug suchen |
| Vollständiger Supabase-Slug-Stand für alle 8 Kategorien | Slugs von `geburtstag`, `gala` in Supabase unklar | **Ja für Phase B** | Unvollständiges Mapping führt zu leeren Kategorie-Seiten | Gate-Check: alle SB `event_types.slug`-Werte auflisten und gegen CATEGORIES-`airtableEventTypes` abgleichen |
| `event_types.name` in Supabase ≠ `event_canon` in Airtable | Unklar ob identisch | **Ja für Phase C** | `band.eventTypes[]` würde auf Kategorie-Seiten und Chip-Displays andere Strings anzeigen als bisher | Name-Vergleich zwischen AT `event_canon` und SB `event_types.name` vor Migration |
| PLZ-Umkreissuche: `latitude`/`longitude`/`plz` fehlen in `getAllBandsFromSupabase()` | Bestätigte Lücke | **Ja für Phase D** | PLZ-Eingabe und Radius-Chips im BandExplorer würden still keine Ergebnisse liefern | In `getAllBandsFromSupabase()` ergänzen: `locations ( city_name, landkreis, regierungsbezirk, plz, latitude, longitude )` |
| Österreichische PLZ / Auslands-Locations | `getBandRegionBucket()` gibt `'Außerhalb Bayerns'` für alle ohne Bayern-Regierungsbezirk | Kein Blocker | Nicht-bayerische Bands erscheinen korrekt unter "Außerhalb Bayerns" | Kein Handlungsbedarf für Migration |
| Typo `Fernsehaufttritte` (AT event_canon) | Existiert in Airtable als canon-String | Kein Blocker | Ist aktuell NICHT in `airtableEventTypes` einer CATEGORIES-Kategorie → kein Match, kein Problem | Nicht in Supabase-Mapping aufnehmen |
| Nischen-Bandarten ohne Supabase-Eintrag | Unbekannte Lücken in `band_types` | Kein Blocker | `band.category` würde `undefined` für Bands ohne Bandart-Eintrag in SB — Filter-Dropdown ändert sich ggf. | Datenqualitäts-Cleanup nach Migration |
| `homepageReady` fehlt in `normalizeBandFromSupabase()` | Hardcoded `false` in SB-Normalizer | Kein Blocker für /bands | Homepage-ready-Logik liegt vollständig bei Airtable; kein Supabase-Feld geplant | Separater Sprint |

---

## 6. Empfehlung

**Der nächste kleinste sinnvolle Implementierungsschritt ist Phase A: die `getAllBandsFromSupabase()`-Query um die fehlenden Felder erweitern und gleichzeitig die `width`/`height`-Frage gegen die reale DB klären.**

Phase A ist die Voraussetzung für alle nachfolgenden Phasen, berührt keine öffentlich sichtbaren Routen und kann unabhängig committed werden. Sie kostet wenig, schafft aber die Grundlage:

1. **Read-only-Check:** Gegen reale Supabase-DB prüfen, ob `media_assets.width`/`.height` und `repertoire_styles` existieren. PostgREST-Query `GET /rest/v1/event_types?select=name,slug&status=eq.active` liefert gleichzeitig den vollständigen Slug-Stand für Phase B.

2. **Query-Update** (konkrete Änderung in `lib/supabase/queries.ts`):
   ```
   locations ( city_name, landkreis, regierungsbezirk, plz, latitude, longitude )
   ```
   Falls `width`/`height` nicht in DB: aus `media_assets`-Select entfernen.

3. **Danach Phase B:** `lib/categories.ts` um `supabaseEventTypeSlugs: string[]` erweitern (alle 8 Kategorien mit verifizierten SB-Slugs befüllen).

Die Phasen C (Kategorie-Seiten) und D (Finder) folgen danach in beliebiger Reihenfolge — beide sind dann nur noch Page-level-Umstellungen ohne strukturelle Risiken.

**Was Phase E (event_groups) jetzt noch nicht braucht:** Die Slug-Mapping-Konfiguration in `lib/categories.ts` ist kein Rückschritt — sie ist exakt der richtige Zwischenschritt, der `event_groups` später einfach macht, weil die Slugs dann schon sauber in Supabase existieren.

---

## Abschlussbericht

- **Angelegte Datei:** `docs/analysebericht-public-frontend-supabase-migration.md`
- **Veränderte Dateien:** keine
- **Git-Status vor Aufgabe:** `?? docs/entscheidungsvorlage-event-type-architektur.md`
- **Git-Status nach Aufgabe:** `?? docs/entscheidungsvorlage-event-type-architektur.md`, `?? docs/analysebericht-public-frontend-supabase-migration.md`
- **Commit:** keiner
- **Push:** keiner
- **DB-Änderung:** keine
