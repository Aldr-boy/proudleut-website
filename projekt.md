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

proudleut.com ist ein Liveband-Verzeichnis mit direktem Anfrageweg zur Band für den
deutschsprachigen (DACH) Markt. Die Seite hilft Veranstaltern dabei, die richtige Liveband
für ihr Event zu finden – nicht über einen Algorithmus, nicht über ein anonymes
Buchungssystem, sondern über klare Profilseiten, sinnvolle Filter und den persönlichen
Matchmaker-Ansatz von Xandi (Alexander Dressler).

Xandi kennt die Szene. Er weiß, welche Bands für welche Anlässe passen – aus Erfahrung als
Booking-Manager, nicht als Musikkritiker. proudleut ist kein Türsteher, der 80% aussortiert.
Es ist eine Orientierungshilfe mit Überblick: viele Bands, aber mit dem Gefühl, dass man
hier schnell das Richtige findet.

proudleut ist keine klassische Booking-Plattform mit Provision, Postfach-Routing oder
Account-Logik. Die Plattform schafft Orientierung, Vertrauen und Sichtbarkeit.
Der Kontakt zur Band bleibt direkt.

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

proudleut positioniert sich bewusst als Gegenentwurf zu großen, anonymen
Eventplattformen (wie eventpeppers). Nicht weil es weniger Bands hat, sondern weil es
sich anders anfühlt: persönlicher, übersichtlicher, hilfreicher. Ein Ort, an dem man sich
gut aufgehoben fühlt – nicht erschlagen von Masse.

---

## Projektziele

- Veranstaltern die schnelle, sichere Bandauswahl ermöglichen
- Bands eine hochwertige Visitenkarte und Sichtbarkeit geben
- Xandi als erfahrenen Matchmaker mit Szeneüberblick positionieren
- Organische Sichtbarkeit über SEO, strukturierte Daten und lokale Suchanfragen aufbauen
- Programmatische Kategorieseiten für organische Sichtbarkeit aufbauen:
  bewusst generierte Landing Pages pro sinnvolle Kombination aus Region, Bandtyp und Anlass
  (z. B. „Hochzeitsband München", „Jazzband Bayern", „Partyband Oberpfalz") –
  jede mit gefiltertem Bandergebnis, regionalem Kontext und Schema.org-Markup.
  Inspiration: Trivagos Stadt-Landingpages. Für proudleut bedeutet das: passende
  Suchintentionen bekommen eigene, indexierbare Seiten – aber nur, wenn es dazu echte
  Band-Ergebnisse und hilfreichen Kontext gibt. Kein Thin Content, keine Doorway Pages.
- Die Plattform für zukünftige Erweiterungen (neue Kategorien, neue Regionen) vorbereiten
- Den bestehenden Workflow mit Airtable und Make erhalten, aber technisch sauberer anbinden

---

## Zielgruppe

**Primär – Veranstalter:**

- Privatpersonen, die eine Hochzeitsband suchen
- Firmen, die eine Band für Firmenfeier oder Business Event buchen wollen
- Gemeinden, Vereine, Stadtfeste (Festzelt, Kirchweih, Bürgerfest)
- Gastronomie und Eventlocations (Gala, Biergarten)
- Mentalität: Sie wollen nicht durch hunderte unbekannte Bands scrollen. Sie wollen jemanden,
  der den Markt kennt und ihnen hilft, schnell das Passende zu finden.

**Sekundär – Bands:**

- Livebands im DACH-Raum, die Sichtbarkeit und einen direkten Anfrageweg wollen
- Bands, die von Xandis Erfahrung als Booking-Manager profitieren
- Sie sehen proudleut als Ergänzung zu ihrer eigenen Website, nicht als Ersatz

---

## Wirkung / Positionierung

Die Seite soll:

- **Warm, übersichtlich und vertrauenswürdig** wirken
- Das Gefühl geben: *„Hier kenne ich mich aus – hier werde ich fündig"*
- Viele Bands zeigen, ohne dass es sich nach Masse anfühlt
- Xandis Erfahrung und Szenekenntnis sichtbar machen – ohne Selbstdarstellung
- Professionell, aber nicht corporate – nahbar, aber nicht amateurhaft
- Nach Plattform aussehen, aber nach persönlicher Begleitung anfühlen

Sie soll auf keinen Fall:

- Generisch oder austauschbar wirken
- Wie ein KI-generiertes Template aussehen
- Kalt, technisch oder seelenlos sein
- Wie eine anonyme Massenplattform wirken (kein eventpeppers-Feeling)
- Wie ein Buchungsportal wirken (kein Trivago-/Eventpeppers-Transaktions-Feeling –
  proudleut gibt Orientierung und Empfehlung, kein Warenkorb)
- Den Eindruck erwecken, dass proudleut eine Provisions- oder Buchungsplattform ist
- Wie ein elitärer Türsteher wirken, der Bands nach Geschmack aussortiert
- Überladen oder unübersichtlich sein

**Der interne Leitspruch:**

„Außen Plattform. Innen Überblick."

---

## Positionierung: Was Xandi wirklich ist

Xandi ist kein Musikkritiker und kein Qualitätsprüfer.
Er ist jemand, der die Szene kennt – als Booking-Manager, der täglich mit Bands und
Veranstaltern arbeitet.

Das ist die ehrliche Stärke von proudleut:

- **Nicht:** „Ich hab alles persönlich geprüft und nur das Beste ausgewählt"
- **Sondern:** „Ich kenne den Markt, ich hab den Überblick, und ich helfe dir zu finden,
  was zu dir passt"

Das erlaubt **viele Bands** – mit dem Gefühl: hier bin ich gut aufgehoben.

Dieser Unterschied muss sich in allen Texten, CTAs und im „Über mich"-Block widerspiegeln.

---

## Strategische Referenzen

proudleut lässt sich von verschiedenen Plattformen inspirieren – aber immer selektiv:

| Referenz | Was wir übernehmen | Was wir bewusst nicht übernehmen |
|---|---|---|
| Netflix | Dunkles UI, Thumbnails die leuchten, Browsing-Lust | Algorithmus, Personalisierung, Autoplay |
| Airbnb | Eine Karte = eine Entscheidung, leichte Filter-UX | Buchungsflow, Bewertungen, Preislogik |
| GetYourGuide | Starke Hero-Momente, klarer nächster Schritt | Bewertungssterne, Preisfilter, Warenkorb |
| Trivago | Programmatische SEO-Seiten, Facetten-Filter mit URL-State, performante Bildauslieferung | Preisvergleich, Echtzeit-Verfügbarkeit, Account/Favoriten |
| Booking.com | Internes Verlinkungsnetz als System, Schema Markup auf jeder Seite, programmatische Seiten pro Region/Kategorie (bestätigt Trivago-Ansatz), Social Media Index als objektiver Vertrauensanker | Urgency/Scarcity-Taktiken (FOMO-Counter, „Nur noch 2 verfügbar"), Bewertungssystem, Account-System, Dark Patterns |

**Gemeinsamer Nenner:** Alle fünf schaffen es, große Mengen an Content so aufzubereiten,
dass der Nutzer sich nicht verloren fühlt, sondern geführt wird. Booking.com zeigt
zusätzlich, wie programmatische Seiten, Schema Markup und internes Verlinkungsnetz
als *System* zusammenwirken – nicht als Einzelmaßnahmen. Das ist der Kern,
den proudleut übernimmt – nicht die Features, sondern das Gefühl und die Architektur.

---

## Produktbegriff – Sprachregelung

**Im Frontend vermeiden:**
- „kuratiert" / „kuratiertes Verzeichnis" → klingt nach Türsteher-Mentalität
- „Booking-Plattform" → suggeriert Provision und Postfach-Routing
- „Wir empfehlen nur die Besten" → nicht belegbar, nicht ehrlich

**Stattdessen verwenden:**
- „Ich kenne die Szene" / „Xandi kennt den Markt"
- „Orientierung für Veranstalter"
- „Der direkte Weg zur richtigen Band"
- „Liveband-Verzeichnis mit persönlichem Matchmaker-Ansatz"
- „Hier findest du, was zu deinem Event passt"
- „Viele Bands. Gute Orientierung. Direkter Kontakt."

**Intern (in Docs) darf „kuratiert" als Shorthand verwendet werden** –
im Frontend-Code, in Headlines, CTAs und Fließtexten aber vermeiden.

---

## Inhaltliche Schwerpunkte

**Wichtige Seiten:**

1. Kategorie-Seiten (Festzelt, Gala, Hochzeit, Firmenfeier & Business Event) –
   Haupteinstieg für Veranstalter per Google-Suche
2. Bandprofil – Visitenkarte der Band, Conversion-Seite für Direktkontakt
3. Homepage – Überblick, Orientierung, Einstieg in die Kategorien
4. Über mich / Xandi – Matchmaker-Identität, Szenekenntnis, Vertrauen
5. Blog / Ratgeber – SEO, Kontext und Entscheidungshilfe

**Wichtige Funktionen:**

- Filterbare Bandliste pro Kategorie (Musikrichtung × Bandgröße × Region)
- Bandprofil mit direktem Kontaktweg zur Band (kein Mittelsmann)
- „Ähnliche Bands"-Empfehlung auf jedem Profil
- Blog / Content für SEO und Wissensaufbau
- Internes Verlinkungsnetz als System – nicht nur „saubere Links", sondern ein
  bewusstes Netz: Jedes Bandprofil verlinkt zu ähnlichen Bands, zur Regionsseite,
  zum Bandtyp und zur passenden Veranstaltungskategorie. Jede Kategorieseite verlinkt
  zu den Bands und zu verwandten Kategorien. Jede Regionsseite verlinkt zu Bands vor
  Ort und zu Nachbar-Regionen. Das ist das klickbare Gegenstück zum Schema.org-Netz –
  es stärkt sowohl die interne Verlinkung (SEO) als auch die Nutzerführung (UX).
  Inspiration: Booking.com baut am Ende jeder Seite eine Verlinkungssektion zu
  Kategorien, Landmarks und nahegelegenen Orten.
- Social Media Index auf Bandprofilen: Follower-Zahlen (Instagram, Facebook, YouTube)
  als objektiver Aktivitäts-Indikator – keine Bewertung, kein Ranking, aber ein
  Vertrauensanker für Veranstalter, die sehen wollen, ob eine Band aktiv und greifbar ist
- Referenz-Events auf Bandprofilen: verifizierbare Auftrittsorte und Events
  (z. B. „Gillamoos Abensberg", „Dult Regensburg") als Glaubwürdigkeitsanker –
  keine Bewertungen, keine Sterne, aber echte Nachweise. Am Boden bleiben,
  aber zeigen was man kann.

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
- „Muss ich über proudleut buchen oder kann ich direkt anfragen?"

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
- Positionierung: ehrlicher, persönlicher, weniger nach „Plattform"

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
- GitHub: Aldr-boy/proudleut-website

---

## URL-Struktur

```txt
/                          → Homepage
/veranstaltung/[slug]      → Kategorie-Seite (dynamisch aus Sanity)
/band/[slug]               → Bandprofil (Daten aus Airtable)
/bands                     → Bandübersicht mit Filter-UI (Query-Params für URL-State)
/bandtyp/[slug]            → Programmatische Seite pro Bandart (Phase 2+)
/region/[slug]             → Programmatische Seite pro Region (Phase 2+)
/[kombination]             → Kombinierte Landing Pages, z. B. /hochzeitsband-muenchen (Phase 3+, nur freigegeben)
/blog/[slug]               → Blogpost (Sanity)
/ueber-mich                → Über Xandi (Sanity)
/kontakt                   → Kontaktseite (Sanity + Make-Webhook)
/fuer-bands                → Für Bands (Sanity)
```

Vor dem Domainumzug muss geprüft werden, welche bestehenden Webflow-URLs erhalten bleiben
oder per 301-Redirect umgeleitet werden. Details → `migration-notes.md`.

Root-Level-Kombinationen wie `/hochzeitsband-muenchen` sind ein SEO-Hebel, aber kein
Freifahrtschein für beliebige Slugs. Sie dürfen nur bewusst freigegeben werden und müssen
reservierte Pfade wie `/kontakt`, `/blog`, `/bands`, `/band`, `/region`, `/bandtyp` und
`/veranstaltung` schützen.

---

## SEO / Sichtbarkeit

- SEO ist für proudleut **hoch priorisiert** – organische Suche ist der Hauptkanal
- Local SEO ist wichtig: Bandsuche nach Region, PLZ, Landkreis, Regierungsbezirk
- Thematische Eindeutigkeit pro Seite ist kritisch (Kategorie, Anlass, Region, Bandart)
- Wichtige Seiten für Sichtbarkeit:
  - `/veranstaltung/festzelt` – Hochvolumen-Suchbegriffe
  - `/veranstaltung/hochzeit` – hoher Wettbewerb, hohe Kaufintention
  - `/band/[slug]` – Long-Tail pro Bandname + Ort + Stil
  - `/bandtyp/[slug]` und `/region/[slug]` – programmatische SEO-Seiten (Phase 2+),
    inspiriert von Trivagos Stadt-Landingpages. Query-Parameter-Filter sind für UX
    und teilbare Ansichten wichtig; die eigentlichen SEO-Einstiegsseiten entstehen
    über bewusst generierte Routen. Nur Seiten erzeugen, zu denen es echte Bands gibt –
    keine leeren Kategorieseiten (Thin Content).
  - `/blog/` – Wissensaufbau, Cluster-Strategie
- Structured Data: `MusicGroup`, `ItemList`, `CollectionPage`, `WebSite`, `Organization`, `Person`
- `sameAs`-Verlinkung zwischen Bandprofilen und externen Band-Websites ist gewollt
- Keine künstlich aufgeblähten SEO-Texte; Nutzerklarheit geht vor Keyword-Füllung

---

## Design-Hinweise

→ Ausführlich in `design-reference.md`

Kurz:

- Warm, übersichtlich, vertrauenswürdig
- Viele Bands – aber mit dem Gefühl, gut aufgehoben zu sein
- Keine generische Plattform-Optik
- Lila bleibt als Markenfarbe, aber bewusster eingesetzt
- Bandkarten-Grid bleibt das Herzstück der Kategorie-Seiten
- Xandis Persönlichkeit und Szenekenntnis dürfen sichtbar sein
- Bandfotos tragen die emotionale Wirkung der Seite

---

## Wording / Tonalität

Texte sollen:

- Klar, glaubwürdig und nahbar klingen
- Szenekenntnis und Erfahrung zeigen – ohne Selbstbeweihräucherung
- Zur Zielgruppe passen: Veranstalter, die schnell eine gute Entscheidung treffen wollen
- Den direkten Kontakt zur Band verständlich machen
- proudleut als Orientierungshilfe erklären, nicht als Qualitätsfilter

Vermeiden:

- „Nur die Besten" / „handverlesen" / „exklusiv ausgewählt" → nicht belegbar
- „kuratiert" im Frontend → klingt nach Türsteher
- Generische Marketingfloskeln („Ihre perfekte Band für jeden Anlass")
- Austauschbare KI-Formulierungen
- Begriffe, die proudleut wie eine Provisions-/Buchungsplattform wirken lassen

---

## Conversion / Nutzerführung

- **Primäres Ziel:** Veranstalter findet passende Band und nimmt direkt Kontakt auf
- **Wichtigste Hürden abbauen:**
  - „Passt die Band zu meinem Event?" → Kategorie-Filter, Bandprofil-Details
  - „Kann ich der Plattform vertrauen?" → Xandis Erfahrung und Szenekenntnis sichtbar machen
  - „Wie funktioniert das?" → Klarer Prozess auf Homepage und Kategorie-Seiten
  - „Muss ich über proudleut buchen?" → Nein, direkter Kontakt; proudleut gibt Orientierung
- Kein Postfach-Routing, keine Provision – das ist ein USP und muss kommuniziert werden

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
- „kuratiert" im Frontend-Code, in Texten und CTAs **nicht verwenden** – intern als Shorthand okay

---

## Startstrategie / MVP

**Phase 1A – Technischer Durchstich:**
- Next.js-Projekt steht
- Airtable-Verbindung funktioniert read-only
- Eine echte Band wird über `/band/[slug]` geladen und normalisiert
- Bildstrategie ist geklärt oder bewusst temporär gelöst
- Vercel-Build läuft

**Phase 1B – Grundsystem:**
- Sanity-Grundschemas, Layout, Navigation, Footer
- Erste Kategorie-Seite + Bandkarten-Logik

**Phase 2 – Kernseiten:**
- Bandprofil-Seiten, Kategorie-Seiten mit Filterlogik, Homepage

**Phase 3 – Inhalte & SEO:**
- Sanity-Inhalte befüllen, Structured Data, Sitemap, Redirects

**Phase 4 – Ablösung Webflow:**
- Staging → Domainumzug → Webflow + Whalesync kündigen

---

## Besondere Hinweise

- Die Ähnliche-Bands-Felder (`similar_1/2/3`) sind Textfelder (kein Linked Record).
  Matching über Bandname-Vergleich; Fallback auf Tag-Matching wenn leer.
- Die Geo-Hierarchie (PLZ → Ort → Landkreis → Regierungsbezirk → Bundesland) ist für
  regionale Filter und Local SEO sehr wertvoll.
- Xandi betreibt proudleut als Kleinunternehmer (§19 UStG) – keine Umsatzsteuer-Ausweisung
  in automatisierten E-Mails oder Rechnungen.
- `search_tokens_all`, `filter_tags_regio`, `event_keys` in Airtable sind Webflow-Hilfskonstrukte
  – im neuen Stack ignorieren.
