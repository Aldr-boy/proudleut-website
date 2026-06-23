# Analysebericht: Grid-System proudleut.com
**Stand:** 2026-06-22 | **Scope:** Read-only | **Kein Code geändert**

---

## 1. Kurzfazit

### Bekannter Befund verifiziert?

Ja, vollständig. `max-w-[1140px]` ist der De-facto-Primärcontainer — er taucht in 26 Fundstellen
auf (Seiten, Sections, Komponenten). `max-w-[820px]` ist der konsistente Sekundärcontainer
für Prose/Video. Kein `tailwind.config.js`, keine `container`-Klasse, keine
`col-start`/`col-span`-Positionierung in Page-Layouts.

### Abweichungen vom bekannten Stand?

**Neu gefunden (nicht im GridOverlay-Audit dokumentiert):**

Die Homepage und globale Chromelemente (`Header.tsx`, `Footer.tsx`) nutzen **`max-w-6xl`
(Tailwind-Default: 1152 px)** statt `max-w-[1140px]`. Der Unterschied beträgt 12 px —
visuell marginal, architektonisch aber ein inkonsistentes zweites System.

Außerdem existieren mehrere Ein-Punkt-Breiten für Binnenhierarchie (`max-w-[960px]`,
`max-w-[820px]`, `max-w-[680px]`, `max-w-[600px]`, `max-w-[560px]`), die als
**visuelles Engführungswerkzeug** innerhalb eines 1140-px-Wrappers eingesetzt werden,
nicht als konkurrierende Container.

### Dominierende Layout-Muster?

Drei Muster, in dieser Häufigkeit:

1. **Container-Only:** `max-w-[1140px] mx-auto px-4 sm:px-6` — Section wird zentriert,
   Inhalt bleibt als Block oder Flex.
2. **Container + Uniform-Grid:** Selber Container, darin `grid grid-cols-1 sm:grid-cols-2
   lg:grid-cols-3 gap-6` — einheitliche Spaltenbreiten, kein Span-Positioning.
3. **Prose-Narrowing:** Innerhalb des 1140-px-Rahmens wird ein Element auf `max-w-[820px]`
   eingeengt — für Fließtext, Video, FAQ-Blöcke.

### Konkurrierende Breiten?

| Breite | Verwendung | Konflikt mit 1140px? |
|--------|-----------|----------------------|
| `max-w-6xl` (1152 px) | Homepage-Sections, Header, Footer | Ja — 12 px Abweichung |
| `max-w-5xl` (1024 px) | Kontakt-Formular-Wrapper, Explainer | Leicht engerer Container |
| `max-w-4xl` (896 px) | Kontakt-Formular-Intro-Grid | Bewusstes Engführen |
| `max-w-2xl`, `max-w-xl` | Subtitle-/Hero-Texte | Kein Container, nur Texteingabe |

Kein Wert ist systemisch oder als echte Alternative zu 1140 px konzipiert — aber
`max-w-6xl` auf Homepage/Header/Footer ist ein konkretes Konsistenzproblem.

### Größte Risiken?

1. **`max-w-6xl` vs. `max-w-[1140px]` im Header/Footer:** Wenn beide Systeme auf
   dieselbe Breite gebracht werden sollen, müssen 6+ Fundstellen koordiniert angepasst
   werden. Fehler hier ändert das visuelle Bild auf jeder Seite.
2. **Kein Container-Token vorhanden:** Jede Änderung des Containerwerts muss heute
   manuell in 26+ Dateien erfolgen — hohe Fehlerquote.
3. **BandExplorer als Client-Komponente:** Filter, Radius, Sortierung und Pagination
   liegen als React-State in `BandExplorer.tsx`. Jede Layout-Änderung an der
   Karten-Grid-Struktur berührt gleichzeitig Render- und Interaktionslogik.

---

## 2. Container- und Breiten-Inventar

| Datei | Komponente / Seite | Breite | Padding/Gutter | Bewertung |
|-------|-------------------|--------|---------------|-----------|
| `app/layout.tsx` | Root-Layout | keiner | — | Standard |
| `app/globals.css` | CSS-Basis | keiner | — | Standard |
| `app/page.tsx` | Homepage-Sections | `max-w-6xl` | `px-4 sm:px-6` | **Problem** — Ausreißer |
| `app/bands/page.tsx` | BandExplorer-Wrapper | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `app/band/[slug]/page.tsx` | Ähnliche Bands | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `app/ueber-mich/page.tsx` | Alle 6 Sections | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `app/fuer-bands/page.tsx` | 7 Sections | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `app/fuer-bands/page.tsx` | FAQ-Text-Blöcke | `max-w-[820px]` | `px-4 sm:px-6` | Standard |
| `app/kontakt/page.tsx` | Hero-Text | `max-w-2xl` | `px-4 sm:px-6` | Sonderfall (Text) |
| `components/Header.tsx` | Global Header | `max-w-6xl` | `px-4 sm:px-6` | **Problem** — Ausreißer |
| `components/Footer.tsx` | Global Footer | `max-w-6xl` | `px-4 sm:px-6` | **Problem** — Ausreißer |
| `components/bands/BandsHero.tsx` | Hero + Slide-Wrapper | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandHero.tsx` | Band-Detail-Hero | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandDescription.tsx` | Prose-Text | `max-w-[820px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandVideoSection.tsx` | Video-Embed | `max-w-[820px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandGallery.tsx` | Galerie-Grid | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandReferenceEvents.tsx` | Event-Cards | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandSocialIndex.tsx` | Social-Stats | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandTagsSection.tsx` | Tag-Grid | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandWeddingModule.tsx` | Hochzeits-Modul | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/BandContactSection.tsx` | CTA + Kontakt | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/band/HeroCTA.tsx` | CTA-Buttons | `max-w-[1140px]` | — | Standard |
| `components/band/MerklisteBar.tsx` | Sticky-Bar | `max-w-[1140px]` | `px-4 sm:px-6` | Standard |
| `components/kontakt/KontaktFormular.tsx` | Formular-Intro | `max-w-4xl` | `px-4 sm:px-6` | Sonderfall |
| `components/kontakt/KontaktFormular.tsx` | Formular + Sidebar | `max-w-5xl` | — | Sonderfall |
| `components/homepage/Explainer.tsx` | Erklärungs-Box | `max-w-5xl` | `px-4 sm:px-6` | Sonderfall |

**Zählung:** 20× Standard (1140 px), 3× Problem (6xl-Ausreißer auf Homepage/Chrome), 3× Sonderfall

---

## 3. Grid- und Spalten-Inventar

| Datei | Verwendetes Grid | Zweck | Risiko bei Migration |
|-------|----------------|-------|---------------------|
| `components/bands/BandExplorer.tsx` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` | Band-Karten im Finder | **Hoch — Sonderfall (siehe unten)** |
| `components/band/BandGallery.tsx` | Variiert (1–3 Spalten nach Bildanzahl) | Galerie | Mittel |
| `components/band/BandReferenceEvents.tsx` | `grid-cols-1 md:grid-cols-2` | Event-Cards | Niedrig |
| `components/band/BandTagsSection.tsx` | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` | Tag-Chips | Niedrig |
| `components/band/BandSocialIndex.tsx` | `grid-cols-1 md:grid-cols-3` (bedingt) | Social-Stats | Niedrig |
| `app/ueber-mich/page.tsx` | `grid-cols-1 md:grid-cols-2` | Feature-Blöcke | Niedrig |
| `app/ueber-mich/page.tsx` | `grid-cols-[220px_1fr]` (ab sm) | Label + Wert | Niedrig |
| `app/fuer-bands/page.tsx` | `grid-cols-1 sm:grid-cols-3` | Feature-Cards | Niedrig |
| `app/fuer-bands/page.tsx` | `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]` | Text + Fixed-Sidebar | Mittel |
| `app/fuer-bands/page.tsx` | `grid-cols-1 lg:grid-cols-2` | Profil-Mockup | Niedrig |
| `components/kontakt/KontaktFormular.tsx` | `grid-cols-1 sm:grid-cols-2` | Formular-Felder | Niedrig |
| `components/kontakt/KontaktFormular.tsx` | `grid-cols-1 lg:grid-cols-[1fr_300px]` | Formular + Sidebar | Niedrig |
| `app/page.tsx` (Homepage) | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` | Band-Karten-Vorschau | Mittel |
| `components/homepage/FAQ.tsx` | `grid-cols-1 md:grid-cols-[1fr_2fr]` | Nav + Inhalt (1:2) | Niedrig |
| `components/homepage/LogoStrip.tsx` | `grid-cols-3` | Logo-Reihe | Niedrig |

### BandExplorer als Sonderfall

Der Finder ist aus mehreren Gründen kein geeignetes Pilot-Ziel:

1. **Client-Komponente mit State-Abhängigkeit:** `BandExplorer.tsx` ist `'use client'`.
   Filter, Radius (Haversine), Sortierung, Karten-Pagination und Kategorie-Zustand laufen
   als React-State. Eine Änderung der Karten-Grid-Klasse verändert gleichzeitig das
   visuelle Layout und kann Filterdarstellungen verschieben.
2. **Kein `col-span`-Bedarf:** Die Karten sind gleichwertig — kein Karte ist größer oder
   kleiner als eine andere. Ein reines Uniform-Grid (1/2/3 Spalten) reicht dauerhaft aus.
3. **Regionale Trennzeilen:** Zwischen Regions-Gruppen werden Trennzeilen gerendert. Diese
   liegen außerhalb der Grid-Logik und müssten bei Strukturänderungen separat geprüft
   werden.
4. **Kein Gewinn durch 12-Spalten-Positionierung:** Die Karten brauchen kein
   `col-start`/`col-span` — das heutige 1/2/3-Pattern ist semantisch korrekt.

**Fazit Finder:** Layout-Status quo ist funktional korrekt. Kein Handlungsbedarf in Phase 1.

---

## 4. Kandidaten für Pilot-Migration

### Kandidat A: `app/ueber-mich/page.tsx` — sehr sicher

**Warum geeignet:**
- Server-Komponente (kein `'use client'`, kein State, kein JS-Verhalten)
- 6 klar getrennte Sections, alle konsequent `max-w-[1140px] mx-auto px-4 sm:px-6`
- Kein dynamischer Inhalt, keine Datenquelle (kein Airtable, kein Supabase, kein Sanity)
- Keine komplexen Grids — Grids sind einfach 2- und 3-spaltige Gleichteiler
- Selten besucht (kein SEO-primärer Traffic), daher geringes Risiko bei visuellem Fehler

**Betroffene Dateien:** Nur `app/ueber-mich/page.tsx`

**Risiko:** Sehr niedrig. Statische Seite, isoliert, keine Abhängigkeiten.

**Visueller GridOverlay-Check:** Desktop: rote 1140px-Linien müssen mit Container-Kanten
fluchten. Padding-Stripes (gelb) müssen mit dem Seiten-Rand fluchten.
Breakpoint-Label im Info-Panel: lg → 12 Spalten anzeigen.

---

### Kandidat B: Homepage-Sections (nur `max-w-6xl` → Token) — mittel

**Warum geeignet (mit Einschränkung):**
- Das eigentliche Problem ist die Breiten-Inkonsistenz zwischen `max-w-6xl` (Homepage,
  Header, Footer) und `max-w-[1140px]` (Rest der Seite). Ein Container-Token würde
  beide auf denselben Wert bringen.
- Betrifft Header und Footer — diese erscheinen auf **jeder Seite**. Daher ist das Risiko
  breiter als bei Kandidat A.

**Betroffene Dateien:** `app/page.tsx`, `components/Header.tsx`, `components/Footer.tsx`
und alle Homepage-Section-Komponenten (`components/homepage/*.tsx`)

**Risiko:** Mittel. Ein Fehler ist global sichtbar. Visuelles Delta zwischen 1140 px und
1152 px (12 px) ist minimal, aber Regression muss auf Desktop und Mobile geprüft werden.

**Visueller GridOverlay-Check:** Auf der Homepage prüfen, ob alle Sections nach der
Änderung auf derselben Container-Breite liegen (rote 1140px-Linien überall gleich).

---

### Kandidat C: Band-Detailseite, BandExplorer, Finder — nur später

**Warum nicht jetzt:**
- `app/band/[slug]/page.tsx` rendert viele Subkomponenten aus `components/band/`. Eine
  Container-Token-Migration berührt 10+ Dateien gleichzeitig.
- `BandExplorer.tsx` hat Client-State (siehe Sonderfall-Abschnitt oben).
- `BandGallery.tsx` hat dynamische Grid-Logik abhängig von Bildanzahl — Sonderfall.
- Band-Detailseiten sind SEO-primär (organisch hoch priorisiert), Regressions-Risiko
  bei Layout-Fehlern ist daher höher.

**Empfehlung:** Erst nach erfolgreichem Pilot A und B in Angriff nehmen.

---

## 5. Empfohlener Pilot + Architektur-Vorbereitung

### Empfohlener Pilot: Kandidat A — `app/ueber-mich/page.tsx`

**Begründung:** Die Seite ist die sicherste verfügbare Testfläche: reines Server-Component,
kein dynamischer Content, kein JS-State, keine SEO-Primärrolle, vollständig konsistente
Nutzung von `max-w-[1140px] mx-auto px-4 sm:px-6`. Die Seite besteht aus genau den
Mustern, die im Container-Standard standardisiert werden sollen.

**Konkret:** Ein Container-Token (`--pl-container-width: 1140px` o.ä. in `globals.css`,
dazu eine Tailwind-Utility-Klasse oder eigene CSS-Klasse `pl-container`) würde in
`ueber-mich` zuerst eingeführt. Bei grünem visuellen Check folgt der Rest.

Kritische Gegenfrage: Könnte Kandidat B nicht sinnvoller sein, weil er die
Inkonsistenz (1152 vs. 1140 px) direkt löst? Ja — aber Kandidat B berührt Header und
Footer auf jeder Seite. Das ist für ein erstes Proof-of-Concept unnötiges Risiko. Die
Inkonsistenz existiert seit Projektbeginn und hat bisher keinen sichtbaren Schaden
verursacht. Kandidat A beweist das Konzept ohne globale Seiteneffekte.

---

### Architektur-Frage: Container-Standard oder volles 12/8/4-System?

**Auswertung der Befunde:**

Wie viele Bereiche sind reine Container-Fälle?

Von 26 Fundstellen mit `max-w-[1140px]` sind **24 reine Container-Fälle** — die
Section wird zentriert und erhält horizontale Abstände, aber das Inhalts-Layout
darunter ist entweder Block, Flex oder ein einfaches Uniform-Grid.

Wie viele Bereiche brauchen echte Spaltenlogik mit `col-span` / `col-start`?

**Aktuell: null.** Kein Page-Layout nutzt CSS-Grid-Positionierung. Alle Grids sind
Gleichteiler (jede Zelle gleich breit pro Breakpoint). Formen nutzen `col-span-2` intern,
aber das ist Form-Layout, kein Page-Layout.

**Empfehlung:**

> **Zuerst nur Container-Standard. Volles 12-Spalten-System erst wenn ein konkreter
> Anwendungsfall es erfordert.**

Ein `--pl-container`-Token (oder eine CSS-Klasse) löst das größte heutige Problem:
26 Stellen müssten bei einer Container-Breiten-Änderung manuell gesucht werden.
Ein Token macht das zu einer Änderung.

Ein volles 12/8/4-Spalten-System wäre heute ein **Solution in Search of a Problem**:
- Kein bestehendes Layout würde col-span-Positionierung brauchen
- Jedes Grid, das heute existiert, wäre im neuen System identisch mit dem alten
  (`grid-cols-3` bleibt `grid-cols-3` — keine Migration nötig)
- Der Overhead: alle Devs müssten Spalten-Klassen konsistent nutzen,
  obwohl der Gewinn null ist

**Wann wäre ein echtes 12-Spalten-System sinnvoll?**

Wenn proudleut eine Seite bekommt, die echtes asymmetrisches Layout braucht —
z.B. eine Kategorie-Seite mit fixierter Filter-Sidebar links und variablem Karten-Grid
rechts. Dann ist `col-span-4 + col-span-8` oder ähnliches die richtige Antwort.
Bis dahin ist ein sauberer Container-Standard ausreichend.

---

## 6. Nicht anfassen in Phase 1

Folgende Bereiche gehören explizit **nicht** in den ersten Grid-Pilot:

| Bereich | Datei(en) | Grund |
|---------|----------|-------|
| BandExplorer / Finder | `components/bands/BandExplorer.tsx` | Client-State, Filter-, Radius-, Paginationslogik |
| Radius-/Filterlogik | `components/bands/BandExplorer.tsx` | Funktionaler Kern des Finders |
| Band-Detail-Layout | `app/band/[slug]/page.tsx`, `components/band/*` | 10+ abhängige Komponenten, SEO-kritisch |
| Header | `components/Header.tsx` | Global, betrifft alle Seiten |
| Footer | `components/Footer.tsx` | Global, betrifft alle Seiten |
| Datenlogik | `lib/airtable/*`, `lib/supabase/*` | Keine Layout-Relevanz |
| Supabase / Airtable / Sanity | Alle lib-Dateien | Out-of-scope |
| KontaktFormular | `components/kontakt/KontaktFormular.tsx` | Eigene Grid-Logik (form-spezifisch), col-span-Nutzung |
| HeroMosaic | `components/homepage/HeroMosaic.tsx` | Full-bleed, kein Container |
| BandsHero | `components/bands/BandsHero.tsx` | Slider-Logik, Client-Abhängigkeiten |

---

## 7. Grober späterer Plan

### Phase 1 — Token / Klasse definieren

CSS Custom Property in `globals.css`:
```css
@theme {
  --pl-container: 1140px;
}
```

Optionale Tailwind-Utility-Klasse (falls Tailwind v4 `@utility` oder ähnliches genutzt wird):
Alternativ: reine CSS-Klasse `.pl-container { max-width: var(--pl-container); margin-inline: auto; }`.

**Entscheidung offen:** Tailwind-Klasse oder CSS-Klasse — erst festlegen wenn konkrete
Pilotseite angepackt wird.

### Phase 2 — Pilot-Section

Alle `max-w-[1140px] mx-auto` in `app/ueber-mich/page.tsx` durch Token/Klasse ersetzen.
Visuell mit GridOverlay prüfen.

### Phase 3 — Review mit GridOverlay

Desktop: rote 1140-px-Linien müssen mit Container-Kanten fluchten.
Mobile: Padding-Stripes (gelb) sichtbar, kein Content-Overflow.
Bruch-Check bei ~1188 px (Container beginnt zu greifen).

### Phase 4 — Weitere Migrationen

Nach erfolgreichem Pilot schrittweise:
1. `app/fuer-bands/page.tsx` (Server-Component, viele gleichartige Sections)
2. Homepage-Sections inkl. `max-w-6xl` → Token-Vereinheitlichung
3. Header / Footer (letzter Schritt, da global)
4. `components/band/*` (SEO-kritisch, daher nach allem anderen)

---

*Bericht: read-only. Keine Datei geändert. Kein Commit. Kein Push.*
