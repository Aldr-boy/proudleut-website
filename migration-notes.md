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
| Homepage | Featured Bands (optional) | Hero-Text, Hero-Mosaik, Explainer, Testimonials, FAQ, CTAs |
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

## Bildstrategie

Bilder kommen bei proudleut aus zwei Quellen – für jede gilt eine klare Regel.

---

### Quelle 1: Hero-Mosaik → Sanity Assets (entschieden)

Die Bilder für das Homepage-Mosaik leben in Sanity. Keine offene Frage mehr.

**Warum Sanity für den Hero:**
- Stabile CDN-URLs – kein Risiko wie bei Airtable-Attachments
- Automatische Bildoptimierung über Sanity Image Pipeline
- Xandi kann Fotos im Sanity Studio tauschen – ohne Code, ohne Deploy
- Der Hero ist redaktioneller Content, kein Bandprofil-Datum → gehört nach Sanity

**Wie es funktioniert:**
1. Xandi wählt 12–16 starke Bandfotos aus (Vielfalt: Anlass, Stil, Region)
2. Upload direkt im Sanity Studio unter `Homepage → Hero-Mosaik`
3. Next.js holt die Bilder per GROQ-Query aus Sanity
4. Foto tauschen → im Studio erledigt, live in Minuten, kein Code-Eingriff nötig

**Auswahlkriterien für das Hero-Mosaik:**
- Keine zwei Fotos derselben Band direkt nebeneinander
- Mischung aus Nahaufnahme, Bühne, Publikum und Atmosphäre
- Mischung aus Anlässen: Hochzeit, Festzelt, Firmenfeier, Gala
- Mischung aus Stilen: Blasmusik, Partyband, Hochzeitsband, moderne Eventband
- Nicht zu viele helle Tageslichtbilder – das Mosaik muss auf dunklem Grund tragen
- Keine Logos, Flyer, Pressebilder oder Studio-Portraits im Mosaik
- Jedes Bild muss auch klein noch wirken; schwache Bilder lieber nicht verwenden

**Sanity-Schema** (im `homepage`-Singleton):
```typescript
{
  name: 'heroMosaic',
  title: 'Hero-Mosaik Bilder',
  type: 'array',
  of: [{ type: 'image', options: { hotspot: true } }],
  description: '12–16 Bandfotos für das Mosaik. Vielfalt zeigen: Anlass, Stil, Region.',
  validation: Rule => Rule.min(8).max(20)
}
```

**Was nicht passieren darf:**
- Keine Hero-Bilder aus dem `/public`-Ordner des Repos
- Keine rohen Airtable-Attachment-URLs im Hero

---

### Quelle 2: Bandprofilbilder → Airtable (mit Vorsicht)

Für Bandprofile (Hero-Bild, Thumbnail, Gallery) kommen Bilder aus Airtable.
Airtable-Attachment-URLs sind aber nicht dauerhaft stabile öffentliche Bildquellen.

**Grundregeln:**
- UI-Komponenten kennen niemals rohe Airtable-Attachment-URLs direkt
- Bilddaten laufen durch die Normalisierungsschicht (`normalizeImage()` → `ImageAsset`)
- In Phase 1A wird geprüft, wie Attachment-URLs aus der API konkret ankommen
- Vor dem Live-Gang muss die Stabilität der URLs bewiesen oder eine Lösung gefunden sein

**Strategien für Bandbilder (Entscheidung nach Phase 1A):**

1. **Temporär für den Durchstich:**
   Airtable-Bild-URLs lokal/staging verwenden um Datenfluss und Layout zu prüfen.

2. **Next.js Image mit Airtable-Domain-Whitelist (bevorzugt wenn URLs stabil):**
   Airtable-Domain in `next.config.js` als erlaubte Bildquelle eintragen.
   Next.js optimiert die Bilder automatisch – einfachste Lösung.

3. **Sanity-Spiegelung (wenn URLs instabil):**
   Bandbilder einmalig in Sanity Assets hochladen. Aufwand: einmalig pro Band.

**Vorläufige Empfehlung:**
Phase 1A beweist den Datenfluss. Danach konkrete Entscheidung für Bandbilder.
Hero-Mosaik ist bereits entschieden: Sanity.

---

### Bildoptimierung – Performance-Prinzip

Trivago nutzt Cloudinary mit automatischer Format-/Qualitätsanpassung (`f_auto,q_auto`).
Für proudleut setzen wir auf **Next.js Image Optimization via Vercel** – gleiches Prinzip,
kein zusätzlicher Service:

- `next/image` mit `sizes`-Attribut für responsive Bilder
- Automatische WebP/AVIF-Konvertierung durch Vercel
- Lazy Loading standardmäßig (außer Hero/Above-the-fold)
- Domain-Whitelist in `next.config.ts` für Airtable-Bild-URLs

Falls die Anzahl der Bands auf 300+ wächst oder Airtable-URLs instabil werden,
wäre ein Wechsel zu Cloudinary oder Sanity als Bild-CDN der nächste Schritt.
Für ~150 Bands ist Next.js Image + Vercel voraussichtlich ausreichend,
ohne zunächst einen zusätzlichen Bilddienst wie Cloudinary einzuführen.
Die konkreten Vercel-Limits und Kosten werden vor dem Livegang geprüft.

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
    {
      name: 'heroMosaic',
      title: 'Hero-Mosaik Bilder',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: '12–16 Bandfotos für das Homepage-Mosaik. Vielfalt zeigen: Anlass, Stil, Region.',
      validation: Rule => Rule.min(8).max(20)
    },
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

**URL-State für Filter:**

Gefilterte Bandlisten sollen saubere, teilbare URLs erzeugen – Query-Parameter in der URL,
ausgelesen per `useSearchParams()`. Ein Veranstalter, der eine gefilterte Ansicht an einen
Kollegen schickt, soll das gleiche Ergebnis sehen.

Wichtig: URL-State ist primär ein UX- und Sharing-Prinzip.
Für SEO sind gefilterte Query-URLs nicht der Haupthebel. Indexierbare Landingpages entstehen
bewusst über programmatische Routen wie `/bandtyp/[slug]`, `/region/[slug]` und später
ausgewählte Kombinationen wie `/hochzeitsband-muenchen`.

---

## Programmatische Kategorie-Seiten (SEO-Hebel, Phase 2+)

Inspiriert von Trivagos Stadt-Landingpages generiert proudleut automatisch Landing Pages
für jede sinnvolle Kombination aus Bandtyp, Region und Anlass.

### Geplante URL-Struktur

- **Bandtyp**: `/bandtyp/partyband`, `/bandtyp/jazzband`, `/bandtyp/hochzeitsband`
- **Region**: `/region/bayern`, `/region/oberpfalz`, `/region/muenchen`
- **Anlass**: über bestehende `/veranstaltung/[slug]` abgedeckt
- **Kombinationen** (Phase 3+): `/hochzeitsband-muenchen`, `/partyband-bayern`

**Wichtig bei Root-Level-Kombinationen:**

- Nur bewusst freigegebene Kombinationen generieren – keine freie Slug-Wildcard.
- Reservierte Slugs wie `kontakt`, `blog`, `ueber-mich`, `fuer-bands`, `bands`,
  `band`, `region`, `bandtyp` und `veranstaltung` dürfen nie als Kombination verwendet werden.
- Vor Umsetzung prüfen, ob Root-Level-SEO-Slugs gewünscht sind oder ob eine sicherere
  Struktur wie `/bands/hochzeitsband-muenchen` sinnvoller ist.

### Was jede Seite enthält

- Gefilterte Bandliste aus Airtable (ISR, `revalidate` alle 5–10 Min.)
- Redaktioneller Intro-Text aus Sanity (pro Kategorie/Region individuell pflegbar)
- Schema.org `ItemList` oder `CollectionPage` Markup
- Breadcrumb-Navigation

### Regeln

- **Nur Seiten generieren, für die es auch Bands gibt.**
  Keine leeren Kategorieseiten – das wäre Thin Content und schadet dem SEO.
- Umsetzung: Next.js Dynamic Routes mit `generateStaticParams()` aus Airtable-Daten.
- Sanity liefert den redaktionellen Content pro Kategorie/Region.
- Neue Sanity-Schemas nötig: `bandTypeCategory` und `regionPage` (analog zu `eventCategory`).

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

### Referenz-Events als `MusicEvent` (optional, Phase 3+)

Wenn Referenz-Events auf Bandprofilen angezeigt werden, können sie optional als
`MusicEvent` im JSON-LD der Bandprofilseite eingebettet werden. Das stärkt die
Verbindung zwischen Band und Auftrittsorten im Google Knowledge Graph.

```json
{
  "@type": "MusicGroup",
  "name": "Donnaweda",
  "url": "https://proudleut.com/band/donnaweda",
  "event": [
    {
      "@type": "MusicEvent",
      "name": "Gillamoos 2024",
      "location": {
        "@type": "Place",
        "name": "Gillamoos",
        "address": {
          "addressLocality": "Abensberg",
          "addressRegion": "Bayern"
        }
      },
      "startDate": "2024-09-01"
    }
  ]
}
```

**Regeln:**

- Nur Referenz-Events mit sinnvollen Daten (mindestens Event-Name und Stadt)
  in JSON-LD aufnehmen
- `startDate` nur setzen, wenn ein konkretes Datum oder zumindest Jahr bekannt ist
- Keine Zukunfts-Events als Referenz-Events (dafür gibt es Bandsintown/Live-Dates)
- Das ist ein Phase-3-Feature – nicht im ersten Durchstich umsetzen

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

- [ ] Kategorie-Seiten mit Filterlogik und URL-State
- [ ] Bandprofil-Seiten finalisieren
- [ ] Homepage
- [ ] Kontaktseite / Anfrageweg
- [ ] Über mich / Für Bands
- [ ] Programmatische Seiten: `/bandtyp/[slug]` und `/region/[slug]` (Trivago-Prinzip)

### Phase 3 – Inhalte & SEO

- [ ] Alle Sanity-Inhalte befüllen
- [ ] Structured Data einbauen
- [ ] Sitemap, robots.txt
- [ ] Redirect-Strategie finalisieren
- [ ] On-Demand-Revalidierung via Make prüfen
- [ ] Kombinierte Landing Pages prüfen (z. B. `/hochzeitsband-muenchen`)

### Phase 4 – Ablösung Webflow

- [ ] Staging-Abnahme
- [ ] Domainumzug proudleut.com → Vercel
- [ ] Monitoring nach Livegang
- [ ] Webflow-Abo erst nach stabiler Livephase kündigen
- [ ] Whalesync-Abo erst nach stabiler Livephase kündigen
