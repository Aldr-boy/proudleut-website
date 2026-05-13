# design-reference.md – proudleut.com

> Dieses Dokument beschreibt die visuelle und gestalterische Referenz für proudleut.
>
> Wenn eine Designentscheidung unklar ist:
> 1. Wiedererkennbarkeit vor Kreatividee
> 2. Konsistenz vor Effekt
> 3. Identität vor Trend
> 4. Wirkung vor Spielerei
> 5. Bestehende Referenz vor generischem „schöner machen"

---

## Grundsatz

proudleut soll sich anfühlen wie ein **übersichtliches Schaufenster mit persönlicher Handschrift**,
nicht wie ein anonymer Marktplatz. Viele Bands – aber mit dem Gefühl: Ich bin hier gut
aufgehoben und finde schneller die passende Richtung.

Designentscheidungen entstehen aus:

- der gewünschten emotionalen Wirkung (warm, übersichtlich, vertrauenswürdig)
- dem Hybrid-Prinzip: Bühne für Emotion, Feinkostladen für Orientierung
- der Konsistenz über alle Seiten hinweg
- der Klarheit für Veranstalter, die schnell eine gute Entscheidung treffen wollen

Was „modern" wirkt, aber nicht zur Identität passt, ist falsch.

---

## Referenzen

### Primäre Referenz

- **Bestehende Website:** proudleut.com (Webflow)
- Insbesondere: Homepage, Kategorie-Seiten (Festzelt), Bandprofil (Donnaweda)

### Sekundäre Referenzen

- Silk & Sound (warmere, editorial-geprägte Ästhetik – als Inspirationsquelle für Wirkung)
- **Netflix** – dunkler Hintergrund lässt Thumbnails strahlen; Browsing macht Spaß;
  man scrollt und will mehr sehen. Nicht die Technik kopieren, sondern das Gefühl.
- **Airbnb** – eine Karte = eine Entscheidungseinheit; Bild, Name, Ort, Kurzinfo reichen;
  filtern fühlt sich leicht an, nicht technisch
- **GetYourGuide** – starke Hero-Momente pro Kategorie; klarer nächster Schritt immer sichtbar.
  Achtung: Bewertungssysteme, Preisfilter und Buchungsflow sind nicht übertragbar und nicht gewollt.
- **Trivago** – Meta-Vergleicher, kein Buchungsportal. Gleiche Grundidee wie proudleut:
  Orientierung geben und weiterleiten, nicht selbst die Transaktion sein.
  Was wir übernehmen:
  - **Programmatische SEO-Seiten**: automatisch generierte Landing Pages pro Stadt/Kategorie
    („Hotels Hamburg" → „Hochzeitsband München", „Partyband Bayern"). Jede sinnvolle
    Suchintention bekommt eine eigene, indexierbare Seite mit echtem Inhalt.
  - **Facetten-Filter mit URL-State**: kombinierbare Filter, deren Zustand in der URL lebt
    (`/bands?region=bayern&genre=jazz&event=hochzeit`). Gefilterte Ergebnisse sind
    teilbar und reproduzierbar – wichtig für UX, interne Weitergabe und spätere
    Auswertbarkeit. Für SEO entstehen die primären Einstiegsseiten bewusst über
    programmatische Routen wie `/bandtyp/[slug]`, `/region/[slug]` und ausgewählte
    Kombinationen wie `/hochzeitsband-muenchen`.
  - **Performante Bildauslieferung**: automatische Format-/Qualitätsanpassung pro Device
    (Trivago nutzt Cloudinary mit `f_auto,q_auto`; für proudleut reicht Next.js Image via Vercel).
  Was wir nicht übernehmen: Preisvergleiche, Echtzeit-Verfügbarkeit, Partner-API-Integrationen,
  Account-System mit Favoriten. Das ist Trivagos Kern, aber für proudleut irrelevant.
- **freelancermap.de** – Strukturreferenz für Seitenaufbau und Section-Rhythmus:
  großzügiger Weißraum, klare visuelle Hierarchie, ein Gedanke pro Viewport-Höhe,
  duale Zielgruppen-Ansprache ohne Verwirrung. Nur die Struktur übernehmen, nicht das
  Gefühl – proudleut ist kein SaaS-Tool und kein Jobportal.

**Wichtig:** Sekundäre Referenzen dürfen die primäre Referenz nie überstimmen.
Von Netflix, Airbnb, GetYourGuide, Trivago und freelancermap werden nur die UX- und
Architektur-Prinzipien übernommen – nicht die Komplexität, nicht die Plattform-Ästhetik,
nicht die Buchungslogik.

---

## Gestalterische Leitidee

proudleut soll hochwertig, warm und eigenständig wirken – kein kaltes Tech-Produkt,
keine anonyme Plattform. Die Seite hat Charakter, weil Xandi Charakter hat.

Der visuelle Grundton ist **hybrid: dunkel für Emotion, hell für Orientierung.**

- Dunkle Flächen (Bühne) für den emotionalen Einstieg und gezielte Highlight-Momente
- Warme, helle Flächen (Feinkostladen) für Orientierung, Vertrauen und Vergleichbarkeit
- Die Balance: **30% Bühne, 70% Feinkostladen**

Der Eindruck soll sein: *„Hier kenne ich mich aus – hier werde ich fündig."*
Nicht: *„Hier wurde ein Template aufgefüllt."*

---

## Visuelle DNA

- **Hybrid-Rhythmus** als Grundton: dunkle Bühnenflächen wechseln mit warmen, hellen
  Directory-Flächen. Nie durchgehend dunkel, nie durchgehend hell.
- **Lila (#75518B)** als Markenfarbe – präsent, aber nicht laut. Als Schimmer,
  nicht als Fläche. Wie Bühnenlicht, das auf die Bühne fällt.
- **Bandfotos als Herzstück** – die Bilder müssen die Seele der Seite tragen.
  Auf dunklen Flächen leuchten sie, auf hellen Flächen werden sie durch großzügiges
  Sizing und subtile Schatten getragen.
- **Klare Rasterstruktur** bei Bandkarten – kein visuelles Chaos
- **Typografisch klar** – gut lesbar, sachlich warm, kein expressiver Typografie-Overkill
- **Ruhige Sections** – kein Reize-Feuerwerk, bewusste Dramaturgie
- Eher **warm und erdend** als kühl und technisch
- Warme Farbtöne statt neutralem Grau: Offwhite statt Weiß, Warm-Schwarz statt Schwarz
- Persönlich genug, dass proudleut nicht anonym wirkt

---

## Was auf keinen Fall passieren darf

- Kein generischer KI-Look (kein Glassmorphism, kein gradient-mesh-Hintergrund)
- Keine SaaS- oder Startup-Ästhetik
- Keine austauschbare Premium-Optik (kein „könnte auch eine Fintech-App sein")
- Keine Stock-Foto-Ästhetik
- Kein Stilbruch zwischen Seiten
- Keine verspielten oder unruhigen Animationen
- Keine Überladung durch zu viele gleichwertige visuelle Reize
- Kein Design, das Xandis Kurator-Persönlichkeit unsichtbar macht
- Keine Bandkarten, die nach „Masse" aussehen – lieber weniger, dafür mit Würde
- Keine UI-Muster, die wie ein anonymes Buchungsportal wirken
- Kein klinisches Weiß – helle Flächen immer warm brechen
- Kein reines Schwarz – dunkle Flächen immer mit violettem Unterton

---

## Layout-Prinzipien

- **Klare Inhaltsblöcke** mit bewusstem Rhythmus
- Sections folgen ruhig aufeinander – kein hastiges Stacking
- Grid-basiert bei Bandkarten (2–3 Spalten Desktop, 1–2 Mobile)
- **Großflächige Bildmodule** für Hero-Bereiche
- Kompakte Informationsmodule bei Bandprofilen (Sidebar-Logik)
- Weißraum ist aktives Gestaltungsmittel – großzügig zwischen Sections (`py-20` bis `py-24`)
- Filter und Auswahlhilfen sind funktional, aber nicht dominant
- Ein Gedanke pro Scroll-Stop: jede Section hat genau einen Zweck

---

## Header / Navigation

- Schlicht und funktional – Navigation ist Werkzeug, nicht Bühne
- Sticky Header für einfache Orientierung beim Scrollen
- Primäre Navigation: Entdecke Livebands (Dropdown), Über mich, Blog, Kontakt
- Dropdown zeigt Kategorien mit Bild-Thumbnails (wie aktuell)
- Desktop und Mobile ähnlich in der Logik, Mobile vereinfacht
- Navigation soll nicht nach Shop, SaaS-App oder Marktplatz wirken

---

## Hero- / Einstiegsbereiche

- Videoloops nur einsetzen, wenn sie Performance, Lesbarkeit und Mobile-Nutzung nicht verschlechtern.
- Starke Fotografie ist im Zweifel besser als ein schwaches Video.
- Headline klar und kurz – kein Einleitungsroman
- CTA vorhanden, aber nicht aufdringlich
- Auf Kategorie-Seiten: Kategorie-Foto als Hero, Einleitungstext darunter
- Auf Bandprofilen: Band-Foto als vollflächiges Hero
- Der Einstieg soll schnell klären: Anlass, Vielfalt, direkter Kontakt

---

## Hero – Homepage (Detailspezifikation)

Der Homepage-Hero ist die wichtigste Fläche der gesamten Seite.
Wenige Sekunden entscheiden: bleiben oder weitergehen.

### Konzept: Foto-Mosaik

Das Hintergrundprinzip folgt dem Ansatz von Netflix, Disney+ und Paramount+:
Viele kleine Bandfotos nebeneinander zeigen sofort – hier ist Auswahl, hier ist Leben,
hier passiert was. Nicht ein einzelnes Heldenimage, sondern eine ganze Welt auf einen Blick.

Echte Bandfotos aus dem proudleut-Verzeichnis. Vielfalt zeigen:
Blasmusik neben Partyband, Hochzeitsband neben Festzeltband, Bayern neben Modern.
Das Mosaik ist der visuelle Beweis: wir haben was du suchst.

### Visueller Aufbau

```text
┌─────────────────────────────────────────────────────┐
│  [Foto] [Foto] [Foto] [Foto] [Foto] [Foto] [Foto]  │
│  [Foto] [Foto]  ← dunkler Overlay →  [Foto] [Foto]  │
│                                                      │
│         Livebands entdecken –                        │  ← H1
│              für dein Event                          │
│                                                      │
│   Entdecke Bands nach Anlass & Stil                  │  ← Subline
│   und kontaktiere sie direkt.                        │
│                                                      │
│  Hochzeit · Festzelt · Firmenfeier · Gala            │  ← klickbare Links
│                                                      │
│       [ Bands entdecken & direkt anfragen ]          │  ← CTA-Button
│                                                      │
│  [Foto] [Foto] [Foto] [Foto] [Foto] [Foto] [Foto]  │
└─────────────────────────────────────────────────────┘
```

### Technische Anforderungen

**Mosaik-Hintergrund:**
- Echte Bandfotos – gezielt ausgewählt für Vielfalt, Qualität und Kontrast
- **Bildquelle: Sanity Assets** – nicht Airtable, nicht `/public`-Ordner (siehe unten)
- CSS Grid – gleichmäßiges Raster, einheitliche Bildausschnitte (Aspect Ratio fest)
- Dunkler Overlay über dem gesamten Mosaik auf Basis von `--pl-bg-stage`:
  `background: rgba(18, 16, 26, 0.62)` – kein schwarzer Overlay (`rgba(0,0,0,...)`)
  damit Text lesbar bleibt und Fotos nicht zu dominant werden
- Hero-Mosaik performancetauglich umsetzen:
  - nur die unmittelbar sichtbaren, wichtigsten Bilder priorisieren
  - keine pauschale `priority`/`eager`-Ladung für alle Mosaik-Bilder
  - Anzahl der Bilder begrenzen (12–16 Fotos reichen)
  - responsive Varianten verwenden
  - LCP-relevantes Hauptbild bzw. zentrale sichtbare Bilder bevorzugt laden
- Festes Seitenverhältnis pro Mosaik-Bild (z. B. 3:4 oder 4:3, einheitlich)

**Bildquelle Hero-Mosaik – warum Sanity:**

Die Hero-Mosaik-Bilder leben in Sanity – nicht in Airtable, nicht im `/public`-Ordner.

- Sanity liefert stabile CDN-URLs – kein Risiko wie bei Airtable-Attachments
- Automatische Bildoptimierung über Sanity Image Pipeline
- Xandi kann Fotos im Sanity Studio tauschen – ohne Code, ohne Deploy
- Der Hero ist redaktioneller Content, kein Bandprofil-Datum → gehört nach Sanity

Wie es funktioniert:
1. Xandi wählt 12–16 starke Fotos aus (Vielfalt: Anlass, Stil, Region)
2. Upload im Sanity Studio unter `Homepage → Hero-Mosaik`
3. Next.js holt die Bilder per GROQ-Query
4. Foto tauschen → im Studio, live in Minuten, kein Code-Eingriff

**Auswahlkriterien Hero-Mosaik:**

- Keine zwei Fotos derselben Band direkt nebeneinander
- Mischung aus Nahaufnahme, Bühne, Publikum und Atmosphäre
- Mischung aus Anlässen: Hochzeit, Festzelt, Firmenfeier, Gala
- Mischung aus Stilen: Blasmusik, Partyband, Hochzeitsband, moderne Eventband
- Nicht zu viele helle Tageslichtbilder – das Mosaik muss auf dunklem Grund tragen
- Keine Logos, Flyer, Pressebilder oder Studio-Portraits im Mosaik
- Jedes Bild muss auch klein noch wirken; schwache Bilder lieber nicht verwenden

Sanity-Schema (im `homepage`-Dokument):
```typescript
{
  name: 'heroMosaic',
  title: 'Hero-Mosaik Bilder',
  type: 'array',
  of: [{ type: 'image', options: { hotspot: true } }],
  description: '12–16 Bandfotos für das Mosaik. Vielfalt zeigen: verschiedene Anlässe, Stile, Regionen.',
  validation: Rule => Rule.min(8).max(20)
}
```

**Text-Layer:**
- Headline als echter `<h1>`-Tag – zwingend, einmal pro Seite
- Subline als `<p>` – klar, kurz, maximal 2 Zeilen
- Kategorien als klickbare `<a>`-Links zu `/veranstaltung/[slug]` –
  echte Navigation und SEO-Signal, kein Dekotext
- Text niemals als Bild einbetten – Google muss ihn lesen können

**Alt-Texte / Accessibility:**
- Wenn ein Mosaik-Bild als echter Link oder relevante Band-Vorschau funktioniert:
  sinnvoller Alt-Text, z. B. `Donnaweda live auf der Bühne`
- Wenn Bilder rein dekorativ im Hintergrund liegen:
  `alt=""` verwenden und das Mosaik für Screenreader nicht unnötig aufblähen
- Der zentrale Text-Layer muss die inhaltliche Aussage tragen, nicht die Alt-Texte der Deko-Bilder

### Wording

**H1 (so lassen – funktioniert):**
> Livebands entdecken – für dein Event

**Subline:**
> Finde passende Livebands nach Anlass & Stil – und kontaktiere sie direkt.

**Kategorie-Links (klickbar, zu den Kategorie-Seiten):**
> Hochzeit · Festzelt · Firmenfeier · Gala

**CTA-Button:**
> Bands entdecken & direkt anfragen

### Mobile

- Mosaik: weniger Spalten (2–3 statt 5–6), Fotos bleiben sichtbar
- Headline bleibt groß und lesbar
- Kategorie-Links als Chips oder untereinander gestapelt
- CTA nicht unter dem Fold verstecken
- Overlay auf Mobile etwas stärker (`rgba(18, 16, 26, 0.72)`) für Lesbarkeit

### Was nicht passieren darf

- Kein einzelnes Stockfoto statt Mosaik
- Kein Videoloop im Hero (Performance + Mobile)
- Keine H1 die aus einem Bild besteht – Text muss HTML sein
- Keine Kategorie-Links ohne echten `<a>`-Tag
- Keine pauschale `priority`/`eager`-Ladung für alle Mosaik-Bilder
- Kein zu schwacher Overlay – Text muss auf jedem Gerät lesbar sein
- Kein schwarzer Overlay (`rgba(0,0,0,...)`) – immer `--pl-bg-stage`-basiert
- Keine rohen Airtable-Attachment-URLs als dauerhafte Bildquelle

---

## Bildsprache

- **Echte, authentische Livefotos** – keine Studioaufnahmen, keine Stock-Ästhetik
- Atmosphäre ist wichtiger als technische Perfektion
- Kontrastreiche Fotos bevorzugen – sie tragen sowohl auf dunklen als auch auf hellen Flächen
- Menschen im Mittelpunkt: Band auf der Bühne, Publikum, Emotionen
- Dynamische Bildausschnitte erlaubt – kein statischer Headshot-Stil
- Bandlogos als separate Assets, nicht als Ersatz für Fotos
- Fehlende oder schwache Bilder brauchen ruhige Fallbacks, keine hektischen Platzhalter

---

## Typografische Anmutung

- Klar, sachlich-warm, gut lesbar
- Headlines: prägnant und direkt – keine Schreibschriften, kein Serif-Kitsch
- Fließtext: ruhig und lesbar, nicht zu schmal
- Schrifthierarchie klar: H1 dominant, H2 strukturierend, Body unauffällig
- Keine typografischen Spielereien, die vom Inhalt ablenken
- Kurze, hilfreiche Microcopy statt werblicher Überredung

---

## Semantisches Farbsystem

### Philosophie

> proudleut ist ein Feinkostladen mit Bühne.
>
> Die Farben sollen sich anfühlen wie: gutes Papier, warmes Licht,
> und ab und zu ein Blick durch eine offene Tür auf eine Bühne,
> auf der gerade etwas Besonderes passiert.
>
> 30% Bühne. 70% Feinkostladen.

Drei Fragen vor jeder Section:
1. **Fühlen?** → `bg-stage` (Bühne) – max. 2× pro Seite
2. **Vertrauen?** → `bg-paper` (Papier) – warm, persönlich
3. **Verstehen?** → `bg-canvas` (Leinwand) – ruhig, funktional

### CSS Custom Properties

```css
:root {
  /* ── Hintergrundflächen ── */
  --pl-bg-stage:          #12101a;  /* Bühne: Hero, Referenz-Events, Footer */
  --pl-bg-stage-elevated: #1e1a28;  /* Karten auf Bühnenfläche */
  --pl-bg-paper:          #f5f0e8;  /* Warmes Papier: Kategorien, Xandi, CTA */
  --pl-bg-canvas:         #f9f7f3;  /* Ruhige Leinwand: Prozess, FAQ, Testimonials */
  --pl-bg-elevated:       #fefdfb;  /* Cards auf hellem Grund (kein reines Weiß) */

  /* ── Textfarben (helle Flächen) ── */
  --pl-text-main:         #2a2226;  /* Haupttext. Warm-Schwarz, nie #000 */
  --pl-text-muted:        #6b5f65;  /* Subtitel, Beschreibungen. Warm-Grau */
  --pl-text-hint:         #84787e;  /* Meta-Infos, Bandanzahl, Timestamps */

  /* ── Textfarben (dunkle Flächen) ── */
  --pl-text-on-stage:       #ede8e3;  /* Haupttext auf Bühne. Warmes Offwhite */
  --pl-text-on-stage-muted: #8a7e84;  /* Subtexte auf Bühne */

  /* ── Textfarbe auf Akzent-Buttons ── */
  --pl-text-on-accent:    #fefdfb;  /* Text auf accent-Buttons. Kein reines #fff */

  /* ── Brand-Akzent ── */
  --pl-accent:            #75518B;  /* CTAs, aktive Links, Icons, Fokusringe */
  --pl-accent-hover:      #8a64a0;  /* Hover für Buttons */
  --pl-accent-link-hover: #5e3f72;  /* Hover für Text-Links auf hellem Grund */
  --pl-accent-subtle:     #f4f0f6;  /* Pills, Tags, Badges (Hintergrund) */
  --pl-accent-deep:       #5e3f72;  /* Text auf accent-subtle */
  --pl-accent-on-stage:   #c4a8d8;  /* Akzent auf dunklem Grund */

  /* ── Borders ── */
  --pl-border-soft:   rgba(117, 81, 139, 0.10);  /* Cards auf hellem Grund */
  --pl-border-medium: rgba(117, 81, 139, 0.20);  /* Hover, Divider, FAQ-Trennlinien */
  --pl-border-stage:  rgba(196, 168, 216, 0.15);  /* Cards/Elemente auf Bühnenfläche */

  /* ── Schatten (nur für Foto-Cards) ── */
  --pl-shadow-photo: 0 2px 8px rgba(42, 34, 38, 0.06);  /* Sehr subtil, warm */

  /* ── Bühnen-Gradienten ── */
  --pl-gradient-stage: linear-gradient(180deg,
    #12101a 0%, #17122a 45%, #12101a 100%);
  --pl-gradient-footer: linear-gradient(180deg,
    #17122a 0%, #12101a 100%);
  --pl-gradient-spotlight: radial-gradient(
    ellipse at 50% 100%,
    rgba(117, 81, 139, 0.12) 0%, transparent 60%);
}
```

### Tailwind-Mapping

**Tailwind v4 beachten:** Vor Änderungen prüfen, ob Farben über `@theme` / CSS Custom
Properties in `globals.css` oder über eine bestehende Tailwind-Config gepflegt werden.
Keine neue `tailwind.config.js` anlegen, wenn das Projekt aktuell ohne Config arbeitet.
Die folgenden Werte sind als Referenz für beide Wege geeignet:

```js
// tailwind.config.js → theme.extend (falls Config existiert)
// ODER: als @theme-Block / CSS Custom Properties in globals.css (Tailwind v4)
colors: {
  'pl-stage':          '#12101a',
  'pl-stage-elevated': '#1e1a28',
  'pl-paper':          '#f5f0e8',
  'pl-canvas':         '#f9f7f3',
  'pl-elevated':       '#fefdfb',
  'pl-text':           '#2a2226',
  'pl-text-muted':     '#6b5f65',
  'pl-text-hint':      '#84787e',
  'pl-on-stage':       '#ede8e3',
  'pl-on-stage-muted': '#8a7e84',
  'pl-on-accent':      '#fefdfb',
  'pl-accent': {
    DEFAULT:      '#75518B',
    hover:        '#8a64a0',
    'link-hover': '#5e3f72',
    subtle:       '#f4f0f6',
    deep:         '#5e3f72',
    light:        '#c4a8d8',
  },
},
borderColor: {
  'pl-soft':   'rgba(117, 81, 139, 0.10)',
  'pl-medium': 'rgba(117, 81, 139, 0.20)',
  'pl-stage':  'rgba(196, 168, 216, 0.15)',
},
boxShadow: {
  'pl-photo': '0 2px 8px rgba(42, 34, 38, 0.06)',
},
```

### Tailwind-Klassen in der Praxis

```
Bühnen-Section:       bg-pl-stage text-pl-on-stage
Card auf Bühne:       bg-pl-stage-elevated border-pl-stage
Warme Section:        bg-pl-paper text-pl-text
Funktionale Section:  bg-pl-canvas text-pl-text
Card auf Hell:        bg-pl-elevated border-pl-soft
Foto-Card auf Hell:   bg-pl-elevated border-pl-soft shadow-pl-photo
CTA-Button:           bg-pl-accent hover:bg-pl-accent-hover text-pl-on-accent
Pill/Badge:           bg-pl-accent-subtle text-pl-accent-deep
Text-Link (hell):     text-pl-accent hover:text-pl-accent-link-hover
Text-Link (dunkel):   text-pl-accent-light hover:text-pl-on-stage
```

### Hover-Verhalten: Buttons vs. Links

| Element | Hover-Richtung | Grund |
|---------|---------------|-------|
| Button (`bg-accent`) | Heller → `#8a64a0` | Einladend, öffnend |
| Text-Link (hell) | Dunkler → `#5e3f72` | Zielstrebig, klar, besserer Kontrast |
| Text-Link (dunkel) | Heller → `text-on-stage` | Sichtbarkeit auf Bühne |

### Schatten-Regel

Keine starken SaaS-Shadows (`shadow-md`, `shadow-lg`). Schatten nur bei Foto-Cards erlaubt,
wenn die Card sonst zu flach wirkt. Dafür `shadow-pl-photo` verwenden – sehr subtil, warm
getönt. Reine Text-Cards (Testimonials, FAQ) bekommen keinen Schatten, nur `border-soft`.

### Akzent-Einsatz

| Kontext | Verwendung |
|---------|------------|
| CTA-Button | `bg-pl-accent hover:bg-pl-accent-hover text-pl-on-accent` |
| Text-Link (hell) | `text-pl-accent hover:text-pl-accent-link-hover` |
| Text-Link (dunkel) | `text-pl-accent-light hover:text-pl-on-stage` |
| Pill / Badge | `bg-pl-accent-subtle text-pl-accent-deep` |
| Icon | `text-pl-accent` (16–20px) |
| Fokusring | `ring-2 ring-pl-accent ring-offset-2` |
| Card-Hover | `hover:border-pl-medium` (von `border-soft` zu `border-medium`) |
| Gradient-Schimmer (Bühne) | Nur über CSS-Gradient, nie als flat fill |

### Gradienten-Einsatz

| Gradient | Wo | Wie |
|----------|----|-----|
| `gradient-stage` | Hero-Section | Hinter dem Mosaik. Der Mittelwert `#17122a` liegt bewusst nah an `#12101a` – der violette Schimmer soll wie Bühnenlicht wirken, nicht wie eine lila Fläche. |
| `gradient-footer` | Footer | Violett oben, verglimmt nach unten. Abschluss-Vorhang. |
| `gradient-spotlight` | Referenz-Events | Als Overlay über `bg-stage`. Wie ein Spot, der von unten auf die Cards fällt. Opacity 0.12, nicht mehr. |

Gradienten sind immer Hintergrund, nie auf Text, nie auf Cards, nie auf hellen Flächen.

### Section-Zuordnung (Homepage)

| # | Section | Hintergrund | Textfarbe | Cards/Borders | Rolle |
|---|---------|-------------|-----------|---------------|-------|
| 1 | Hero + Mosaik + Logos | `bg-stage` + `gradient-stage` | `text-on-stage`, `accent-on-stage` | — | Emotion, Wow, Vertrauen |
| 2 | Veranstaltungstypen | `bg-paper` | `text-main`, `text-muted` | `bg-elevated` + `border-soft` + `shadow-photo` | Einstieg ins Stöbern |
| 3 | So funktioniert's | `bg-canvas` | `text-main`, `text-muted` | — | Orientierung, Klarheit |
| 4 | Referenz-Events | `bg-stage` + `gradient-spotlight` | `text-on-stage` | `bg-stage-elevated` + `border-stage` | Dunkle Insel, Bühnengefühl |
| 5 | Xandi persönlich | `bg-paper` | `text-main`, `text-muted` | — | Vertrauen, Wärme, Gesicht |
| 6 | Testimonials | `bg-canvas` | `text-main`, `text-muted` | `bg-elevated` + `border-soft` | Sachlich, glaubwürdig |
| 7 | FAQ | `bg-canvas` | `text-main` | `border-medium` (Divider) | Funktional, SEO |
| 8 | Abschluss-CTA | `bg-paper` | `text-main`, `accent` (CTA) | — | Einladend, warm |
| 9 | Footer | `bg-stage` + `gradient-footer` | `text-on-stage-muted`, `accent-on-stage` | `border-stage` | Ruhiger Abschluss |

### Farbsystem-Verbote

- Kein `#000000` und kein `#ffffff` nirgendwo – auch nicht als Textfarbe auf Buttons
- Kein Accent (`#75518B`) als große dekorative Flächenfarbe – einzige Ausnahme: primäre CTA-Buttons
- Max. 2 dunkle Bühnen-Content-Sections pro Seite (Hero + eine emotionale Insel).
  Der Footer zählt als Abschlussfläche nicht in diese Begrenzung.
- Keine Gradienten auf hellen Sections
- Accent nie als große Textfarbe – nur Links, CTAs, kleine Labels
- Keine schwarzen Overlays (`rgba(0,0,0,...)`). Overlays immer auf Basis von
  `--pl-bg-stage` aufbauen, z. B. `rgba(18, 16, 26, 0.62)`

### Kontrast-Check (WCAG AA)

| Kombination | Kontrastverhältnis | Status |
|-------------|-------------------|--------|
| `text-main` auf `bg-paper` | ~12.5:1 | ✓ AAA |
| `text-main` auf `bg-canvas` | ~13.2:1 | ✓ AAA |
| `text-muted` auf `bg-paper` | ~5.2:1 | ✓ AA |
| `text-hint` auf `bg-canvas` | ~4.5:1 | ✓ AA |
| `text-on-stage` auf `bg-stage` | ~14.8:1 | ✓ AAA |
| `text-on-stage-muted` auf `bg-stage` | ~5.4:1 | ✓ AA |
| `accent` auf `bg-paper` | ~4.6:1 | ✓ AA |
| `text-on-accent` auf `accent` | ~5.1:1 | ✓ AA |
| `accent-link-hover` auf `bg-paper` | ~6.8:1 | ✓ AA |

---

## Buttons / Links / CTAs

- Primär-Button: `bg-pl-accent text-pl-on-accent` – klar, aber nicht schreierisch
- Sekundär: Ghost-Button (transparenter Hintergrund, `border-pl-medium`)
- CTAs sollen zur Seite passen – kein „JETZT BUCHEN"-Stil
- Links klar erkennbar, aber dezent
- „Band direkt anfragen" – der wichtigste CTA auf Bandprofilen – prominent, aber würdevoll
- Wording soll Direktkontakt erklären, nicht Plattformbuchung suggerieren

---

## Sections / Inhaltsmodule

### Bandkarten-Grid

**Das Herzstück der gesamten Seite – hier wird proudleut erlebt.**

Das zentrale UX-Prinzip, abgeleitet aus Netflix, Airbnb und GetYourGuide:

> *„Die Bandkarte ist die wichtigste Einheit der Seite. Sie muss so stark sein,
> dass man beim Scrollen hängen bleibt und klicken will."*

Das bedeutet konkret:

- **Das Foto arbeitet.** Es ist das erste was der Nutzer sieht – es muss Lust machen.
  Atmosphärisch, lebendig, kontrastreich. Kein weißer Hintergrund, kein Headshot-Stil.
- **Wenig Text auf der Karte.** Bandname, ein Satz, Anlass – fertig. Kein Info-Overload.
  Wie bei Airbnb: eine Karte = eine Entscheidungseinheit.
- **Browsing soll Spaß machen.** Wie bei Netflix: man scrollt und will mehr sehen.
  Das passiert nicht durch Design-Tricks, sondern durch starke Fotos und klare Karten.
- **Einheitliche Proportionen.** Kein visuelles Chaos durch unterschiedliche Bildformate.
  Alle Karten gleich groß, gleicher Bildausschnitt (Aspect Ratio festlegen).
- **Hover-State dezent.** Subtile Aufhellung oder leichte Skalierung – kein Sprung.

Grid-Logik:
- Desktop: 3 Spalten
- Tablet: 2 Spalten
- Mobile: 1 Spalte, auf mittleren Screens 2

Karteninhalt (von oben nach unten):
1. Bandfoto (Hauptfläche, festes Seitenverhältnis)
2. Bandname (prominent)
3. Kurztext / Bandart (1 Zeile)
4. CTA-Link „Zur Band" oder „Band ansehen"

### Filter / Auswahlhilfen

Filter sind Orientierungshilfe, kein technisches Suchformular. Sie sollen Veranstaltern helfen,
schneller eine passende Richtung zu finden, ohne das Browsing-Gefühl zu zerstören.

Grundsatz:
- Filter sind funktional, klar und ruhig.
- Sie helfen bei Anlass, Bandart, Region und Bandgröße.
- Sie dürfen nicht dominanter wirken als die Bandkarten.
- Keine Preisfilter, keine Bewertungssterne, keine Verfügbarkeitslogik.
- Keine UI-Muster, die eine direkte Plattformbuchung suggerieren.

**URL-State für Filter (Trivago-Prinzip):**

Gefilterte Bandlisten sollen saubere, teilbare URLs erzeugen.
Beispiele:
- `/bands?region=bayern` → alle Bands in Bayern
- `/bands?genre=jazz&event=hochzeit` → Jazzbands für Hochzeiten
- `/bands?region=oberpfalz&genre=partyband` → Partybands in der Oberpfalz

Ein Veranstalter, der eine gefilterte Ansicht an einen Kollegen schickt, soll das gleiche
Ergebnis sehen. Für SEO sind gefilterte Query-URLs aber nicht der primäre Hebel.
Indexierbare Einstiegsseiten entstehen gezielt über programmatische Routen wie
`/bandtyp/[slug]`, `/region/[slug]` und später ausgewählte Kombinationen wie
`/hochzeitsband-muenchen`.

Technisch: Query-Parameter in der URL, ausgelesen per `useSearchParams()` in Next.js,
Client-seitige Filterung im React-State. Keine Serverseite nötig für ~150 Bands.

Desktop:
- Filter dürfen oberhalb oder seitlich der Bandliste stehen.
- Aktive Filter müssen gut sichtbar sein, aber nicht laut.
- Die Bandliste bleibt visuell das Zentrum der Seite.

Mobile:
- Filter als ruhiger Drawer, Akkordeon oder kompakter Filterbereich.
- Touch-Targets ausreichend groß.
- Aktive Filter klar anzeigen und einfach zurücksetzen.
- Kein überladenes Mobile-Overlay mit zu vielen Optionen auf einmal.

### Bandprofil-Sidebar

- Rechts: Logo, Social Links, Kontaktdaten (wie Donnaweda-Referenz)
- Links: Hauptinhalt (Text, Video, Bilder, Hochzeitsinfos)
- Klar strukturiert, gut scanbar
- CTA „Band direkt anfragen" sichtbar, aber nicht marktschreierisch

### Explainer-Section

Homepage-Modul zur Erklärung des proudleut-Prinzips.

- 3–4 Schritte als Icon + Text
- Ruhig und schnörkellos
- Fokus: entdecken, vergleichen, direkt anfragen
- Kein Plattform-/Provision-Framing

### Ähnliche Bands

- 3 Bandkarten am Ende des Profils
- Visuell gleiche Logik wie Kategorie-Grid
- Soll wie persönliche Empfehlung wirken, nicht wie algorithmischer Abverkauf

### Testimonials

- Zitat prominent, Person erkennbar
- Kein Karussell wenn möglich – statisch ist ehrlicher
- Testimonials müssen Vertrauen stützen, nicht nach Marketingblock wirken

### Xandi-/Kurator-Block

- Darf sichtbar und persönlich sein
- Nicht zu großspurig, nicht als „Experten-Guru"
- Ziel: Vertrauen, Haltung, Erfahrung
- Eher „Ich helfe dir, schneller eine gute Entscheidung zu treffen" als „Ich bin die Marke"

---

## Rhythmus und Seitenfluss

- Ruhig, klar, mit bewusstem Takt
- Sections atmen – keine gedrängte Aneinanderreihung
- Der Nutzer soll sich orientiert, nicht überwältigt fühlen
- Scrollen fühlt sich redaktionell an, nicht wie ein Katalog
- Zwischen großen Bildmomenten und funktionalen Modulen braucht es gute Übergänge
- Der Licht-Dunkel-Rhythmus unterstützt den Seitenfluss:
  dunkel (Bühne) → warm-hell (Stöbern) → hell (Orientierung) → dunkel (Bühneninsel) →
  warm-hell (Vertrauen) → hell (Funktion) → warm-hell (Einladung) → dunkel (Abschluss)

---

## Mobile-Verhalten

- Mobile ist primär – viele Veranstalter suchen vom Smartphone
- Gleiche Stimmung wie Desktop erhalten – nicht zu stark vereinfachen
- Bildwirkung auch mobil ernst nehmen
- Bandkarten: 1 Spalte auf kleinen Screens, 2 auf mittleren
- Navigation: Hamburger-Menü, aber kein überladenes Mobile-Overlay
- Kontaktbutton / CTA gut erreichbar
- Filter mobil einfach, klar und nicht zu technisch lösen

---

## Animation / Bewegung / Interaktion

- **Sehr zurückhaltend** – Bewegung unterstützt, sie dominiert nicht
- Subtle Fade-in beim Scrollen erlaubt (nur wenn `prefers-reduced-motion` respektiert)
- Hover-Effekte auf Bandkarten: sanft, nicht sprunghaft
- Keine Scroll-Hijacking, keine Show-Animationen
- Keine Parallax-Effekte auf Bandfotos
- Keine Microinteractions, die wichtiger wirken als der Inhalt

---

## Konsistenzregeln

- Gleiche Header-/Footer-Logik auf allen Seiten
- Konsistente Section-Abstände (Tailwind-Spacing-System verwenden)
- Gleiche Bandkarten-Optik auf allen Kategorie-Seiten
- Gleiche Typografie-Hierarchie überall
- Akzentfarbe nur für interaktive/aktive Elemente, nicht als dekorative Fläche
- Tonalität in Text und Design konsistent: warm-professionell, kein Stilbruch
- Kategorie-Seiten, Bandprofile und Homepage müssen wie ein gemeinsames System wirken
- Farbsystem-Tokens konsequent verwenden – keine willkürlichen Hex-Werte

---

## Was modernisiert werden darf

- Responsives Raster (vom Webflow-Grid zu Tailwind-Grid)
- Abstände und Weißraum bewusster und großzügiger gesetzt
- Bilddarstellung optimiert (Next.js Image-Komponente)
- Semantische Struktur sauberer (HTML5, ARIA)
- Performance (ISR, optimierte Assets)
- Mobile-Nutzbarkeit (Touch-Targets, Filter-UX)
- Bessere Zustände für leere/fehlende Daten
- Sauberere CTA-Hierarchie
- Farbwelt: von durchgehend dunkel zu Hybrid-Rhythmus (30/70 Bühne/Feinkostladen)

---

## Was nicht „verbessert" werden soll

- Das Lila (#75518B) als Markenfarbe
- Die Bandkarten-Grid-Logik (funktioniert gut, wird erkannt)
- Die Sidebar-Logik auf Bandprofilen
- Xandis Kurator-Persönlichkeit (kein anonymes Plattform-Feeling reinbringen)
- Die direkte, nicht-vermittelnde Kommunikation
- Die bestehende Identität zugunsten einer generischen Premium-Optik aufgeben
- Die emotionale Bildwirkung – dunkle Bühnenflächen bleiben für die richtigen Momente

---

## Idealsatz für das Ergebnis

„Die neue proudleut-Seite soll wirken, als wäre die bestehende Identität – warm,
persönlich, mit Überblick – sorgfältig in ein sauberes, zeitgemäßes System übersetzt
worden. Viele Bands, aber kein Gefühl von Masse. Dunkle Bühnenmomente für Emotion,
warme helle Flächen für Orientierung. Man soll spüren:
Hier steckt Erfahrung, Haltung und echte Auswahl dahinter."
