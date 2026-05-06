# migration-notes.md – proudleut.com

> Dieses Dokument beschreibt die technische Architektur, den Datenfluss und die
> Migrationslogik des proudleut-Neuaufbaus.
>
> Projektziel und Positionierung → `projekt.md`  
> Datenmodell und Frontend-Mapping → `content-model.md`  
> Gestalterische Referenz → `design-reference.md`  
> Arbeitsregeln → `CLAUDE.md`

---

## Was sich ändert (Stack-Migration)

| Vorher | Nachher | Warum |
|--------|---------|-------|
| Webflow | Next.js + Vercel | Flexibilität, Performance, keine CMS-Limits |
| Whalesync | **entfällt** | Next.js liest Banddaten aus Airtable – kein Sync in Webflow nötig |
| Webflow CMS | Sanity | Redaktioneller Content, dynamische Kategorien, Blog, statische Seiten |
| Airtable | Airtable (**bleibt**) | Bewährte Banddatenbank, kein Migrationsbedarf |
| Make | Make (**bleibt**) | E-Mail-Automation läuft unabhängig vom Frontend |

**Whalesync fällt komplett weg.** Seine einzige Aufgabe war Airtable → Webflow CMS zu
synchronisieren. Next.js ruft Banddaten künftig direkt oder über eigene Server-Utilities aus
Airtable ab. Sanity übernimmt nur redaktionelle Inhalte, nicht die Banddaten.

---

## Datenarchitektur

### Zwei Datenquellen, ein Frontend

```txt
Airtable (Bands)          Sanity (Redaktionell)
       ↓                          ↓
   REST API                     GROQ
       ↓                          ↓
   Normalisierung            Sanity Queries
       ↓                          ↓
        →  Next.js (App Router)  ←
                   ↓
             Vercel CDN (ISR)
                   ↓
              Besucher
```

### Welche Daten woher kommen

| Seitentyp | Airtable | Sanity |
|-----------|----------|--------|
| Homepage | Featured Bands (optional) | Hero-Text, Explainer, Testimonials, FAQ, CTAs |
| Kategorie-Seite `/veranstaltung/[slug]` | Band-Liste (gefiltert) | Kategorie-Name, Hero-Bild, Beschreibungstext, Airtable-Mapping |
| Bandprofil `/band/[slug]` | Alle Banddaten | – |
| Blog `/blog/[slug]` | – | Artikel-Content |
| Über mich, Kontakt, Für Bands | – | Seiteninhalt |

---

## Grundregel: Rohdaten werden normalisiert

Airtable-Feldnamen werden nicht direkt in UI-Komponenten verwendet. Stattdessen gibt es eine
Mapping-/Normalisierungsschicht, die historische Airtable-Feldnamen in stabile Frontend-Typen
übersetzt.

Empfohlene Struktur:

```txt
lib/airtable/client.ts          → Airtable API Client
lib/airtable/queries.ts         → Airtable Fetch-Funktionen
lib/airtable/normalizeBand.ts   → Raw Airtable Record → Band
lib/types/band.ts               → stabiler Frontend-Type
```

Details zum Frontend-Datenmodell stehen in `content-model.md`.

**Warum wichtig:**

Airtable-Feldnamen sind historisch gewachsen und teilweise lang, technisch oder fehleranfällig.
Im Frontend soll mit klaren Begriffen gearbeitet werden: `name`, `slug`, `shortDescription`,
`heroImage`, `eventTypes`, `location`, etc.

---

## Airtable – Datenstruktur (Bands-Tabelle)

### Felder, die im Frontend verwendet werden

**Identität:**

- `Bandname` – Anzeigename
- `Slug` – URL-Slug für `/band/[slug]`
- `Bandlogo` – Attachment
- `Hauptkategorie/Bandart` – z. B. "Partyband", "Blasmusik | Wirtshausmusik"
- `Main IMG - Hero` – Hauptbild (Attachment)
- `Main IMG - Thumbnail` – Vorschaubild (Attachment)
- `Main IMG - Alt-Text` – Alt-Text für SEO
- `Gallery` – Bildergalerie (Attachment-Array)
- `Website Link` – externe Band-Website

**Content:**

- `Main Text` – Hauptbeschreibungstext
- `Meta Description` – SEO-Meta-Description
- `Short Descripton /...` – Kurztext für Bandkarten

**Geo:**

- `PLZ` – Postleitzahl
- `Orte (from Orte-Master)` – Ortsname
- `landkreise (from Orte-Master)` – Landkreis
- `regierungsbezirk (from Orte-Master)` – Regierungsbezirk
- `bundesland (from AT-PLZ Referenz)` – Bundesland

**Event-Eignung:**

- `Veranstaltungstypen` – Multi-Select (Festzelt, Gala, Hochzeit, Firmenfeier & Business Event,
  Bürgerfest, Fasching, Kirchweih, Biergarten, …)

**Hochzeits-Details:**

- `Info - Bandgröße` – Anzahl Musiker
- `Info - Konstellation` – "fix" / "variabel"
- `Info - Brautentführung` – "ja" / "nein"
- `Info - Gagenniveau` – z. B. "Gage unter 3.000€"
- `Info - Moderation` – "ja" / "nein"
- `Info - Mögliche...` – mögliche Spielzeiten
- `Info - So feiern wir Hochzeit` – freier Beschreibungstext

**Social:**

- `Social - Facebook`
- `Social - Instagram`
- `Social - Spotify`
- `Social - YouTube`
- `YouTube Video Link`

**Ähnliche Bands:**

- `similar_1`, `similar_2`, `similar_3` – Textfelder mit Bandnamen (kein Linked Record)
  → Matching im Frontend über Bandname-Vergleich; Fallback auf Tag-Matching wenn leer

**Status:**

- `Webflow Status` – "Active" / "New" – als Filter verwenden: nur "Active" anzeigen

### Felder, die ignoriert werden (Webflow-Relikte)

- `search_tokens_all` – vorberechnetes Such-Token für Webflow-Suche → nicht verwenden
- `filter_tags_regio` – vorberechneter Region-Tag → nicht verwenden
- `event_keys` – vorberechneter Event-Tag → nicht verwenden
- `Webflow Record ID` – Webflow-interne ID → nicht verwenden
- `Last Published` – Webflow-Publish-Status → nicht verwenden
- `Band Performance`, `Band Geo (Daily)`, `Band Pages` – Analytics-Felder → nicht verwenden

---

## Bildstrategie / Airtable Attachments

Airtable-Attachment-URLs dürfen nicht als dauerhaft stabile öffentliche Bildquelle für die
Website behandelt werden. Bilder aus Airtable müssen deshalb bewusst behandelt werden.

**Grundregel:**

- In Phase 1A wird geprüft, wie Attachment-URLs aus der Airtable API konkret ankommen.
- Vor finalem Einsatz auf Live-Seiten muss eine stabile Bildstrategie festgelegt sein.
- UI-Komponenten sollen nicht direkt rohe Airtable-Attachment-URLs kennen.
- Bilddaten laufen ebenfalls durch die Normalisierungsschicht.

**Mögliche Strategien:**

1. **Temporär für den technischen Durchstich:**
   Airtable-Bild-URLs nur lokal/staging verwenden, um Datenfluss und Layout zu prüfen.

2. **Stabile Spiegelung in ein CDN / Asset-System:**
   Airtable-Attachments werden in einen stabilen Bildspeicher gespiegelt, z. B. Sanity Assets,
   Cloudinary, S3/R2 oder ein vergleichbarer Dienst.

3. **Eigene Proxy-/Caching-Route:**
   Next.js lädt Bilder kontrolliert serverseitig und cached sie. Nur sinnvoll, wenn die
   Caching- und Revalidierungslogik sauber gelöst wird.

**Vorläufige Empfehlung:**

Für den Start: nicht überoptimieren, aber das Risiko nicht verdrängen. Phase 1A soll den
Datenfluss beweisen. Danach wird entschieden, ob eine CDN-/Asset-Spiegelung nötig ist.

---

## Sanity – Schema-Übersicht

### eventCategory (Veranstaltungskategorie)

Dynamisch aus Sanity – neue Kategorien ohne Code-Eingriff anlegbar.

Wichtig: Sanity-Kategorien müssen wissen, welche Airtable-`Veranstaltungstypen` sie filtern.
Deshalb enthält `eventCategory` eine explizite Mapping-Liste.

```typescript
{
  name: 'eventCategory',
  title: 'Veranstaltungskategorie',
  fields: [
    { name: 'title', type: 'string' },             // z. B. "Festzelt"
    { name: 'slug', type: 'slug' },                // z. B. "festzelt"
    { name: 'heroImage', type: 'image' },
    { name: 'description', type: 'text' },         // Einleitungstext der Kategorie-Seite
    { name: 'seoTitle', type: 'string' },
    { name: 'seoDescription', type: 'string' },
    { name: 'sortOrder', type: 'number' },         // Reihenfolge in Navigation
    {
      name: 'airtableEventTypes',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Exakte Airtable-Veranstaltungstypen, die zu dieser Kategorie gehören.'
    }
  ]
}
```

Beispiel:

```txt
Sanity title: Festzelt
Sanity slug: festzelt
airtableEventTypes: ["Festzelt", "Volksfest", "Bierzelt"]
```

Aktuelle Startkategorien:

- Festzelt
- Gala
- Hochzeit
- Firmenfeier & Business Event

### homepage (Singleton)

Editierbarer Content der Homepage.

```typescript
{
  name: 'homepage',
  title: 'Homepage',
  fields: [
    { name: 'heroHeadline', type: 'string' },
    { name: 'heroSubline', type: 'string' },
    { name: 'heroCta', type: 'string' },
    { name: 'explainerTitle', type: 'string' },
    { name: 'explainerSteps', type: 'array' },
    { name: 'trustLogos', type: 'array' },
    { name: 'curatorSection', type: 'object' }
  ]
}
```

### testimonial

```typescript
{
  name: 'testimonial',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'role', type: 'string' },
    { name: 'quote', type: 'text' },
    { name: 'photo', type: 'image' },
    { name: 'featured', type: 'boolean' }
  ]
}
```

### faqItem

```typescript
{
  name: 'faqItem',
  fields: [
    { name: 'question', type: 'string' },
    { name: 'answer', type: 'text' },
    { name: 'category', type: 'reference', to: [{ type: 'eventCategory' }] }
    // Wenn category leer → globales FAQ (Homepage)
  ]
}
```

### blogPost

```typescript
{
  name: 'blogPost',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'featuredImage', type: 'image' },
    { name: 'excerpt', type: 'text' },
    { name: 'body', type: 'array' },
    { name: 'relatedCategories', type: 'array' }
  ]
}
```

### staticPage

Für Über mich, Für Bands, Kontakt.

```typescript
{
  name: 'staticPage',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug' },
    { name: 'body', type: 'array' },
    { name: 'seoTitle', type: 'string' },
    { name: 'seoDescription', type: 'string' }
  ]
}
```

---

## Rendering-Strategie

**ISR (Incremental Static Regeneration)** für Seiten mit Airtable-Daten.

```typescript
export const revalidate = 300; // 5 Minuten
```

Optional später:

```typescript
// POST /api/revalidate?secret=[TOKEN]&path=/band/aufzundn
```

**Wichtig:**

On-Demand-Revalidierung über Make ist sinnvoll, aber kein Startschritt. Das bestehende
Make-Szenario darf nicht nebenbei verändert werden. Eine Erweiterung um Revalidierung wird
nur nach ausdrücklicher Entscheidung umgesetzt.

---

## Filter-Logik (Kategorie-Seiten)

Filter laufen client-seitig in React. Kein Suchserver, keine Supabase nötig.

Beim Laden der Kategorie-Seite werden alle Bands dieser Kategorie per ISR geladen. Der
Filter-State lebt in React (`useState`). Bei ~150 Bands ist das performant.

**Filter-Dimensionen:**

- Veranstaltungstypen (über Sanity-`airtableEventTypes` → Airtable `Veranstaltungstypen`)
- Hauptkategorie/Bandart (Partyband, Blasmusik, etc.)
- Region: Bundesland → Regierungsbezirk → Landkreis (Geo-Kaskade aus Airtable)
- Bandgröße (aus `Info - Bandgröße`)

---

## Ähnliche Bands – Implementierung

```typescript
function getSimilarBands(band: Band, allBands: Band[]): Band[] {
  const manualNames = [
    band.similarBands.manual1,
    band.similarBands.manual2,
    band.similarBands.manual3,
  ].filter(Boolean);

  const manual = manualNames
    .map((name) => allBands.find((candidate) => candidate.name === name))
    .filter(Boolean);

  if (manual.length < 3) {
    const tagMatches = allBands
      .filter((candidate) => candidate.slug !== band.slug && !manual.includes(candidate))
      .map((candidate) => ({
        band: candidate,
        score: countSharedTags(band, candidate),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3 - manual.length)
      .map((item) => item.band);

    return [...manual, ...tagMatches];
  }

  return manual;
}
```

---

## Make-Integration (Kontaktformular)

Das bestehende Make-Szenario wird nicht verändert. Das neue Next.js-Kontaktformular triggert
denselben Webhook wie bisher.

```typescript
// app/api/contact/route.ts
export async function POST(req: Request) {
  const body = await req.json();

  await fetch(process.env.MAKE_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return Response.json({ success: true });
}
```

**Wichtig:**

- Felder, die Make erwartet, müssen aus dem bestehenden Szenario geprüft werden.
- Feldnamen im Payload dürfen nicht ohne Prüfung geändert werden.
- Spam-/Honeypot-Logik kann im neuen Frontend ergänzt werden, ohne Make grundsätzlich umzubauen.

---

## Structured Data (Schema.org)

### Bandprofil `/band/[slug]`

```json
{
  "@type": "MusicGroup",
  "name": "Bandname",
  "url": "https://proudleut.com/band/[slug]",
  "sameAs": ["https://band-eigene-website.de", "https://facebook.com/..."],
  "genre": ["Partyband"],
  "location": {
    "@type": "Place",
    "address": {
      "addressLocality": "Ort",
      "addressRegion": "Bayern"
    }
  }
}
```

### Kategorie-Seite `/veranstaltung/[slug]`

```json
{
  "@type": "CollectionPage",
  "name": "Festzelt-Bands – proudleut.com",
  "url": "https://proudleut.com/veranstaltung/festzelt"
}
```

Optional zusätzlich `ItemList` für sichtbare Bands.

### Homepage

```json
{
  "@type": "WebSite",
  "name": "proudleut",
  "url": "https://proudleut.com"
}
```

Zusätzlich möglich: `Organization` und `Person` für Xandi/prowdleut, wenn sauber und nicht
überladen umgesetzt.

---

## SEO-Migration / Redirect-Strategie

Vor dem Domainumzug müssen bestehende Webflow-URLs geprüft werden. Ziel ist, SEO-Signale
nicht unnötig zu verlieren.

### Aufgaben

- Aktuelle Sitemap / Webflow-URLs exportieren oder crawlen
- Prüfen, welche Seiten Traffic oder Rankings haben
- Entscheiden: URL bleibt gleich, wird umgeleitet oder entfällt bewusst
- 301-Redirects in Next.js/Vercel konfigurieren
- Canonical URLs prüfen
- Neue Sitemap erst nach finaler URL-Entscheidung live setzen

### Redirect-Tabelle

```md
| Alte URL | Neue URL | Status | Notiz |
|---|---|---|---|
| /[alte-band-url] | /band/[slug] | 301 | prüfen |
| /[alte-kategorie-url] | /veranstaltung/[slug] | 301 | prüfen |
```

**Wichtig:**

Keine URL-Struktur final ändern, ohne die bestehende Webflow-Struktur und SEO-Auswirkungen
zu prüfen.

---

## Phasenplan

### Phase 1A – Technischer Durchstich

- [ ] Next.js-Projekt aufsetzen
- [ ] Airtable-Client read-only einrichten
- [ ] `Band`-Type definieren
- [ ] Normalisierungsfunktion `RawAirtableBandRecord → Band` bauen
- [ ] Eine echte Band über `/band/[slug]` rendern
- [ ] Bildstrategie praktisch prüfen
- [ ] Vercel-Build erfolgreich deployen

### Phase 1B – Grundsystem

- [ ] Grundlayout, Header, Footer
- [ ] Sanity einrichten
- [ ] Sanity-Schemas anlegen (`eventCategory`, `homepage`, `testimonial`, `faqItem`, `blogPost`, `staticPage`)
- [ ] Erste Kategorie-Seite mit Sanity-Kategorie + Airtable-Bands
- [ ] Erste einfache Bandkarten-Komponente

### Phase 2 – Kernseiten

- [ ] Kategorie-Seiten mit Filterlogik
- [ ] Bandprofil-Seiten finalisieren
- [ ] Homepage
- [ ] Kontaktseite / Anfrageweg
- [ ] Über mich / Für Bands

### Phase 3 – Inhalte & SEO

- [ ] Alle Sanity-Inhalte befüllen
- [ ] Structured Data einbauen
- [ ] Sitemap, robots.txt
- [ ] Redirect-Strategie finalisieren
- [ ] On-Demand-Revalidierung via Make prüfen

### Phase 4 – Ablösung Webflow

- [ ] Staging-Abnahme
- [ ] Domainumzug proudleut.com → Vercel
- [ ] Monitoring nach Livegang
- [ ] Webflow-Abo erst nach stabiler Livephase kündigen
- [ ] Whalesync-Abo erst nach stabiler Livephase kündigen
