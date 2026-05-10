# CLAUDE.md – Projektkontext für Claude Code

## Projektkontext

Die projektspezifischen Details stehen in `projekt.md` im selben Verzeichnis.
Das Datenmodell und die Migrationslogik stehen in `migration-notes.md`.
Das konkrete Frontend-Datenmodell und Mapping stehen in `content-model.md`.
Die gestalterische Referenz steht in `design-reference.md`.

Bitte vor jeder Aufgabe insbesondere diese Punkte aus `projekt.md` berücksichtigen:

- Projektziel und aktuelle Ausgangslage
- Zielgruppe und gewünschte Wirkung
- Inhaltliche Schwerpunkte und Conversion-Ziele
- SEO-/Sichtbarkeitsprioritäten
- Designhinweise und gestalterische No-Gos
- Wording / Tonalität
- Projektspezifische Regeln und besondere Hinweise

---

## Projekt

proudleut.com ist ein kuratiertes Liveband-Verzeichnis mit direktem Anfrageweg zur Band
für den deutschsprachigen (DACH) Markt. Die Seite richtet sich primär an Veranstalter, die
eine passende Liveband für ihr Event suchen – nicht an die breite Masse, sondern an Menschen,
die Qualität schätzen und einen verlässlichen Kurator wollen.

proudleut ist keine klassische Booking-Plattform mit Provision, Postfach-Routing oder
Account-System. Die Plattform schafft Orientierung, Vertrauen und Sichtbarkeit. Der Kontakt
zur Band bleibt direkt.

---

## Ziele

- Funktional, klar und hochwertig – kein unnötiger Overhead
- Bestehende Daten, Strukturen und Automationen sinnvoll weiterentwickeln
- Airtable, Make und Gmail bleiben unberührt und funktionsfähig
- Änderungen sollen nachvollziehbar, wartbar und für einen Nicht-Entwickler pflegbar bleiben
- Nicht nur technisch korrekt, sondern auch auf Klarheit, Nutzerführung und inhaltliche
  Eindeutigkeit achten
- SEO und Performance ernst nehmen, aber nicht auf Kosten der Nutzerführung

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS v4
- Sanity CMS (für redaktionellen Content: Kategorien, Blog, FAQ, Homepage, Testimonials)
- Airtable (für Banddaten – **nur lesend, niemals schreibend**)
- Vercel (Hosting + ISR)
- Make (E-Mail-Automation via Webhook – nicht anfassen)
- GitHub: Aldr-boy/[Repository eintragen]

---

## Datenquellen – kritische Regeln

### Airtable ist read-only

- Banddaten werden per Airtable REST API abgerufen – niemals per Write-Operationen verändert
- Kein direktes Schreiben, kein Löschen, kein Update über die Website
- Die Make-Automation (Webhook → Airtable → Gmail) ist ein eigenständiges System und wird
  durch den Frontend-Code nicht verändert
- Airtable bleibt Single Source of Truth für Bandprofile

### Sanity ist das CMS für redaktionelle Inhalte

- Homepage-Content, Kategorien (`eventCategory`), Blog, FAQ, Testimonials, statische Seiten
- Nicht für Banddaten verwenden
- Kategorien in Sanity enthalten Mapping-Felder zu Airtable, z. B. `airtableEventTypes`

### Beide Quellen sind unabhängig

Seiten können aus einer oder beiden Quellen rendern – das ist gewollt und kein Fehler.

---

## Airtable-Normalisierung

Rohdaten aus Airtable dürfen nicht direkt in UI-Komponenten verwendet werden.

**Immer zuerst:**

```txt
Raw Airtable Record → normalizeBand() → Band Type → UI-Komponente
```

Empfohlene Struktur:

```txt
lib/airtable/client.ts
lib/airtable/queries.ts
lib/airtable/normalizeBand.ts
lib/types/band.ts
```

**Regeln:**

- Keine rohen Airtable-Feldnamen wie `Short Descripton /...` direkt in Components verwenden
- Keine UI-Logik auf historische Airtable-Feldnamen stützen
- Optionalität und Fallbacks in der Normalisierung lösen
- UI-Komponenten sollen mit stabilen Feldnamen arbeiten: `name`, `slug`, `shortDescription`,
  `heroImage`, `eventTypes`, `location`, etc.
- Details stehen in `content-model.md`

---

## Bildstrategie / Airtable Attachments

Airtable-Attachment-URLs sind nicht als dauerhaft stabile öffentliche Bildquelle zu behandeln.

**Wenn eine Aufgabe Bilder betrifft:**

- Vor Implementierung `migration-notes.md` → „Bildstrategie / Airtable Attachments" lesen
- Keine Annahme treffen, dass Airtable-Bild-URLs dauerhaft CDN-tauglich sind
- Bilder immer über normalisierte `ImageAsset`-Objekte führen
- Fallbacks für fehlende Bilder und Alt-Texte einplanen
- Keine finale Bildarchitektur ohne ausdrückliche Entscheidung einführen

**Für frühe technische Durchstiche:**

Temporäre Airtable-Bild-URLs dürfen zum Prüfen des Datenflusses verwendet werden, aber nicht
unreflektiert als finale Produktionslösung.

---

## Design-Prinzipien

- Das Design soll warm, kuratiert und vertrauenswürdig wirken – kein kaltes Tech-Produkt
- Keine generische KI-Ästhetik
- Keine SaaS-/Startup-Optik
- Keine unnötigen Effekte oder dekorativen Spielereien
- Gute Lesbarkeit und klare visuelle Hierarchie
- Desktop und Mobile immer mitdenken
- Bestehende Gestaltung (Farbwelt, Lila, Bandkarten-Logik) respektieren und gezielt
  weiterentwickeln – nicht grundlos neu erfinden
- Design darf semantische Klarheit und inhaltliche Verständlichkeit nie überdecken

---

## Motion / Microinteractions

- Microinteractions nur einsetzen, wenn sie Nutzerführung, Orientierung oder wahrgenommene
  Wertigkeit verbessern
- Keine Animationen rein zur Dekoration
- Bewegung soll ruhig, stimmig und hochwertig wirken
- `prefers-reduced-motion` respektieren

---

## Code-Prinzipien

- Nur minimalinvasiv arbeiten
- Nur das ändern, was für die Aufgabe wirklich nötig ist
- Keine unnötigen Refactorings
- Keine neuen Dependencies installieren, außer ausdrücklich verlangt
- Bestehende Struktur möglichst beibehalten
- TypeScript sauber halten
- Keine ungenutzten Imports, Variablen oder kaputten Klassen hinterlassen
- Fehler nicht verdecken, sondern sauber typisieren oder klar begründen

---

## SEO / Discoverability / Structured Data

- SEO hat bei proudleut hohe Priorität – die Seite lebt von organischer Sichtbarkeit
- Jede Seite soll eine klare Hauptintention haben (Kategorie, Band, Region, Anlass)
- Wichtige Kontexte explizit benennen: Anlass, Region, Bandart, Nutzen
- JSON-LD / Schema.org sinnvoll einsetzen:
  - Bandprofile: `MusicGroup` mit `sameAs` zu externen Profilen und proudleut.com-URL
  - Kategorie-Seiten: `CollectionPage` und/oder `ItemList`
  - Homepage: `WebSite` + `Organization`, optional `Person`
- `sameAs`-Verlinkungen zwischen proudleut-Profilen und Bandwebsites sind gewollt –
  das ist Teil einer bewussten semantischen SEO-Strategie
- Internes Verlinkungsnetz bewusst aufbauen: Bandprofile verlinken zu ähnlichen Bands,
  Regionsseiten, Bandtyp-Seiten und Kategorien. Kategorieseiten verlinken zu Bands und
  verwandten Kategorien. Regionsseiten verlinken zu Bands und Nachbar-Regionen. Das ist
  die klickbare Navigation zum Schema.org-Datennetz. Beim Anlegen neuer Seitentypen
  immer mitdenken: Welche internen Links gehören auf diese Seite, und welche Seiten
  sollten hierher zurückverlinken?
- Referenz-Events auf Bandprofilen können optional als `MusicEvent` in JSON-LD
  eingebettet werden – Details in `migration-notes.md`. Dabei keinen direkten
  SEO- oder Knowledge-Graph-Effekt behaupten; Structured Data unterstützt nur die
  semantische Klarheit.
- Social-Media-Zahlen auf Bandprofilen sind Vertrauensanker, keine Rankings. Nicht
  als Vergleich zwischen Bands darstellen und nicht prominent wie Bewertungsmetriken inszenieren.
- Booking.com nur als Architektur-Referenz nutzen: interne Verlinkung, programmatische
  Seitenlogik und semantische Struktur ja; Dark Patterns, FOMO, Verknappung,
  Bewertungsdruck oder Buchungsportal-Logik nein.
- Keine künstlich aufgeblähten SEO-Texte
- Structured Data minimal, sauber und wartbar halten
- Am Ende einer SEO-Aufgabe kurz dokumentieren: welche Datei, welcher Schema-Typ, welche Felder

---

## SEO-Migration / Redirects

Wenn eine Aufgabe URL-Struktur, Routing, Sitemap oder Deployment betrifft:

- Bestehende Webflow-URLs nicht ignorieren
- Vor finalen URL-Entscheidungen `migration-notes.md` → „SEO-Migration / Redirect-Strategie" prüfen
- Keine bestehenden URL-Signale ohne bewusste Entscheidung verlieren
- 301-Redirects nicht nebenbei oder geraten einbauen
- Canonicals und Sitemap konsistent halten

---

## Arbeitsweise

- Zuerst kurz erklären, was geprüft/geändert werden soll (Analyze-Phase)
- Relevante Dateien lesen und konkrete Pfade nennen
- Bei echten Unklarheiten erst kurz nachfragen, bevor etwas umgesetzt wird
- Erst nach expliziter Freigabe implementieren (kein Auto-Start)
- Dann die kleinste sinnvolle Lösung umsetzen
- Nur die Dateien anfassen, die für die Aufgabe wirklich relevant sind
- Keine Änderungen außerhalb des Auftrags
- Nach der Aufgabe kurz zusammenfassen: was wurde geändert und warum (Completion Report)

---

## Was vermieden werden soll

- Unnötige Umstrukturierungen
- Änderungen an nicht genannten Dateien
- Unbeauftragte Designwechsel
- Ungefragte inhaltliche Neuinterpretationen
- Zu komplexe Lösungen, wenn eine einfache reicht
- Maßnahmen, die nur für Suchmaschinen gut wirken, aber für Nutzer schlechter sind
- Schreibzugriffe auf Airtable
- Veränderungen am Make-Szenario oder der Webhook-Logik
- Direkte Verwendung roher Airtable-Feldnamen in UI-Komponenten
- Finaler Einsatz von Airtable-Attachment-URLs ohne geprüfte Bildstrategie
- Begriffe oder UI-Muster, die proudleut wie eine anonyme Provisionsplattform wirken lassen

---

## Projektspezifische Ergänzungen

- Airtable-Daten werden per ISR (Incremental Static Regeneration) gecacht – Revalidierung
  alle 5–10 Minuten, oder später optional per On-Demand-Revalidierung
- Die `similar_1/2/3`-Felder in Airtable sind Textfelder (kein Linked Record) – Matching
  erfolgt über Bandname-Vergleich mit Fallback auf Tag-Matching
- Filter auf Kategorie-Seiten laufen client-seitig in React (kein Suchserver nötig)
- Neue Veranstaltungskategorien werden über Sanity angelegt – kein Code nötig
- Sanity-Kategorien brauchen ein explizites Mapping zu Airtable-Eventtypen
- Das Kontaktformular triggert per `fetch` den bestehenden Make-Webhook – Logik in Make
  bleibt unverändert
- Der Start erfolgt über einen technischen Durchstich: erst Datenfluss, Typen, Bilder und Vercel,
  dann vollständige Seiten und Designsystem
