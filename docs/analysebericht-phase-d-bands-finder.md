# Analysebericht: Phase D – /bands Finder von Airtable auf Supabase

**Datum:** 2026-06-18  
**Scope:** Vorbereitung der Migration von `/bands` (BandExplorer) von Airtable auf Supabase  
**Status:** Analyse abgeschlossen – Umsetzung noch nicht begonnen

---

## 1. Aktueller Datenpfad `/bands`

```
getBands()                         ← lib/airtable/queries.ts
  → normalizeBand()                ← lib/airtable/normalizeBand.ts
  → Band[]
  → activeBands = filter(status === 'active')
  → getBandRegionBucket() für jede aktive Band (server-side)
  → regions = REGION_ORDER.filter(r => activeBands.some(b => bucket === r))
  → <BandExplorer bands={activeBands} regions={regions} />
```

**Betroffene Dateien:**
- `app/bands/page.tsx` — Server Component, `revalidate = 300`, ruft Airtable + Sanity parallel ab
- `lib/airtable/queries.ts` — `getBands()` (muss ersetzt werden)
- `components/bands/BandExplorer.tsx` — `'use client'`, gesamte Filterlogik client-seitig

Der `BandExplorer` ist ein reiner Client-Filter über ein vorab geladenes `Band[]`-Array. Es gibt keinen Suchserver, keine API-Route, keine Live-Abfrage.

---

## 2. Finder-Logik und Pagination

`BandExplorer.tsx` → `'use client'` → alle Filter laufen als `Array.filter()` über `shuffled` (auf mount einmalig gemischt).

### Filter (Reihenfolge der Anwendung)

| Filter | URL-Param | Feld auf Band | Aktueller Match |
|--------|-----------|---------------|-----------------|
| Freitext | `?suche=` | name, shortDescription, category, location.city, location.district, location.administrativeRegion, location.postalCode | `String.includes()` case-insensitive |
| Anlass | `?anlass=` | `band.eventTypes[]` (AT-Displaynamen) | `bandMatchesCategory()` → **muss zu `bandMatchesCategorySB()` werden** |
| Region | `?region=` | `band.location.administrativeRegion` | `getBandRegionBucket()` → 7 Bezirke + „Außerhalb Bayerns" |
| Bandtyp | `?bandtyp=` | `band.category` (primäre Bandart) | Direktvergleich (case-insensitive) |
| PLZ-Radius | (in-UI, kein URL-Param) | `band.location.latitude` + `band.location.longitude` | Haversine ≤ radiusKm |

### Shuffle und Sortierung
- Beim ersten Mount wird `shuffle(bands)` ausgeführt (Fisher-Yates) → zufällige, nicht-deterministischische Reihenfolge
- Bei aktivem Radius (radiusKm > 0 && centerCoords) wird nach Entfernung aufsteigend sortiert (nächste Band zuerst)

### Pagination
- Initial: `visibleCount = 24`
- „Weitere Bands anzeigen"-Button: `+24` Schritte
- Bei jedem Filter-Reset oder Filter-Wechsel: `visibleCount` zurück auf 24
- Scrollt nach Load-More zur ersten neuen Card

### PLZ-Erkennung und Haversine (bereits implementiert)
- `PLZ_RE = /^\d{5}$/` erkennt automatisch PLZ im Freitextfeld
- `loadPlzCoords()` — lazy, einmalig, in-memory gecacht nach erstem Laden
- Quelle: `public/data/plz-coords-de.json` (7546 deutsche 5-stellige PLZ, Format: `{"PLZ": [lat, lon]}`)
- `haversineKm(lat1, lon1, lat2, lon2)` ist implementiert (Erdradius 6371 km)
- Bei erkannter PLZ + gewähltem Radius werden `radiusOptions = [25, 50, 100]` km eingeblendet

---

## 3. Supabase-Zielpfad

```
getAllBandsFromSupabase()           ← lib/supabase/queries.ts
  → { data, error }
  → if (error) throw error
  → data.map(normalizeBandFromSupabase)  ← lib/supabase/normalizeBand.ts
  → Band[]
  → activeBands = filter(status === 'active')
  → getBandRegionBucket() (unverändert – liest nur band.location.administrativeRegion)
  → regions = ...
  → <BandExplorer bands={activeBands} regions={regions} />
```

`getAllBandsFromSupabase()` fetcht bereits alle für den Finder benötigten Felder:

```sql
id, name, slug, status,
band_profiles(short_description),
locations(city_name, landkreis, regierungsbezirk, plz, latitude, longitude),
media_assets(url, alt_text, role, sort_order),
band_event_types(sort_order, event_types(name, slug)),
band_band_types(is_primary, sort_order, band_types(name, slug))
```

`normalizeBandFromSupabase()` populiert bereits:
- `band.categorySlugs[]` aus `band_event_types → event_types.slug` (für `bandMatchesCategorySB`)
- `band.location.latitude` + `band.location.longitude` aus `locations` (für Haversine)
- `band.location.administrativeRegion` aus `locations.regierungsbezirk` (für Region-Filter)
- `band.category` = `bandartNames[0]` (primäre Bandart, für Bandtyp-Filter)
- `band.status` = normalisiert zu `'active'|'new'|'inactive'` (für activeBands-Filter)

**Kein neues Query-Feld nötig. Keine Änderung an normalizeBandFromSupabase.**

---

## 4. PLZ/Umkreissuche/Haversine

### Was bereits fertig ist
- Haversine-Funktion in `BandExplorer.tsx:26–36` — unverändert nutzbar
- PLZ-Lookup aus `plz-coords-de.json` — gibt Mittelpunkt des Nutzers zurück
- Band-Koordinaten kommen nach Migration aus `band.location.latitude/longitude` (SB: `locations.latitude`, `locations.longitude`)

### Lücken in den Supabase-Banddaten (Standortkoordinaten)

Folgende 5 aktive Bands haben in Supabase **keine lat/lon**:

| Slug | Bandname | PLZ | Landkreis |
|------|----------|-----|-----------|
| broadway | Broadway | — | — |
| coverage-band | Coverage Band | — | — |
| ennstal-kryner-volksmusik | Ennstal Kryner Volksmusik | 8940 (AT) | — |
| mountaincrew-band | MountainCrew Band | — | — |
| rotzloeffl-band | Rotzlöffl Band | — | — |

**Verhalten bei aktivem Radius:** Diese Bands werden korrekt ausgeblendet (`lat == null → return false`). Kein Fehler, kein Absturz – das ist das gewünschte Verhalten.

### Österreich (ennstal-kryner-volksmusik)
- PLZ 8940 (Schladming, AT) ist **nicht** in `plz-coords-de.json` enthalten (nur deutsche PLZ)
- Wenn ein Nutzer „8940" als Suche eingibt → PLZ-Lookup findet keinen Eintrag → `centerCoords = null` → Radius-UI bleibt verborgen
- Eigenständig als Band ohne Koordinaten → korrekt behandelt

### 8 Bands ohne `regierungsbezirk`
Diese Bands landen in `getBandRegionBucket()` auf `'Außerhalb Bayerns'` (sofern irgendein Location-Feld vorhanden) oder `null` (wenn gar kein Location-Datum). Das ist bereits jetzt das gleiche Verhalten wie bei Airtable.

---

## 5. PLZ-Mittelpunkt: Optionen und Entscheidung

| Option | Beschreibung | Aufwand | Empfehlung |
|--------|--------------|---------|------------|
| **A – Status quo** | Nutzerprofil: PLZ → `plz-coords-de.json` → [lat, lon] | 0 | **Ja** |
| B – Browser-Geolocation | `navigator.geolocation.getCurrentPosition()` | gering | Ergänzung möglich |
| C – Reverse-Geocoding-API | PLZ → externe API (z.B. OpenPlz) | mittel | Nicht nötig |

**Begründung für Option A:** Die Suche nach PLZ funktioniert bereits. Für Österreich und unbekannte PLZ gibt es sauberes Fallback-Verhalten. Ein Geocoding-Service wäre Over-Engineering für den aktuellen Scope.

---

## 6. Empfehlung

Phase D erfordert **exakt 2 Datei-Änderungen**:

### Änderung 1: `app/bands/page.tsx`
Ersetze `getBands()` durch `getAllBandsFromSupabase()` + `normalizeBandFromSupabase()` (identisches Pattern wie Phase C in `app/veranstaltung/[slug]/page.tsx`).

```diff
- import { getBands } from '@/lib/airtable/queries';
+ import { getAllBandsFromSupabase } from '@/lib/supabase/queries';
+ import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';

// in BandsPage():
- const [bands, featuredSlides] = await Promise.all([getBands(), ...]);
+ const [bandsResult, featuredSlides] = await Promise.all([getAllBandsFromSupabase(), ...]);
+ if (bandsResult.error) throw bandsResult.error;
+ const bands = (bandsResult.data ?? []).map(normalizeBandFromSupabase);
```

### Änderung 2: `components/bands/BandExplorer.tsx`
Ersetze `bandMatchesCategory` durch `bandMatchesCategorySB` (1 Import + 1 Aufruf).

```diff
- import { CATEGORIES, bandMatchesCategory } from '@/lib/categories';
+ import { CATEGORIES, bandMatchesCategorySB } from '@/lib/categories';

// im filter (Zeile ~228):
- if (!cat || !bandMatchesCategory(band, cat)) return false;
+ if (!cat || !bandMatchesCategorySB(band, cat)) return false;
```

**Alle anderen Finder-Teile bleiben unverändert:** Haversine, PLZ-Lookup, Region-Filter, Bandtyp-Filter, Pagination, URL-State-Sync.

---

## 7. Umsetzungsplan

### D1 – Datenpfad umstellen (server-seitig)
**Datei:** `app/bands/page.tsx`  
**Änderung:** `getBands()` → `getAllBandsFromSupabase()` + `normalizeBandFromSupabase()`  
**Pattern:** identisch zu Phase C (veranstaltung/[slug])  
**Risiko:** gering – gleicher Return-Typ `Band[]`, gleiche Felder

### D2 – Anlass-Filter auf Supabase-Slugs umstellen (client-seitig)
**Datei:** `components/bands/BandExplorer.tsx`  
**Änderung:** 1 Import + 1 Aufruf: `bandMatchesCategory` → `bandMatchesCategorySB`  
**Voraussetzung:** D1 muss abgeschlossen sein (Band muss `categorySlugs[]` enthalten)  
**Risiko:** gering – `bandMatchesCategorySB` ist bereits getestet (Phase C)

### D3 – Verifikation
- Build lokal (`npm run build`) muss fehlerfrei durchlaufen
- `/bands` im Browser: alle 8 Anlass-Filter korrekte Bandmengen
- PLZ-Suche mit Radius: funktioniert für Bands mit Koordinaten
- Bands ohne Koordinaten: korrekt ausgeblendet bei aktivem Radius
- Region-Filter: funktioniert wie zuvor (liest `administrativeRegion`)
- Commit: `feat(bands): use supabase bands for finder page`

---

## Appendix: Feldmapping Airtable → Supabase (für Finder)

| Finder-Feld | AT-Quelle (via normalizeBand) | SB-Quelle (via normalizeBandFromSupabase) | Status |
|-------------|-------------------------------|-------------------------------------------|--------|
| `band.name` | Airtable „Name" | `bands.name` | OK |
| `band.slug` | Airtable „Slug" | `bands.slug` | OK |
| `band.status` | Airtable „Status" | `bands.status` → normalisiert | OK |
| `band.shortDescription` | Airtable | `band_profiles.short_description` | OK |
| `band.category` | Airtable Bandart | `band_band_types` (is_primary) | OK |
| `band.eventTypes[]` | Airtable Eventtypen | `band_event_types → event_types.name` | OK |
| `band.categorySlugs[]` | n/a | `band_event_types → event_types.slug` | OK (für SB-Filter) |
| `band.location.city` | Airtable | `locations.city_name` | OK |
| `band.location.district` | Airtable | `locations.landkreis` | OK |
| `band.location.administrativeRegion` | Airtable | `locations.regierungsbezirk` | OK |
| `band.location.postalCode` | Airtable | `locations.plz` | OK |
| `band.location.latitude` | Airtable (selten gefüllt) | `locations.latitude` | OK (5 fehlend) |
| `band.location.longitude` | Airtable (selten gefüllt) | `locations.longitude` | OK (5 fehlend) |
| `band.thumbnailImage / heroImage` | Airtable Attachments | `media_assets` (role: thumbnail/hero) | OK |
