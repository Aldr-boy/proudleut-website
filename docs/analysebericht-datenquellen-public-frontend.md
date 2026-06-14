# Analysebericht: Datenquellen im öffentlichen proudleut-Frontend

**Stand:** 2026-06-14  
**Typ:** Read-only Architekturbefund  
**Autor:** Claude Code (Session-Analyse)

---

## 1. Zweck dieses Berichts

Dieser Bericht dokumentiert, welche externen und internen Datenquellen im öffentlichen
Frontend von proudleut.com für welche Route verwendet werden. Grundlage ist eine
vollständige Lektüre aller Route-Dateien, API-Handler, Datenschicht-Module und
Hilfsdateien. Es wurden keine Schreiboperationen durchgeführt, keine DB-Verbindungen
aufgebaut und keine Commits angelegt.

---

## 2. Datenquellen-Inventar

| Kürzel | Quelle | Typ | Zugriffsmodus | Datei(en) |
|---|---|---|---|---|
| **AT** | Airtable REST API | Extern, read-only | ISR (revalidate 300) | `lib/airtable/client.ts`, `lib/airtable/queries.ts`, `lib/airtable/normalizeBand.ts` |
| **SB** | Supabase PostgreSQL | Extern, read-only (public) | `force-dynamic` (kein ISR) | `lib/supabase/client.ts`, `lib/supabase/queries.ts`, `lib/supabase/normalizeBand.ts` |
| **SA** | Sanity CMS | Extern, optional | ISR (revalidate 300) | `sanity/lib/client.ts`, `sanity/lib/fetchBandsPageFeaturedSlider.ts`, `sanity/lib/fetchEventCategoryHero.ts` |
| **CAT** | `lib/categories.ts` | Intern, statisch | Build-Zeit + Runtime (kein Netzwerk) | `lib/categories.ts` |
| **STA** | Statische TS-Konstanten | Intern, statisch | Build-Zeit | `lib/content/faqs.ts`, `lib/content/testimonials.ts`, `lib/homepage/bandLogos.ts`, `lib/homepage/referenzEvents.ts`, `lib/homepage/heroMosaicImages.ts` |
| **MK** | Make-Webhook | Extern, write-only | On-demand POST | `app/api/anfrage/route.ts` → `MAKE_ANFRAGE_WEBHOOK_URL` |
| **HDR** | `headers()` (Next.js) | Intern | Request-Zeit | `app/layout.tsx` |

**Nicht im öffentlichen Frontend genutzt:**
- Supabase Service-Role-Client (`lib/supabase/server.ts`) → ausschließlich Admin-Routen
- Airtable-Schreibzugriffe → von der Architektur ausgeschlossen

---

## 3. Route → Datenquelle Mapping

| Route | Datenquellen | Caching | Hinweise |
|---|---|---|---|
| `/` | AT + STA | ISR 300s | `getBands()` filtert `homepageReady`; STA ist rein statisch |
| `/bands` | AT + SA | ISR 300s | SA nur wenn Sanity konfiguriert; graceful null-Fallback |
| `/veranstaltung/[slug]` | AT + SA + CAT | ISR 300s | `generateStaticParams` aus CAT (5 Slugs); SA optional |
| `/band/[slug]` | SB | `force-dynamic` | Kein ISR; Supabase anon client; kein Airtable |
| `/ueber-mich` | AT | ISR 300s | `getBands()` → Bands per Namens-Match gefiltert |
| `/fuer-bands` | — | Statisch | Kein Datenabruf; nur lokale Konstanten im Component |
| `/kontakt` | — | Statisch | Page lädt keine Daten; KontaktFormular POSTet clientseitig |
| `/api/anfrage` | MK | — | Kein DB-Read; validiert POST-Payload, leitet an Make weiter |
| `/api/kontakt` | — | — | Stub; gibt `{ok:true, mode:'stub'}` zurück (Phase-2-Platzhalter) |
| `layout.tsx` | HDR | — | Liest nur `pathname` aus Request-Headers; kein Datenabruf |

---

## 4. Airtable: Nutzungspfade und Details

### 4.1 Welche Routen nutzen Airtable

`/` · `/bands` · `/veranstaltung/[slug]` · `/ueber-mich`

Alle über `getBands()` aus `lib/airtable/queries.ts`.

### 4.2 Was `getBands()` intern tut

```
getBands()
  └── getEventTypeMap()          → Airtable: Tabelle "Veranstaltungen"
        fields: event_canon (displayName), Slug (slug)
        → Map<recordId, {displayName, slug}>
  └── airtableFetch("Bands", …) → Airtable: Tabelle "Bands"
        filter: {Webflow Status}='Active'
        sort: Bandname asc
        pagination: offset-based
  └── normalizeBand(record, eventTypeMap) → Band-Typ
```

**Wichtig:** `getEventTypeMap()` wird bei **jedem `getBands()`-Aufruf** neu gefetcht.
Das bedeutet: In ISR-Zyklen wird die Veranstaltungs-Tabelle bei jedem Revalidierungszeitpunkt
doppelt abgerufen (einmal für die Event-Type-Map, einmal für die Bands). Kein Caching zwischen
den Calls innerhalb eines Request-Zyklus.

### 4.3 Normalisierung

Raw Airtable → `normalizeBand()` → `Band`-Typ. Keine rohen Feldnamen in UI-Komponenten.
`categorySlugs` kommt aus der Event-Type-Map (Veranstaltungen-Tabelle, Feld `Slug`).

### 4.4 Caching

Alle Airtable-Fetches nutzen Next.js `fetch` mit `{ next: { revalidate: 300 } }` (5 Minuten).
Kein On-Demand-Revalidierungs-Endpoint bisher implementiert.

### 4.5 Abgeleitete Filterlogik

`getBandsByCategory(categorySlug)` in `lib/airtable/queries.ts` filtert via
`band.categorySlugs?.includes(categorySlug)`. Dieser Slug kommt aus Airtable-Veranstaltungen,
nicht aus Supabase `event_types`. Die `/veranstaltung/[slug]`-Seite nutzt stattdessen
`bandMatchesCategory()` aus `lib/categories.ts`, das gegen `airtableEventTypes`-Strings
(Display-Namen) prüft — nicht gegen Slugs.

---

## 5. Supabase: Nutzungspfade und Details

### 5.1 Welche Routen nutzen Supabase (public)

Ausschließlich `/band/[slug]`.

### 5.2 Clients

| Client | Datei | Key | Einsatz |
|---|---|---|---|
| Anon-Client | `lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentliche Banddetailseite |
| Service-Role-Client | `lib/supabase/server.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Nur Admin (`server-only` import) |

### 5.3 Was `getBandFromSupabase(slug)` abruft

```sql
SELECT id, name, slug, ...
  JOIN band_event_types ( sort_order,
    event_types ( name, slug )
  )
WHERE slug = $1
```

`event_types.slug` wird direkt in `categorySlugs` des Band-Typs übernommen — ohne Filter
gegen `lib/categories.ts`. Das ist die Ursache der Chip-Link-Problematik (→ siehe Abschnitt 7.1).

### 5.4 Caching

`/band/[slug]` ist `force-dynamic` — kein ISR, kein Next.js-Cache. Jeder Request trifft
Supabase live.

### 5.5 `generateStaticParams` auf `/band/[slug]`

Nutzt `getAllBandsFromSupabase()` für SSG-Vorrendering — ebenfalls Supabase.
Im Gegensatz dazu nutzt `/bands` für `generateStaticParams` Airtable (`getAllActiveBandSlugs()`).

**Konsequenz:** Für Bands gilt eine Dual-Source-Situation:
- Band-Listing-Seiten: Airtable-gesteuert
- Band-Detailseiten: Supabase-gesteuert
- Ein Band muss in **beiden** Systemen korrekt angelegt sein, um im vollen Umfang sichtbar zu sein.

### 5.6 Supabase slug-Audit (Stand 2026-06-13)

38 aktive `event_types` in Supabase. Davon haben nur **2** einen Slug, der zu einem
`CATEGORIES`-Eintrag in `lib/categories.ts` passt: `hochzeit` und `festzelt`.

Die übrigen 36 Supabase-Slugs haben keinen CATEGORIES-Match — darunter z. B.
`firmenfeier-business-event` (Supabase) vs. `firmenfeier` (CATEGORIES).

---

## 6. Sanity: Nutzungspfade und Details

### 6.1 Welche Routen nutzen Sanity

`/bands` (optional) · `/veranstaltung/[slug]` (optional)

### 6.2 Konfigurationsabhängigkeit

```typescript
export const client = isSanityConfigured
  ? createClient({ projectId, dataset, apiVersion, useCdn: true })
  : null
```

Wenn `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` oder
`NEXT_PUBLIC_SANITY_API_VERSION` fehlen, ist `client = null` → alle Sanity-Fetches
geben `null` zurück. Die UI greift auf Fallbacks zurück.

### 6.3 Was Sanity liefert

| Fetch-Funktion | Sanity-Typ | Felder | Einsatz |
|---|---|---|---|
| `fetchBandsPageFeaturedSlider()` | `bandsPageFeaturedSlider` | enabled, slides (headline, text, image, ctaHref, …) | `/bands`: Featured-Slider oben |
| `fetchEventCategoryHero(slug)` | `eventCategoryHero` | heroImage, heroImageAlt, subtitle | `/veranstaltung/[slug]`: Hero-Bereich |

### 6.4 Was Sanity **nicht** liefert

- Banddaten (→ Airtable / Supabase)
- Routing / CATEGORIES (→ `lib/categories.ts`)
- Texte auf der Homepage (→ statische TS-Konstanten)

Sanity ist derzeit reine **optionale Anreicherungs-Quelle** für zwei Seiten. Es gibt
kein Sanity-getriebenes Routing.

---

## 7. Statische Daten und Hilfsdaten

### 7.1 `lib/categories.ts` (CAT)

5 `CategoryConfig`-Objekte, hartcodiert:

| slug | airtableEventTypes (Auszug) |
|---|---|
| `hochzeit` | Hochzeit |
| `festzelt` | Festzelt, Zoigl, Grottenfest, Biergarten, … (10 Werte) |
| `firmenfeier` | Firmenfeier & Business Event, Weihnachtsfeier, Sommerfest, … |
| `geburtstag` | Geburtstagsfeier, private Feiern, Jubiläum, Taufe, Familiennachmittage |
| `gala` | Empfang, Ball, Bankett, Ehrenabende, Vernissage |

**Funktion im System:**
- `generateStaticParams` für `/veranstaltung/[slug]` (5 Slugs)
- `bandMatchesCategory()` für Filterlogik auf Kategorie-Seiten
- `getCategoryBySlug()` als Chip-Link-Sicherheitsguard in `BandTagsSection.tsx`
- `getRelatedCategories()` für Verlinkung verwandter Kategorien

CATEGORIES ist die **einzige Quelle**, die öffentliche `/veranstaltung/`-URLs definiert —
nicht Sanity, nicht Supabase, nicht Airtable.

### 7.2 Statische TypeScript-Konstanten (STA)

| Datei | Inhalt | Einsatz |
|---|---|---|
| `lib/content/faqs.ts` | FAQ-Einträge | Homepage-FAQ-Section |
| `lib/content/testimonials.ts` | Testimonials | Homepage-Testimonials |
| `lib/homepage/bandLogos.ts` | Logo-URLs (Bands) | Homepage-LogoStrip |
| `lib/homepage/referenzEvents.ts` | Referenz-Event-Einträge | Homepage-ReferenzEvents |
| `lib/homepage/heroMosaicImages.ts` | Hero-Mosaikbilder | Homepage-HeroMosaic |

Alle mit Kommentar: „Temporär statisch – wird später durch Sanity ersetzt."

### 7.3 `lib/seo/jsonLd.ts`

`generateBandJsonLd(band: Band)` → `MusicGroup`-Schema.org-Objekt.  
Eingesetzt nur auf `/band/[slug]`. Felder: `name`, `url`, `sameAs` (Website + Social),
`genre` (aus `eventTypes` + `category`), `description`, `image`, `location`.

**Nicht eingesetzt:** `/bands`, Kategorie-Seiten, Homepage. Kein `sitemap.ts` oder
`robots.ts` im `app/`-Verzeichnis gefunden.

### 7.4 API-Handler ohne DB-Zugriff

**`/api/anfrage`** (`app/api/anfrage/route.ts`):
- Empfängt POST mit Anfrage-Payload (Name, E-Mail, Bandname etc.)
- Leitet per `fetch` an `MAKE_ANFRAGE_WEBHOOK_URL` weiter
- Keine DB-Reads, keine Airtable-Schreibzugriffe

**`/api/kontakt`** (`app/api/kontakt/route.ts`):
- Stub. Gibt immer `{ok:true, mode:'stub'}` zurück
- Phase-2-Platzhalter für Resend-Integration
- Das allgemeine Kontaktformular (`/kontakt`) schickt hierhin — Nachrichten werden
  aktuell **nicht verarbeitet**

### 7.5 `KontaktFormular`

- `'use client'`-Component; kein Datenabruf auf Page-Load
- POSTet clientseitig an `/api/kontakt` (Stub)
- Honeypot-Felder (`firma_hidden`, `website_hidden`) + `openedAt`-Timestamp als
  einfacher Spam-Schutz
- Unterschiedliche Anlass-Pfade: „Ich suche eine Band" → `/bands`, „Ich habe eine Band"
  → `/fuer-bands`, Allgemeine Anfrage → scrollt zum Formular

---

## 8. Architektonische Beobachtungen

### 8.1 Dual-Source-Architektur: Airtable vs. Supabase

Die öffentliche Banddarstellung ist auf zwei unabhängige Systeme aufgeteilt:

| Ebene | Quelle |
|---|---|
| Listing (`/bands`, `/`, Kategorie-Seiten) | Airtable |
| Detailseite (`/band/[slug]`) | Supabase |
| Event-Type-Taxonomie für Listing | Airtable `Veranstaltungen`-Tabelle + `lib/categories.ts` |
| Event-Type-Taxonomie für Detailseite | Supabase `event_types`-Tabelle |

Eine Band muss in beiden Systemen gepflegt und konsistent sein. Die Event-Type-Slugs
sind zwischen Airtable-Veranstaltungen (`Slug`-Feld) und Supabase `event_types.slug`
derzeit **nicht systematisch synchronisiert** (→ Auditbefund Abschnitt 5.6).

### 8.2 Chip-Link-Sicherheitsguard (Stand nach Fix 181b1e2)

`BandTagsSection.tsx` nutzt `slug && getCategoryBySlug(slug) ?` als Guard. Event-Type-Chips
auf der Detailseite verlinken nur dann zu `/veranstaltung/[slug]`, wenn der Supabase-Slug
in CATEGORIES bekannt ist. Alle anderen Chips erscheinen als unverlinkte `<span>`.

Derzeit gilt: nur `hochzeit` und `festzelt` erzeugen klickbare Links auf Detailseiten.
Für `firmenfeier`, `geburtstag`, `gala` gibt es keinen Supabase-Slug-Match.

### 8.3 CATEGORIES als einzige URL-Quelle für `/veranstaltung/`

Neue öffentliche Kategorie-URLs entstehen **ausschließlich** durch Einträge in
`lib/categories.ts`. Weder Sanity noch Supabase noch Airtable können neue
`/veranstaltung/`-Routen erzeugen, ohne dass ein CATEGORIES-Eintrag existiert.

### 8.4 Sanity ist optional und konfigurationsabhängig

Alle Sanity-Fetches sind graceful-null. Die Seiten funktionieren vollständig ohne
Sanity-Konfiguration. Sanity ist kein Blocker für Build oder Laufzeit.

### 8.5 Kein Sitemap/Robots-Handler

Kein `app/sitemap.ts` oder `app/robots.ts` gefunden. Die öffentliche Sitemap wird
entweder manuell gepflegt oder fehlt. Für SEO-Relevanz der Kategorie-Seiten und
Bandprofile sollte das mittelfristig adressiert werden.

### 8.6 Kontaktformular sendet ins Leere

`/kontakt` und `/api/kontakt` sind funktional entkoppelt: Das Formular sendet
korrekte Requests, der Handler gibt immer `{ok:true}` zurück ohne Verarbeitung.
Allgemeine Kontaktanfragen (nicht Band-Anfragen) werden aktuell nicht weitergeleitet.
Band-Anfragen (`/api/anfrage`) sind hingegen vollständig implementiert (→ Make-Webhook).

### 8.7 `force-dynamic` auf Banddetailseiten

`/band/[slug]` baut keinen ISR-Cache auf. Jeder Seitenaufruf trifft Supabase.
Bei hohem Traffic oder Supabase-Ausfall gibt es kein Fallback auf gecachten HTML.
Alle anderen Routen nutzen ISR mit 5-Minuten-Revalidierung.

### 8.8 Redundante Event-Type-Map-Fetches

`getBands()` ruft intern `getEventTypeMap()` auf, bevor es die Bands lädt.
`getEventTypeMap()` ist kein Singleton — bei parallel laufenden ISR-Revalidierungen
auf verschiedenen Routen (z. B. `/` und `/bands`) kann die Veranstaltungs-Tabelle
mehrfach gleichzeitig abgerufen werden. Kein technisches Problem, aber
optimierungswürdig, wenn die Airtable-Rate-Limits relevant werden.

---

*Bericht abgeschlossen. Keine Schreiboperationen, keine DB-Verbindungen, keine Commits.*
