# projekt.md – proudleut.com

> Dieses Dokument beschreibt das Projektziel, die Zielgruppe, die Positionierung und die
> inhaltlichen Prioritäten von proudleut.com.
>
> Technische Details, Datenquellen und Migrationslogik → `migration-notes.md`  
> Datenmodell und Frontend-Mapping → `content-model.md`  
> Gestalterische Referenz → `design-reference.md`  
> Arbeitsregeln → `CLAUDE.md`

---

## Projekt

**Was ist proudleut?**

proudleut.com ist ein kuratiertes Liveband-Verzeichnis mit direktem Anfrageweg zur Band
für den deutschsprachigen (DACH) Markt. Die Seite hilft Veranstaltern dabei, die richtige
Liveband für ihr Event zu finden – nicht über einen Algorithmus, nicht über ein anonymes
Buchungssystem, sondern über kuratierten Content, klare Profilseiten und den persönlichen
Matchmaker-Ansatz von Xandi (Alexander Dressler).

proudleut ist keine klassische Booking-Plattform mit Provision, Postfach-Routing oder
Account-Logik. Die Plattform schafft Orientierung, Vertrauen und Sichtbarkeit. Der Kontakt
zur Band bleibt direkt.

**Was gebaut wird:**

Neuaufbau der bestehenden Webflow-Seite als Next.js/Sanity/Vercel-Projekt.
Keine Revolution – eine Evolution. Die Struktur, das Feeling und die Inhalte der Webflow-Seite
sind die primäre Referenz. Der Aufbau erfolgt in Phasen.

**Aktueller Stand:**

- Laufende Webflow-Seite (primäre Referenz)
- ~150 aktive Bands in Airtable
- Funktionierendes Make-Szenario für Bandanfragen (bleibt unberührt)
- Phase 1: Architektur und Datenmodell definiert, Neuaufbau beginnt

**Warum relevant:**

proudleut positioniert sich bewusst als Gegenentwurf zu großen, generischen
Eventplattformen (wie eventpeppers). Die Plattform ist kleiner, persönlicher und stärker
von Erfahrung geprägt – ein „Feinkostladen" statt Supermarkt.

---

## Projektziele

- Veranstaltern die schnelle, sichere Bandauswahl ermöglichen
- Bands eine hochwertige Visitenkarte und Sichtbarkeit geben
- Xandi als glaubwürdigen Kurator und Matchmaker positionieren
- Organische Sichtbarkeit über SEO, strukturierte Daten und lokale Suchanfragen aufbauen
- Die Plattform für zukünftige Erweiterungen (neue Kategorien, neue Regionen) vorbereiten
- Den bestehenden Workflow mit Airtable und Make erhalten, aber technisch sauberer anbinden

---

## Zielgruppe

**Primär – Veranstalter:**

- Privatpersonen, die eine Hochzeitsband suchen
- Firmen, die eine Band für Firmenfeier oder Business Event buchen wollen
- Gemeinden, Vereine, Stadtfeste (Festzelt, Kirchweih, Bürgerfest)
- Gastronomie und Eventlocations (Gala, Biergarten)
- Mentalität: Sie wollen Qualität, Verlässlichkeit und eine persönliche Empfehlung –
  kein Scrollen durch hunderte unbekannte Bands

**Sekundär – Bands:**

- Livebands im DACH-Raum, die gelistet sein wollen
- Bands, die von Xandi empfohlen werden und von der Sichtbarkeit profitieren
- Sie sehen proudleut als Ergänzung zu ihrer eigenen Website, nicht als Ersatz

---

## Wirkung / Positionierung

Die Seite soll:

- **Warm, kuratiert und vertrauenswürdig** wirken
- Das Gefühl geben: *„Hier hat jemand vorausgedacht für mich"*
- Xandis Persönlichkeit und Expertise sichtbar machen – ohne aufdringlich zu sein
- Professionell, aber nicht corporate – nahbar, aber nicht amateurhaft
- Nach Plattform aussehen, aber nach persönlicher Auswahl funktionieren

Sie soll auf keinen Fall:

- Generisch oder austauschbar wirken
- Wie ein KI-generiertes Template aussehen
- Kalt, technisch oder seelenlos sein
- Wie eine Massenplattform wirken (kein eventpeppers-Feeling)
- Den Eindruck erwecken, dass proudleut eine anonyme Vermittlungs- oder Provisionsplattform ist
- Überladen oder unübersichtlich sein

**Der interne Leitspruch:**

„Außen Plattform. Innen Kurator."

**Produktbegriff intern:**

Wenn möglich nicht von „Booking-Plattform" sprechen, sondern von:

- kuratiertem Liveband-Verzeichnis
- direktem Anfrageweg zur Band
- Matchmaker-Einstieg für Veranstalter
- Plattform für Orientierung und Sichtbarkeit

---

## Inhaltliche Schwerpunkte

**Wichtige Seiten:**

1. Kategorie-Seiten (Festzelt, Gala, Hochzeit, Firmenfeier & Business Event) –
   Haupteinstieg für Veranstalter per Google-Suche
2. Bandprofil – Visitenkarte der Band, Conversion-Seite für Direktkontakt
3. Homepage – Überblick, Vertrauensaufbau, Einstieg in die Kategorien
4. Über mich / Xandi – Matchmaker-Identität, Vertrauen, Persönlichkeit
5. Blog / Ratgeber – SEO, Kontext und Entscheidungshilfe

**Wichtige Funktionen:**

- Filterbare Bandliste pro Kategorie (Musikrichtung × Bandgröße × Region)
- Bandprofil mit direktem Kontaktweg zur Band (kein Mittelsmann)
- „Ähnliche Bands"-Empfehlung auf jedem Profil
- Blog / Content für SEO und Wissensaufbau
- Saubere interne Verlinkung zwischen Bandprofilen, Kategorien und relevanten Kontextseiten

**Wichtige Conversion-Ziele:**

- Veranstalter nimmt Kontakt zur Band auf (primär)
- Veranstalter nutzt die Anfragefunktion über das Kontaktformular (sekundär)
- Band meldet sich für Aufnahme ins Verzeichnis (tertiär)

**Wichtige Nutzerfragen, die beantwortet werden sollen:**

- „Welche Bands spielen bei Festen wie meinem?"
- „Gibt es gute Hochzeitsbands in meiner Region?"
- „Passt diese Band zu meinem Anlass, Budget und Publikum?"
- „Wer steckt hinter proudleut, und kann ich dem vertrauen?"
- „Wie komme ich mit der Band in Kontakt?"

---

## Projektkontext / Ausgangslage

**Was existiert bereits:**

- Laufende Webflow-Seite mit funktionierender Struktur (Referenz)
- ~150 Bands in Airtable mit sauber strukturierten Feldern (Slug, Kategorien, Geo, Bilder,
  Hochzeitsinfos, Social Links, Beschreibungstexte)
- Make-Szenario für Bandanfragen (Webhook → Airtable → Gmail)
- Erfahrung aus drei erfolgreichen Next.js-Projekten (Freunde des Brautpaares, Silk & Sound,
  San2)

**Was gut funktioniert:**

- Die Kategorien-Struktur (Festzelt, Gala, Hochzeit, Firmenfeier)
- Die Bandprofilseiten (Donnaweda-Format: Info-Sidebar, Fotos, Ähnliche Bands)
- Der direkte Kontaktweg (Band meldet sich selbst, kein Mittelsmann)
- Das Make-Szenario
- Die grundsätzliche dunkle, atmosphärische Markenwirkung

**Was sich verbessern soll:**

- Performance und SEO-Tiefe
- Flexibilität: neue Kategorien ohne Entwickleraufwand
- Design: von Webflow-Template zu eigenem, warmem Charakter
- Strukturierte Daten (Schema.org) für bessere Auffindbarkeit
- Weniger bewegliche Teile: Whalesync und Webflow fallen weg
- Sauberere Daten-Normalisierung zwischen Airtable und Frontend
- Klare Bildstrategie für stabile, performante Bildauslieferung

**Was bewusst erhalten bleibt:**

- Kategorien-Logik und URL-Struktur, sofern SEO-sinnvoll
- Bandprofil-Inhalt und -Aufbau
- Matchmaker-Only-Philosophie (keine Vermittlungsgebühr, kein Postfach-Routing)
- Die Tonalität: nahbar, kompetent, ehrlich
- Bestehende Airtable-Datenbank als Single Source of Truth für Banddaten

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- Sanity CMS
- Airtable (read-only, Banddatenbank)
- Vercel
- Make (bleibt unberührt)
- GitHub: Aldr-boy/[Repository eintragen]

---

## URL-Struktur

```txt
/                          → Homepage
/veranstaltung/[slug]      → Kategorie-Seite (dynamisch aus Sanity)
/band/[slug]               → Bandprofil (Daten aus Airtable)
/blog/[slug]               → Blogpost (Sanity)
/ueber-mich                → Über Xandi (Sanity)
/kontakt                   → Kontaktseite (Sanity + Make-Webhook)
/fuer-bands                → Für Bands (Sanity)
```

**Wichtig:**

Vor dem Domainumzug muss geprüft werden, welche bestehenden Webflow-URLs erhalten bleiben
oder per 301-Redirect sauber auf neue URLs umgeleitet werden. Details stehen in
`migration-notes.md` unter „SEO-Migration / Redirect-Strategie".

---

## SEO / Sichtbarkeit

- SEO ist für proudleut **hoch priorisiert** – organische Suche ist der Hauptkanal
- Local SEO ist wichtig: Bandsuche nach Region, PLZ, Landkreis, Regierungsbezirk
- Thematische Eindeutigkeit pro Seite ist kritisch (Kategorie, Anlass, Region, Bandart)
- Wichtige Seiten für Sichtbarkeit:
  - `/veranstaltung/festzelt` – Hochvolumen-Suchbegriffe
  - `/veranstaltung/hochzeit` – hoher Wettbewerb, hohe Kaufintention
  - `/band/[slug]` – Long-Tail pro Bandname + Ort + Stil
  - `/blog/` – Wissensaufbau, Cluster-Strategie
- Structured Data: `MusicGroup`, `ItemList`, `CollectionPage`, `WebSite`, `Organization`, `Person`
- `sameAs`-Verlinkung zwischen Bandprofilen und externen Band-Websites ist gewollt
- Interne Verlinkung über „Ähnliche Bands", Kategorie-Zuordnung und passende redaktionelle Inhalte
- Keine künstlich aufgeblähten SEO-Texte; Nutzerklarheit geht vor Keyword-Füllung

---

## Design-Hinweise

→ Ausführlich in `design-reference.md`

Kurz:

- Warm, kuratiert, vertrauenswürdig
- Keine generische Plattform-Optik
- Lila bleibt als Markenfarbe, aber bewusster eingesetzt
- Bandkarten-Grid bleibt das Herzstück der Kategorie-Seiten
- Xandis Persönlichkeit darf sichtbar sein
- Bandfotos tragen die emotionale Wirkung der Seite

---

## Wording / Tonalität

Texte sollen:

- Klar, glaubwürdig und nahbar klingen
- Kompetenz zeigen, ohne abzuheben
- Zur Zielgruppe passen: Veranstalter, die eine gute Entscheidung treffen wollen
- Den direkten Kontakt zur Band verständlich machen
- proudleut als Orientierungshilfe und persönliche Vorauswahl erklären

Vermeiden:

- Generische Marketingfloskeln ("Ihre perfekte Band für jeden Anlass")
- Austauschbare KI-Formulierungen
- Zu formelle oder zu werbliche Sprache
- Floskeln, die auf jeder Event-Plattform stehen könnten
- Begriffe, die proudleut wie eine Provisions-/Buchungsplattform wirken lassen

---

## Conversion / Nutzerführung

- **Primäres Ziel:** Veranstalter findet passende Band und nimmt direkt Kontakt auf
- **Wichtigste Hürden abbauen:**
  - „Passt die Band zu meinem Event?" → Kategorie-Filter, Bandprofil-Details
  - „Kann ich der Plattform vertrauen?" → Xandi als Kurator sichtbar machen
  - „Wie funktioniert das?" → Klarer Prozess auf Homepage und Kategorie-Seiten
  - „Muss ich über proudleut buchen?" → Nein, direkter Kontakt zur Band; proudleut gibt Orientierung
- Kein Postfach-Routing, keine Provision – das ist ein USP und muss verständlich kommuniziert werden

---

## Projektspezifische Regeln

- Airtable-Daten werden **nur gelesen**, nie geschrieben
- Das Make-Szenario darf nicht verändert werden
- Neue Veranstaltungskategorien werden über Sanity angelegt – kein Code-Eingriff nötig
- Bandprofile werden nicht in Sanity gepflegt – Airtable bleibt Single Source of Truth
- Mobile ist besonders wichtig – viele Veranstalter suchen spontan vom Smartphone
- Performance hat Vorrang: ISR, optimierte Bilder, minimale Client-JS
- Rohdaten aus Airtable werden nie direkt in UI-Komponenten verwendet, sondern zuerst normalisiert
- Airtable-Attachment-URLs werden nicht als dauerhaft stabile öffentliche Bildquelle behandelt

---

## Startstrategie / MVP

Der Neubau startet nicht mit der vollständigen Homepage, sondern mit einem technischen
Durchstich. Erst wenn Datenfluss, Bildstrategie und Deployment bewiesen sind, werden
umfangreiche Seiten und Designsystem ausgebaut.

**Phase 1A – Technischer Durchstich:**

- Next.js-Projekt steht
- Airtable-Verbindung funktioniert read-only
- Eine echte Band wird über `/band/[slug]` geladen
- Airtable-Daten werden über eine Normalisierungsfunktion in einen stabilen `Band`-Type gemappt
- Bildstrategie ist geklärt oder bewusst temporär gelöst
- Vercel-Build läuft

**Phase 1B – Grundsystem:**

- Sanity-Grundschemas
- Layout, Navigation, Footer
- erste Kategorie-Seite
- erste Bandkarten-Logik

**Phase 2 – Kernseiten:**

- Bandprofil-Seiten
- Kategorie-Seiten mit Filterlogik
- Homepage

**Phase 3 – Inhalte & SEO:**

- Sanity-Inhalte befüllen
- Structured Data
- Sitemap, robots.txt
- Redirect-Strategie
- On-Demand-Revalidierung prüfen

**Phase 4 – Ablösung Webflow:**

- Staging prüfen
- Domainumzug
- Webflow-Abo erst nach stabiler Livephase kündigen
- Whalesync-Abo erst nach stabiler Livephase kündigen

---

## Besondere Hinweise

- Die Ähnliche-Bands-Felder (`similar_1/2/3`) in Airtable sind Textfelder (kein Linked Record).
  Matching erfolgt über Bandname-Vergleich; Fallback auf Tag-Matching wenn leer.
- Die Geo-Hierarchie in Airtable (PLZ → Ort → Landkreis → Regierungsbezirk → Bundesland)
  ist für regionale Filter und Local SEO sehr wertvoll – sorgfältig nutzen.
- Xandi betreibt proudleut als Kleinunternehmer (§19 UStG) – keine Umsatzsteuer-Ausweisung
  in automatisierten E-Mails oder Rechnungen.
- `search_tokens_all`, `filter_tags_regio`, `event_keys` in Airtable sind Webflow-Hilfskonstrukte
  und können ignoriert werden – im neuen Stack nicht verwenden.
