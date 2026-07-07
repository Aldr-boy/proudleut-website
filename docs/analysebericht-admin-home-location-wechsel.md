# Analysebericht: Admin — Home-Location einer Band wechseln/umhängen

Read-only Analyse für den nächsten Sprint. Kein Feature-Code, keine DB-Writes,
kein Commit. Diese Datei selbst ist ebenfalls nicht committet.

---

## 0. Preflight (vor Beginn ausgeführt)

```
git status -sb
## main...origin/main   (clean, nichts ausstehend)

git log --oneline --decorate -5
0fef782 (HEAD -> main, origin/main, origin/HEAD) chore(data): lineups import (band_lineups)
602b2d5 chore(data): services import (band_services)
2f4359f feat(admin): edit exclusive band home location with PLZ lookup
7ac50a0 feat(search): support Austrian postal code radius lookup
b53583a feat(admin): manage band video link

rg -n "Donnaweda.*Neumarkt|Neumarkt.*Donnaweda|Donnaweda → Neumarkt" .
→ KEIN TREFFER
```

**Befund zu Donnaweda/Neumarkt:** Es gibt im gesamten Repo keinen Treffer für
„Donnaweda → Neumarkt". Dieser Testfall existiert nirgends — weder als echter
Fall noch als dokumentierter fiktionaler Platzhalter. Donnaweda taucht an
zahlreichen Stellen auf (Bandprofil, Referenz-Events, Taxonomie-Dokus,
Media-Seed-Scripts), aber **niemals im Zusammenhang mit Neumarkt oder einem
Location-Wechsel**. Diese Kombination scheint aus einer früheren, nicht in
diesem Repo dokumentierten Unterhaltung zu stammen und ist als **falscher,
nicht existenter Testfall** zu behandeln. Er wird in diesem Bericht an keiner
Stelle als Grundlage verwendet — siehe Abschnitt 3, synthetischer Testansatz.

Bestätigt: Es gibt aktuell **keinen** festgelegten echten Band-Testfall für
dieses Feature.

---

## 1. Relevante Dateien (gelesen)

- [`app/admin/bands/[id]/page.tsx`](app/admin/bands/[id]/page.tsx) — lädt Banddetails inkl. `home_location_id` und vollständige `locations`-Felder, berechnet `locationUsageCount`
- [`app/admin/bands/[id]/actions.ts`](app/admin/bands/[id]/actions.ts) — enthält `updateLocationAction` (Zeilen 607–689)
- [`app/admin/bands/[id]/LocationEditSection.tsx`](app/admin/bands/[id]/LocationEditSection.tsx) — Client Component, rendert Standort-Formular oder Sperr-Hinweis
- [`lib/supabase/queries.ts:47`](lib/supabase/queries.ts#L47) — öffentliche Query, referenziert zum Vergleich
- [`app/admin/bands/page.tsx:30-34`](app/admin/bands/page.tsx#L30-L34) — Bandliste, Kommentar bestätigt: „home_location_id is 0..1"
- [`supabase/proudleut-schema.sql`](supabase/proudleut-schema.sql) — Schema-Referenzdatei (siehe Abschnitt 4)

---

## 2. Bestehende Standort-Editierlogik

### Wie es aktuell funktioniert

1. **Page lädt** `bands.home_location_id` + vollständige `locations`-Felder
   (`id, plz, city_name, landkreis, regierungsbezirk, bundesland, country,
   country_code, latitude, longitude, geo_point`) über einen PostgREST-Join.
2. **`locationUsageCount`** wird serverseitig separat ermittelt:
   ```ts
   const { count } = await client
     .from('bands')
     .select('*', { count: 'exact', head: true })
     .eq('home_location_id', band.home_location_id)
   ```
3. **`LocationEditSection`** (Client Component) unterscheidet drei Zustände:
   - `location === null` → Hinweis „keine Home-Location verknüpft", kein Formular
   - `locationUsageCount > 1` → read-only Anzeige + Sperr-Warnung mit Bandanzahl
   - `locationUsageCount === 1` → editierbares Formular (`plz`, `city_name`,
     `latitude`, `longitude`), inkl. optionalem „Koordinaten aus PLZ
     übernehmen"-Button (liest clientseitig `/data/plz-coords.json`)
4. **`updateLocationAction`** (Server Action) schreibt nur bei bestätigter
   Exklusivität in `locations`, niemals `geo_point`.

### Geo-Status-Logik

```
geoComplete = latitude != null && longitude != null && geo_point != null
```
Wird visuell als Badge angezeigt (`GeoStatusBadge`) — sowohl im editierbaren
als auch im read-only Zweig.

### Sicherheits-Patterns, die übernommen werden sollten

| Pattern | Umsetzung in `updateLocationAction` | Für Umhänge-Action relevant? |
|---|---|---|
| Ownership frisch aus DB lesen | `home_location_id` wird per `.eq('id', band_id)`-Query gelesen, **nie** aus Hidden Field | Ja — identisch für die Ziel-Band |
| Kein Vertrauen auf Hidden Fields | Formular sendet nur `band_id`; alle sicherheitsrelevanten IDs kommen aus der DB-Antwort | Ja |
| Serverseitige Nachprüfung unabhängig von UI | Exklusivitäts-Count wird in der Action erneut berechnet, nicht aus der Page übernommen | Teilweise — siehe unten, welche Prüfung beim Umhängen überhaupt nötig ist |
| Enge Fehlercodes statt generischer Meldungen | `location_error=shared_location`, `invalid_plz`, etc. | Ja — gleiches Muster für neue `location_error`-Codes |

### Bewertung: Ist das nicht-atomare Exklusivitäts-Gate beim Umhängen relevant?

**Nein, nicht in der bisherigen Form — aus einem strukturellen Grund:**

Das bestehende Gate schützt das **UPDATE einer geteilten `locations`-Zeile**
(Variante A: `plz`, `city_name`, `latitude`, `longitude` einer Location, die
von mehreren Bands referenziert wird). Der Exklusivitäts-Check existiert,
weil ein Schreiben in `locations` **alle** Bands träfe, die auf dieselbe Zeile
zeigen.

Der Umhänge-Write ist strukturell anders:

```sql
UPDATE bands SET home_location_id = :neue_location_id WHERE id = :band_id
```

- Es wird **nur eine Zeile in `bands`** verändert — die der aktuellen Band.
- `locations` wird **nicht** angefasst — weder die alte noch die neue Zeile.
- Ob die alte oder neue Location von 1 oder 50 anderen Bands geteilt wird, ist
  für die Korrektheit dieses UPDATEs **irrelevant**, weil keine geteilte Zeile
  geschrieben wird.

**Folgerung:** Für den Umhänge-Pfad braucht es **kein** Exklusivitäts-Gate wie
bei Variante A. Es braucht stattdessen:

1. Eine **Existenzprüfung** der Ziel-Location (`SELECT id FROM locations WHERE id = :ziel_id`) —
   verhindert das Setzen einer nicht existierenden ID.
2. **Keine** Prüfung, wie viele Bands die Ziel-Location bereits nutzen — das
   ist ausdrücklich der Zweck geteilter Locations (Orts-Stammdaten).
3. Race-Conditions sind hier weit weniger kritisch als bei Variante A: Zwei
   parallele Umhänge-Requests derselben Band überschreiben sich einfach
   gegenseitig (letzter Schreiber gewinnt) — das ist unkritisch, weil kein
   Datenverlust in `locations` entsteht, nur der Zeiger wechselt.

Das bestehende, dokumentiert nicht-atomare Muster aus Variante A ist also
**kein Blocker** für diesen Sprint — die Risikofläche ist strukturell kleiner.

---

## 3. Sicherer Umhänge-Pfad — Soll-Konzept

### Datenquelle für die Zielsuche

**Ausschließlich `public.locations` in der DB.** `plz-coords.json` ist
explizit die Frontend-Suchquelle für die `/bands`-Radius-Suche
(`BandExplorer.tsx`) und enthält **keine** DB-IDs, keinen `city_name`,
keine Bandanzahl — sie ist für diesen Zweck ungeeignet und darf nicht
verwendet werden.

### Vorgeschlagene Suchmechanik

Eine Server Action `searchLocationsAction` (oder ein Search-Endpoint), die
serverseitig gegen `locations` sucht:

- **PLZ exakt:** `.eq('plz', query)` wenn die Eingabe wie eine PLZ aussieht
  (`/^\d{4,5}$/`)
- **Ort per `ilike`:** `.ilike('city_name', `%${query}%`)` als Fallback/Ergänzung
- **Kombination:** Beide Kriterien mit `.or(...)` verknüpfen, damit sowohl
  „93155" als auch „Hemau" denselben Datensatz finden

**Mehrdeutigkeit, insbesondere AT:** Mehrere Orte können dieselbe PLZ teilen
(in Österreich häufiger als in Deutschland, da PLZ dort 4-stellig und
gröber sind). Die Suche darf deshalb **nie automatisch die "beste" Zeile
wählen** — sie muss immer eine Trefferliste zurückgeben, aus der der Admin
bewusst auswählt (siehe unten). `country`/`country_code` sollte in der
Trefferliste sichtbar sein, um PLZ-Kollisionen zwischen DE und AT (z. B.
vierstellige Überschneidungen) für den Admin erkennbar zu machen.

### Trefferliste — anzuzeigende Felder pro Zeile

| Feld | Quelle | Zweck |
|---|---|---|
| PLZ | `locations.plz` | Identifikation |
| Ort | `locations.city_name` | Identifikation |
| Landkreis / Region | `locations.landkreis`, `regierungsbezirk`, `bundesland` | Disambiguierung bei gleichem Ortsnamen |
| Land | `locations.country` / `country_code` | Disambiguierung DE/AT bei PLZ-Kollision |
| Geo-Status | abgeleitet: `latitude != null && longitude != null && geo_point != null` | zeigt an, ob Radius-Suche für die Ziel-Location greifen würde |
| `band_count` | `SELECT count(*) FROM bands WHERE home_location_id = locations.id` (pro Trefferzeile) | zeigt, ob Ziel bereits geteilt ist — rein informativ, kein Blocker |

### Ablauf

1. Admin gibt PLZ oder Ortsnamen ein → Trefferliste erscheint (read-only,
   noch kein Write).
2. Admin **wählt bewusst** eine Zeile aus der Liste — kein Auto-Select bei
   eindeutigem Treffer, da auch ein einzelner Treffer falsch sein kann
   (Tippfehler in der Anzeige o. ä.); explizite Auswahl ist die Sicherheitsbarriere.
3. **Bestätigungsschritt** vor dem Speichern: Anzeige „von → nach", z. B.
   ```
   Aktuell:  93155 Hemau (Landkreis Regensburg) · 3 Bands
   Neu:      92318 Neumarkt i.d.OPf. (Landkreis Neumarkt i.d.OPf.) · 4 Bands
   ```
4. Erst nach expliziter Bestätigung: Server Action schreibt **ausschließlich**
   `bands.home_location_id = :neue_id WHERE id = :band_id`.

### Harte Grenzen für den Write

- Kein Insert in `locations`.
- Kein Update an `locations` (weder alte noch neue Zeile).
- Kein `geo_point`-Write.
- Einziges geschriebenes Feld: `bands.home_location_id`.

---

## 4. Schema-Frage: `bands.updated_at`

**Befund aus dem Code (nicht geraten, nicht aus Beispiel-Rows inferiert):**

[`supabase/proudleut-schema.sql:334-368`](supabase/proudleut-schema.sql#L334-L368)
dokumentiert einen globalen Trigger-Mechanismus:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Trigger für alle Tabellen mit updated_at
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'bands', 'band_profiles', 'band_contacts',
      'event_types', 'band_types', 'lineups',
      'sound_worlds', 'moods', 'services',
      'locations',
      'media_assets', 'videos', 'social_profiles', 'reference_events',
      'band_band_types', 'band_relations'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
```

`'bands'` ist explizit in der Tabellen-Liste enthalten → laut dieser
Schema-Datei existiert `trg_bands_updated_at`, das `updated_at` bei jedem
UPDATE automatisch auf `now()` setzt.

**Aber — offene Schema-Frage, bewusst nicht geschlossen:**

`proudleut-schema.sql` ist eine **Referenz-/Design-Datei im Repo**, keine
Introspektion des tatsächlichen, aktuell laufenden Production-Schemas. Ob
dieser Trigger in der echten Production-DB tatsächlich angewendet wurde
(oder seither verändert/entfernt wurde), kann ich mit PostgREST-Zugriff
**nicht verifizieren** — ich habe keinen `information_schema`- oder
`pg_catalog`-Zugriff (bereits in früheren Sprints dieser Session
festgestellt). Ich rate hier bewusst nicht und leite auch nichts aus
Beispiel-Rows ab.

**→ Offene Frage für den SQL Editor, vor Implementierung zu klären:**

```sql
SELECT tgname, tgrelid::regclass AS table_name, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.bands'::regclass
  AND NOT tgisinternal;
```

Erwartetes Ergebnis, falls die Schema-Datei aktuell ist: eine Zeile
`trg_bands_updated_at` mit `tgenabled = 'O'` (enabled).

**Konsequenz für die Action, je nach Ergebnis:**
- Trigger vorhanden & enabled → Action muss `updated_at` **nicht** selbst setzen.
- Trigger fehlt oder disabled → Action **muss** `updated_at: new Date().toISOString()`
  explizit im UPDATE-Payload mitschreiben, sonst bleibt der Zeitstempel stehen.

---

## 5. UI-Frage: eigene Sektion oder Integration?

**Empfehlung: eigene, separate Sektion „Home-Location wechseln"**, unterhalb
der bestehenden `LocationEditSection`, aus folgenden Gründen:

- **Semantisch verschiedene Operationen:** Variante A editiert Attributwerte
  einer Location (`plz`, `city_name`, Koordinaten). Der Umhänge-Pfad wechselt,
  *welche* Location referenziert wird. Eine Vermischung in einem Formular
  würde die Fehlermodi vermengen (z. B. unklar, ob ein Speichern-Klick die
  aktuelle Zeile ändert oder eine andere zuweist).
- **Unterschiedliche Sicherheits-/UX-Logik:** Variante A ist bei geteilten
  Locations gesperrt: Der Umhänge-Pfad ist **gerade dort besonders relevant**
  — z. B. um eine Band aus einer fälschlich geteilten Location herauszulösen.
  Beide Pfade in einem UI-Block zu kombinieren würde die Sperr-Warnung
  verwässern.

### Verhältnis zur bestehenden Sperr-Warnung

**Sperre und Umhänge-Option stehen nebeneinander, nicht als Ersatz:**

- Bei geteilter Location bleibt die bestehende Warnung „Diese Location wird
  von X Bands genutzt … Bearbeitung ist in dieser Band-Maske gesperrt"
  unverändert bestehen — sie bezieht sich weiterhin nur auf das Editieren
  der aktuellen Location-Zeile (Variante A).
- Zusätzlich erscheint darunter (oder als eigene Karte) die neue Sektion
  „Home-Location wechseln", die **unabhängig vom Sharing-Status** immer
  verfügbar ist — denn das Umhängen ist ja gerade der Weg, um eine Band aus
  einer geteilten Location herauszulösen, ohne die geteilte Zeile selbst zu
  berühren.
- Klarer Hinweistext zur Abgrenzung, z. B.: „Um nur die Bezeichnung oder
  Koordinaten dieser Location zu ändern, siehe oben. Um diese Band einer
  anderen, bereits bestehenden Location zuzuordnen, nutze diese Sektion."

---

## 6. Zusammenfassung

### Empfohlene minimale Umsetzung

1. Server Action `searchLocationsAction(query: string)` — read-only Suche
   gegen `locations` (PLZ exakt + `ilike` auf `city_name`), gibt Trefferliste
   inkl. `band_count` und Geo-Status zurück.
2. Client Component `LocationReassignSection` (o. ä.) — eigene Sektion unter
   `LocationEditSection`: Sucheingabe → Trefferliste → Auswahl → Bestätigung
   (von → nach) → Submit.
3. Server Action `reassignLocationAction(band_id, new_location_id)`:
   - `band_id` und `new_location_id` aus FormData
   - Existenzprüfung: Band existiert? Ziel-Location existiert?
   - **Kein** Exklusivitäts-Gate nötig (siehe Abschnitt 2)
   - UPDATE ausschließlich `bands.home_location_id`
   - `updated_at` nur explizit setzen, falls Abschnitt 4 den Trigger widerlegt
   - redirect mit `location_reassign_saved=1` / `location_reassign_error=...`
4. `page.tsx`: neue `searchParams`-Felder, Fehlermeldungs-Map, Einbindung der
   neuen Sektion.

### Betroffene Dateien (voraussichtlich)

- `app/admin/bands/[id]/actions.ts` — zwei neue Server Actions
- `app/admin/bands/[id]/page.tsx` — neue SearchParams, Fehlermeldungen, neue Sektion einbinden
- neue Datei: `app/admin/bands/[id]/LocationReassignSection.tsx` (Client Component)
- **keine** Änderungen an `LocationEditSection.tsx`, `BandExplorer.tsx`, `locations`-Schema

### Offene Fragen

1. **Schema-Frage (Abschnitt 4):** Existiert `trg_bands_updated_at` tatsächlich
   in Production? → SQL-Query oben im SQL Editor ausführen, bevor die Action
   geschrieben wird.
2. Soll die Suche serverseitig (Server Action, Redirect-basiert wie die
   übrigen Admin-Formen) oder als kleine client-seitige Live-Suche (z. B.
   `fetch` an eine API-Route mit Debounce) umgesetzt werden? Beides ist mit
   dem bestehenden Stack möglich; Server-Action-Redirect ist konsistenter mit
   dem Rest des Admins, eine Live-Suche wäre komfortabler bei vielen Treffern.
3. Soll es ein Audit-Log/Protokoll für Umhänge-Vorgänge geben (wer hat wann
   welche Band von welcher zu welcher Location verschoben)? Aktuell gibt es
   in keinem Admin-Bereich ein Audit-Log — wäre eine neue Fähigkeit, kein
   bestehendes Muster.
4. Kein echter Testfall ist festgelegt (siehe Abschnitt 0 und synthetischer
   Testansatz unten) — muss vor der Implementierung bewusst gewählt werden.

### Risiken

- **Falsche Ziel-Location durch Tippfehler in der Trefferliste:** mitigiert
  durch Pflicht-Bestätigungsschritt mit „von → nach"-Anzeige vor dem Write.
- **PLZ-Kollision DE/AT bei 4-stelligen PLZ:** mitigiert durch Anzeige von
  `country`/`country_code` in der Trefferliste.
- **Vergessener `updated_at`-Write, falls Trigger nicht existiert:** siehe
  offene Schema-Frage — muss vor Implementierung geklärt sein, sonst bleibt
  `updated_at` nach einem Umhängen fälschlich alt.
- **Doppelte Submits / Doppelklick auf Bestätigen:** unkritisch, da
  `UPDATE bands SET home_location_id = X` idempotent ist — ein zweiter
  identischer Write ändert nichts weiter.
- **Verwechslung mit Variante A (Location-Edit) durch Admin:** mitigiert durch
  separate Sektion mit eigenem Bestätigungsschritt und Abgrenzungstext (Abschnitt 5).

### Akzeptanzkriterien

- Admin kann eine Ziel-Location über PLZ oder Ortsname suchen; Trefferliste
  zeigt PLZ, Ort, Region, Land, Geo-Status, `band_count`.
- Admin muss eine Zeile explizit auswählen — keine automatische Vorauswahl.
- Vor dem Speichern erscheint eine Bestätigung mit „von → nach".
- Nach dem Speichern ist ausschließlich `bands.home_location_id` verändert.
- `locations`-Tabelle ist nachweislich unverändert (weder alte noch neue Zeile).
- Kein Insert in `locations`, kein `geo_point`-Write, keine Änderung an `plz-coords.json`-Logik.
- Sperr-Warnung bei geteilten Locations (Variante A) bleibt unverändert bestehen und wird durch die neue Sektion nicht ersetzt.
- Feature funktioniert unabhängig davon, ob die aktuelle oder die Ziel-Location geteilt ist.

### Verify-Plan nach einem echten Umhängen (read-only, nach Ausführung)

```sql
-- 1. home_location_id wurde neu gesetzt
SELECT id, name, slug, home_location_id, updated_at
FROM bands WHERE id = :band_id;
-- erwartet: home_location_id = neue Ziel-ID, updated_at aktualisiert

-- 2. band_count der ALTEN Location: -1 gegenüber vorher
SELECT count(*) FROM bands WHERE home_location_id = :alte_location_id;

-- 3. band_count der NEUEN Location: +1 gegenüber vorher
SELECT count(*) FROM bands WHERE home_location_id = :neue_location_id;

-- 4. locations-Tabelle nachweislich unverändert (Diff gegen Vorher-Snapshot)
SELECT id, plz, city_name, landkreis, regierungsbezirk, bundesland,
       country, country_code, latitude, longitude, geo_point, updated_at
FROM locations WHERE id IN (:alte_location_id, :neue_location_id);
-- erwartet: alle Felder identisch zum Vorher-Stand, insbesondere
-- updated_at NICHT verändert (kein Trigger-Fire, da locations nicht geschrieben wurde)
```

### Synthetischer Testansatz (kein echter Fall festgelegt)

Da kein echter Testfall vorliegt, wird ein **kontrolliertes Hin- und
Zurück-Umhängen** empfohlen, statt einen Fall aus der Produktionsliste fest
zuzuweisen. Auswahlkriterien für einen unkritischen Testkandidaten:

1. **Band mit exklusiver Home-Location** (`band_count === 1` an der
   aktuellen Location) — vermeidet, dass ein Test versehentlich eine
   geteilte Zeile betrifft, deren Bedeutung für andere Bands unklar ist.
2. **Zielkandidat ebenfalls mit bekanntem, kleinem `band_count`** — bevorzugt
   eine Location, die bereits von 1–2 anderen Bands genutzt wird, damit vor
   und nach dem Test klar zählbar ist, ob genau +1/-1 eingetreten ist.
3. **Keine Bandart-, SEO- oder Trust-kritische Band** — keine Band, die
   aktuell in Referenz-Events, Homepage-Slidern oder Kategorieseiten prominent
   verlinkt ist (vermeidet sichtbare Nutzerauswirkung während des Tests).
4. **Geografisch plausibler Test-Move**, um keine falschen echten Ortsdaten
   zu erzeugen — z. B. Umhängen zu einer Location im selben Landkreis, dann
   unmittelbar zurück zur ursprünglichen `home_location_id`.
5. Nach jedem Test-Schritt den Verify-Plan (oben) ausführen, bevor der
   Rück-Umhänge-Schritt erfolgt.

Die konkrete Band- und Location-Auswahl erfolgt bewusst **nicht** in diesem
Bericht — das ist eine Entscheidung für den Umsetzungssprint, basierend auf
einer aktuellen Abfrage von Bands mit `band_count = 1`.

### Vorschlag für den späteren Umsetzungs-Prompt

> „Bitte implementiere den Umhänge-Pfad aus
> `docs/analysebericht-admin-home-location-wechsel.md` als
> Variante-A-analoges, aber eigenständiges Feature: neue Server Actions
> `searchLocationsAction` und `reassignLocationAction`, neue Client Component
> `LocationReassignSection`, Einbindung in `page.tsx` als eigene Sektion unter
> der bestehenden `LocationEditSection`. Vor Beginn: SQL-Query aus Abschnitt 4
> im SQL Editor ausführen und mir das Ergebnis zur Trigger-Existenz zeigen,
> bevor `updated_at`-Handling in der Action festgelegt wird. Kein Insert, kein
> `geo_point`-Write, einziges geschriebenes Feld ist `bands.home_location_id`.
> Testfall: kontrolliertes Hin- und Zurück-Umhängen an einer nach den
> Kriterien aus Abschnitt 6 (synthetischer Testansatz) frisch zu wählenden,
> unkritischen Band — kein Donnaweda/Neumarkt-Fall, der existiert nicht."
