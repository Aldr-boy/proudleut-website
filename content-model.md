# content-model.md – proudleut.com

> Dieses Dokument beschreibt das konkrete Datenmodell für den proudleut-Neuaufbau.
>
> Projektziel und Positionierung → `projekt.md`  
> Technische Architektur und Migration → `migration-notes.md`  
> Gestalterische Referenz → `design-reference.md`  
> Arbeitsregeln → `CLAUDE.md`

---

## Grundsatz

Airtable bleibt die Single Source of Truth für Banddaten. Im Frontend wird aber nicht direkt
mit rohen Airtable-Feldnamen gearbeitet. Alle Airtable Records werden zuerst in stabile,
sprechende TypeScript-Typen normalisiert.

```txt
Airtable Record → normalizeBand() → Band → UI
```

Ziel:

- UI-Komponenten bleiben lesbar und wartbar
- historische Airtable-Feldnamen bleiben gekapselt
- Fallbacks werden zentral gelöst
- SEO und JSON-LD greifen auf saubere Daten zu
- spätere Änderungen an Airtable-Feldern sind einfacher kontrollierbar

---

## Empfohlene Dateistruktur

```txt
lib/types/band.ts
lib/types/image.ts
lib/airtable/client.ts
lib/airtable/queries.ts
lib/airtable/normalizeBand.ts
lib/airtable/normalizeImage.ts
lib/sanity/client.ts
lib/sanity/queries.ts
lib/seo/jsonLd.ts
```

---

## Frontend-Type: `Band`

```typescript
export type Band = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'new' | 'inactive';

  category?: string;
  eventTypes: string[];

  shortDescription?: string;
  description?: string;
  metaDescription?: string;

  websiteUrl?: string;
  youtubeVideoUrl?: string;

  logo?: ImageAsset;
  heroImage?: ImageAsset;
  thumbnailImage?: ImageAsset;
  gallery: ImageAsset[];

  location: BandLocation;
  weddingInfo?: WeddingInfo;
  socialLinks: SocialLinks;
  similarBands: SimilarBandReferences;
};
```

---

## Frontend-Type: `ImageAsset`

```typescript
export type ImageAsset = {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  source: 'airtable' | 'sanity' | 'static' | 'external';
};
```

**Regeln:**

- `alt` darf nie komplett leer sein. Wenn kein spezifischer Alt-Text vorhanden ist, wird ein
  ruhiger Fallback gesetzt, z. B. `Livefoto von ${band.name}`.
- Airtable-Attachment-URLs werden nicht als dauerhaft stabile Bildquelle vorausgesetzt.
- Die finale Bildstrategie wird in `migration-notes.md` dokumentiert.
- UI-Komponenten sollen nur `ImageAsset` kennen, nicht das rohe Airtable-Attachment-Objekt.

---

## Frontend-Type: `BandLocation`

```typescript
export type BandLocation = {
  postalCode?: string;
  city?: string;
  district?: string;
  administrativeRegion?: string;
  state?: string;
  country?: string;
};
```

Mapping:

| Frontend-Feld | Airtable-Feld |
|---|---|
| `postalCode` | `PLZ` |
| `city` | `Orte (from Orte-Master)` |
| `district` | `landkreise (from Orte-Master)` |
| `administrativeRegion` | `regierungsbezirk (from Orte-Master)` |
| `state` | `bundesland (from AT-PLZ Referenz)` |
| `country` | vorerst Fallback `Deutschland`, sofern nicht anders gepflegt |

---

## Frontend-Type: `WeddingInfo`

```typescript
export type WeddingInfo = {
  bandSize?: string;
  constellation?: string;
  kidnappingBride?: boolean | null;
  feeRange?: string;
  moderation?: boolean | null;
  possiblePlaytimes?: string;
  weddingDescription?: string;
};
```

Mapping:

| Frontend-Feld | Airtable-Feld |
|---|---|
| `bandSize` | `Info - Bandgröße` |
| `constellation` | `Info - Konstellation` |
| `kidnappingBride` | `Info - Brautentführung` |
| `feeRange` | `Info - Gagenniveau` |
| `moderation` | `Info - Moderation` |
| `possiblePlaytimes` | `Info - Mögliche...` |
| `weddingDescription` | `Info - So feiern wir Hochzeit` |

**Hinweis:**

Airtable-Werte wie `ja` / `nein` sollten in der Normalisierung in `true` / `false` / `null`
übersetzt werden. UI-Komponenten entscheiden dann über die Darstellung.

---

## Frontend-Type: `SocialLinks`

```typescript
export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  spotify?: string;
  youtube?: string;
};
```

Mapping:

| Frontend-Feld | Airtable-Feld |
|---|---|
| `facebook` | `Social - Facebook` |
| `instagram` | `Social - Instagram` |
| `spotify` | `Social - Spotify` |
| `youtube` | `Social - YouTube` |

---

## Frontend-Type: `SimilarBandReferences`

```typescript
export type SimilarBandReferences = {
  manual1?: string;
  manual2?: string;
  manual3?: string;
};
```

Mapping:

| Frontend-Feld | Airtable-Feld |
|---|---|
| `manual1` | `similar_1` |
| `manual2` | `similar_2` |
| `manual3` | `similar_3` |

**Logik:**

1. Manuelle Empfehlungen über exakten Bandnamen suchen
2. Wenn weniger als drei gefunden werden: per Tag-/Kategorie-Matching auffüllen
3. Nie die aktuelle Band selbst empfehlen
4. Nur aktive Bands anzeigen

---

## Airtable → Band Mapping

| Frontend-Feld | Airtable-Feld | Hinweis |
|---|---|---|
| `id` | Airtable Record ID | intern |
| `name` | `Bandname` | Anzeigename |
| `slug` | `Slug` | URL-Slug |
| `status` | `Webflow Status` | `Active` → `active`, `New` → `new`, sonst `inactive` |
| `category` | `Hauptkategorie/Bandart` | Haupt-Bandart |
| `eventTypes` | `Veranstaltungstypen` | Array, leeres Array als Fallback |
| `shortDescription` | `Short Descripton /...` | Tippfehler in Airtable bleibt gekapselt |
| `description` | `Main Text` | Hauptbeschreibung |
| `metaDescription` | `Meta Description` | SEO |
| `websiteUrl` | `Website Link` | externe Bandseite |
| `youtubeVideoUrl` | `YouTube Video Link` | optional |
| `logo` | `Bandlogo` | Attachment → `ImageAsset` |
| `heroImage` | `Main IMG - Hero` | Attachment → `ImageAsset` |
| `thumbnailImage` | `Main IMG - Thumbnail` | Attachment → `ImageAsset` |
| `gallery` | `Gallery` | Attachment Array → `ImageAsset[]` |

---

## Normalisierungsregeln

### Strings

- Leere Strings werden zu `undefined`
- Strings werden getrimmt
- Mehrfache Leerzeichen nur bereinigen, wenn dadurch Inhalt nicht verändert wird

### Arrays

- Fehlende Multi-Select-Felder werden zu `[]`
- Doppelte Werte entfernen
- Reihenfolge aus Airtable erhalten, sofern sinnvoll

### URLs

- Nur gültige URLs übernehmen
- Fehlende Protokolle wenn möglich ergänzen (`https://`)
- Ungültige URLs nicht im UI rendern

### Status

```typescript
function normalizeStatus(value?: string): Band['status'] {
  if (value === 'Active') return 'active';
  if (value === 'New') return 'new';
  return 'inactive';
}
```

**Anzeige-Regel:**

Öffentlich werden vorerst nur Bands mit `status === 'active'` angezeigt. `new` kann später
für interne Vorschau oder Staging genutzt werden.

---

## Fallbacks

### Fehlender Kurztext

Wenn `shortDescription` fehlt:

1. aus `description` einen kurzen Auszug erstellen
2. wenn auch das fehlt: kein Blindtext, sondern Kurztextbereich ausblenden

### Fehlendes Hero-Bild

Wenn `heroImage` fehlt:

1. `thumbnailImage` verwenden
2. erstes Bild aus `gallery` verwenden
3. ruhigen statischen Fallback verwenden

### Fehlender Alt-Text

Fallback:

```txt
Livefoto von [Bandname]
```

Bei Logos:

```txt
Logo von [Bandname]
```

### Fehlende Location

- Kein falscher Ort anzeigen
- Regionale Filter sollen fehlende Werte robust behandeln
- JSON-LD Location nur ausgeben, wenn sinnvolle Daten vorhanden sind

---

## Kategorie-Modell: Sanity `eventCategory`

Sanity verwaltet redaktionelle Kategorie-Daten. Airtable verwaltet Band-Eignungen. Deshalb
braucht jede Sanity-Kategorie ein Mapping zu Airtable-Eventtypen.

```typescript
export type EventCategory = {
  title: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  sortOrder?: number;
  heroImage?: ImageAsset;
  airtableEventTypes: string[];
};
```

Beispiel:

```txt
title: Hochzeit
slug: hochzeit
airtableEventTypes: ["Hochzeit"]
```

Oder:

```txt
title: Firmenfeier & Business Event
slug: firmenfeier
airtableEventTypes: ["Firmenfeier & Business Event", "Firmenevent", "Business Event"]
```

---

## Kategorie-Filterlogik

Eine Band gehört zu einer Kategorie, wenn mindestens ein `band.eventTypes`-Wert in
`eventCategory.airtableEventTypes` enthalten ist.

```typescript
function bandMatchesCategory(band: Band, category: EventCategory) {
  return band.eventTypes.some((eventType) =>
    category.airtableEventTypes.includes(eventType)
  );
}
```

**Wichtig:**

Keine Kategorie-Filter hart im Code verdrahten, wenn sie aus Sanity kommen sollen.

---

## JSON-LD Datenquellen

### `MusicGroup` für Bandprofile

Quelle: `Band`

- `name` ← `band.name`
- `url` ← `https://proudleut.com/band/${band.slug}`
- `sameAs` ← Website + Social Links
- `genre` ← `band.category` und/oder `band.eventTypes`
- `location` ← `band.location`, nur wenn sinnvoll vorhanden

### `CollectionPage` / `ItemList` für Kategorien

Quelle: `EventCategory` + sichtbare `Band[]`

- Kategorie-Titel und URL aus Sanity
- sichtbare Bands aus Airtable
- keine unsichtbaren/inaktiven Bands in `ItemList`

### `WebSite` / `Organization` / `Person` für Homepage

Quelle: statische Site-Konfiguration + Sanity-Inhalte

---

## Felder, die nicht direkt ins UI sollen

Diese Airtable-Felder sind technische oder historische Hilfsfelder und sollen nicht im neuen
Frontend genutzt werden:

- `search_tokens_all`
- `filter_tags_regio`
- `event_keys`
- `Webflow Record ID`
- `Last Published`
- `Band Performance`
- `Band Geo (Daily)`
- `Band Pages`

---

## Offene Entscheidungen

Diese Punkte müssen nicht vor dem ersten technischen Durchstich final gelöst sein, sollten
aber bewusst entschieden werden:

- Finale Bildstrategie: Airtable temporär, CDN-Spiegelung, Sanity Assets oder Proxy?
- Werden `New`-Bands öffentlich angezeigt oder nur intern?
- Welche alten Webflow-URLs müssen 1:1 erhalten bleiben?
- Welche Kategorie-Slugs sind final SEO-strategisch sinnvoll?
- Gibt es später regionale Landingpages zusätzlich zu `/veranstaltung/[slug]`?

---

## Startauftrag für Claude Code

Der erste technische Schritt sollte nicht die finale Homepage sein, sondern ein Durchstich:

```txt
Eine echte Band aus Airtable laden, normalisieren und unter /band/[slug] schlicht rendern.
Noch kein finales Design, noch keine Filter, noch kein vollständiges Sanity-Setup.
Ziel: Datenfluss, Typen, Bildannahmen und Vercel-Build prüfen.
```
