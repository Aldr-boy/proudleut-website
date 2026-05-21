# Übergabe an Claude: Proudleut Anfragesystem / Merkliste / Sammelanfrage

## Kontext

Wir bauen für den Next.js-Neubau von proudleut.com ein neues Anfragesystem.

Grundlage ist das Architekturkonzept:

- Next.js-Frontend mit Anfrage-Modal
- Session-State für gemerkte Bands
- API Route zu Make
- Make versendet pro Band eine individuelle E-Mail
- Make schreibt Airtable-Records
- bestehende Make/Airtable-Logik soll möglichst erhalten und erweitert werden

Phase 1 baut zunächst nur ein Einzelanfrage-Modal auf der Banddetailseite. Die Datenstruktur soll aber bereits so vorbereitet werden, dass spätere Sammelanfragen möglich sind.

---

## Strategisches Ziel

Proudleut soll nicht nur Traffic liefern, sondern für Bands auch als Quelle echter Anfragen sichtbar werden.

Bisher gehen Veranstalter oft direkt über Band-Websites oder kopieren Anfragen manuell an mehrere Bands. Dadurch sieht die Band nicht, dass proudleut die Anfrage vorbereitet oder ausgelöst hat.

Das neue System soll den Kontaktweg über proudleut stärken, ohne sich wie ein harter Marktplatz oder eine Booking-Plattform anzufühlen.

Wichtiges Selbstverständnis:

> Proudleut vermittelt nicht besitzergreifend, sondern hilft beim sauberen Kontakt.

Nicht:

> „Buche über proudleut“

Sondern:

> „Band über proudleut anfragen“  
> „Anfrage über proudleut senden“  
> „Auswahl anfragen“

---

## Grundprinzip

Ein Veranstalter kann eine oder mehrere Bands merken und anschließend in einem Formular anfragen.

Sprache nach außen:

- merken
- gemerkte Bands
- Auswahl anfragen
- Bandanfrage
- Anfrage an ausgewählte Bands senden

Nicht verwenden:

- Warenkorb
- Checkout
- Bestellung
- hinzufügen zum Korb
- kaufen
- buchen

Intern darf der Begriff „Anfragekorb“ vorkommen, nach außen nicht.

---

## Warum Sammelanfrage sinnvoll ist

Sammelanfragen passieren ohnehin schon. In bestehenden Airtable-Anfragen sieht man, dass Veranstalter häufig dieselbe Anfrage mit gleichem Datum, Ort und ähnlichem Text an mehrere Bands senden.

Das neue System erzeugt also kein künstliches Verhalten, sondern macht einen bestehenden Copy-Paste-Prozess besser:

- weniger Aufwand für Veranstalter
- strukturiertere Anfrage für Bands
- bessere Sichtbarkeit von proudleut
- bessere Auswertung über Airtable
- gemeinsame `anfrage_id` für zusammengehörige Anfragen

Die Sammelanfrage darf aber nicht nach Massenmail wirken. Ziel ist eine **geführte, saubere und persönliche Anfrage**.

---

# EXTREM WICHTIG: Keine Massenanfrage-Wirkung für Bands

Auch wenn ein Veranstalter mehrere Bands auswählt, darf die Anfrage für die einzelne Band niemals wie eine Massenanfrage wirken.

## Sammelanfrage bedeutet nur:

- im Frontend: Der Veranstalter kann mehrere Bands gesammelt auswählen
- intern: proudleut/Make/Airtable gruppiert diese Anfrage über eine gemeinsame `anfrage_id`

## Für die Band muss es sich aber wie eine individuelle, respektvolle Einzelanfrage anfühlen.

Deshalb:

- Make muss pro Band eine eigene E-Mail erzeugen.
- Keine Band-Mail darf die anderen angefragten Bands nennen.
- Keine Formulierung wie „Du bist eine von 5 angefragten Bands“.
- Keine Sammelmail.
- Kein CC/BCC.
- Keine sichtbare Empfängerliste.
- Der Betreff soll bandbezogen sein, z. B.:  
  `Donnaweda – Anfrage für Hochzeit am 09.03.2026`
- Der Mailtext soll sich direkt auf diese Band beziehen, z. B.:  
  `Über proudleut ist eine Anfrage für euch eingegangen.`
- Die gemeinsame `anfrage_id` darf nur intern in Airtable/Make genutzt werden.
- Nur der Veranstalter bekommt in seiner Kopie/Bestätigung eine Liste aller angefragten Bands.

Wichtig:

> Wir sollen nicht behaupten, dass die Anfrage exklusiv nur an diese eine Band ging.  
> Aber wir erwähnen in der Band-Mail auch nicht unnötig, dass weitere Bands angefragt wurden.

Ziel:

> Die Band soll sich ernsthaft und persönlich angefragt fühlen – nicht wie Teil eines automatisierten Lead-Verteilers.

Beispiel für eine gute Band-Mail:

```text
Servus Donnaweda,

über proudleut ist eine Anfrage für euch eingegangen.

Anlass: Hochzeit
Datum: 09.03.2026
Ort: 95445 Bayreuth
Gäste: ca. 100

Nachricht:
„Hallo Donnaweda, wir sind gerade auf der Suche nach einer Band für unsere Hochzeit ...“

Kontakt:
Anna Müller
anna@example.de
Telefon: optional
```

Nicht schreiben:

```text
Diese Anfrage wurde über proudleut an mehrere passende Bands gesendet.
```

Nicht schreiben:

```text
Der Veranstalter hat euch zusammen mit 5 weiteren Bands ausgewählt.
```

Der saubere Mittelweg:

> Nicht lügen. Aber auch nicht unnötig nach Massenanfrage klingen.

---

## Wichtige UX-Entscheidungen

## 1. Anfrage über proudleut prominent machen

Auf der Banddetailseite darf der bisher prominente „Zur Band-Website“-CTA im Anfragebereich durch das proudleut-Anfrageformular ersetzt bzw. untergeordnet werden.

Begründung: Proudleut muss als Anfragequelle sichtbar werden.

Aber: Die Band bleibt eigenständig. Website, Social Links und direkte Kontaktdaten dürfen weiterhin auf der Seite sichtbar sein, nur nicht als primärer CTA im Anfrageblock.

Empfohlene CTA-Hierarchie:

```text
Interesse an dieser Band?

[Band über proudleut anfragen]   [merken]

Oder direkt zur Website der Band
```

Alternative:

```text
[Anfrage senden]   [Band merken]
```

Kleine Zusatzzeile:

```text
Deine Anfrage wird über proudleut an die Band weitergeleitet.
```

---

## 2. Merkliste statt Warenkorb

Wenn eine Band gemerkt wird, erscheint eine Sticky Bar.

Beispiel:

```text
3 Bands gemerkt: Donnaweda, LPC, Sappralot     [Auswahl anfragen]
```

Bei mehr als 3 Bands:

```text
3 Bands gemerkt: Donnaweda, LPC, Sappralot +2 weitere     [Auswahl anfragen]
```

Die Sticky Bar soll dezent sein, nicht E-Commerce-mäßig. Proudleut-Stil: dunkler Hintergrund, Warm-Purple-Akzent, ruhig, hochwertig.

---

## 3. Einzelanfrage und Sammelanfrage sind dasselbe Modal

Eine Einzelanfrage ist nur der Spezialfall mit einer ausgewählten Band.

Das Modal muss also mit 1 Band und mehreren Bands funktionieren.

Button-Wording abhängig von Anzahl:

```text
Anfrage an Donnaweda senden
```

oder:

```text
Anfrage an 3 Bands senden
```

---

# Formularfelder

Empfohlene Sortierung:

## Block 1 — Ausgewählte Band(s)

- Band-Chip(s) mit Name
- In Phase 1 immer genau 1 Band
- Die Komponente soll aber bereits aus einem Array rendern, damit Phase 2 vorbereitet ist

---

## Block 2 — Dein Event

- Veranstaltungstyp
- Datum
- PLZ & Ort
- Veranstaltungsort optional
- Gästezahl ca.
- gewünschte Spielzeit optional

### Veranstaltungstyp

Dropdown, befüllt aus den Veranstaltungstypen der Band.

Letzte Option immer:

```text
Sonstiges
```

Wenn „Sonstiges“ gewählt wird, öffnet sich ein Freitextfeld darunter.

Grund: Regionale Begriffe wie Kirchweih/Kirmes/Kirta/Kärwa werden nicht immer gleich benannt.

### Gästezahl

Gästezahl soll im neuen System ein echtes sichtbares Feld sein, nicht nur Honeypot.

Empfohlener Feldname:

```text
gaestezahl
```

oder technisch:

```text
guest_count
```

---

## Block 3 — Nachricht

Label bei Einzelanfrage:

```text
Nachricht an die Band
```

Label bei Sammelanfrage:

```text
Nachricht an die ausgewählten Bands
```

Hilfetext:

```text
Ein paar persönliche Sätze helfen der Band, schneller und passender zu antworten.
```

Alternative für Sammelanfragen:

```text
Je konkreter deine Anfrage ist, desto leichter können die Bands einschätzen, ob sie zu eurem Event passen.
```

Placeholder:

```text
Erzähl kurz, was ihr plant: Anlass, Stimmung, Ablauf, gewünschte Spielzeit – und was euch wichtig ist.
```

Oder:

```text
Zum Beispiel: Wann beginnt die Feier? Welche Stimmung wünscht ihr euch? Gibt es besondere Programmpunkte oder technische Infos?
```

---

## Block 4 — Kontakt

- Vorname
- Nachname optional
- E-Mail
- Telefonnummer optional

Telefon ist sinnvoll, aber nicht Pflicht.

Label:

```text
Telefonnummer (optional)
```

Placeholder:

```text
für kurze Rückfragen
```

Oder wärmer:

```text
falls die Band dich kurz erreichen darf
```

---

## Block 5 — Absenden

Datenschutz-Checkbox:

```text
Ich bin einverstanden, dass proudleut meine Anfrage an die ausgewählten Bands weiterleitet. Die Datenschutzerklärung habe ich gelesen.
```

Diese Formulierung funktioniert auch bei Einzelanfrage, weil „ausgewählte Bands“ auch eine einzelne Band sein kann.

Wichtig:

- Die Datenschutz-Checkbox muss vor dem Absenden aktiv bestätigt sein.
- Ohne Zustimmung bleibt der Submit blockiert oder zeigt eine klare Inline-Fehlermeldung.

Submit-Button bei Einzelanfrage:

```text
Anfrage an Donnaweda senden
```

Submit-Button bei Sammelanfrage:

```text
Anfrage an 3 Bands senden
```

Hinweis unter dem Button:

```text
Deine Anfrage wird an die Band gesendet. Du erhältst eine Kopie per E-Mail.
```

Bei mehreren Bands:

```text
Deine Anfrage wird an jede ausgewählte Band gesendet. Du erhältst eine Kopie per E-Mail.
```

„Kopie“ ist besser als nur „Bestätigung“, weil der Veranstalter versteht, dass er die gesendeten Inhalte nochmal bekommt.

---

# Qualitäts-Nudge gegen lieblose Massenanfragen

Die Sammelanfrage soll nicht begrenzt wirken, aber zu besseren Nachrichten motivieren.

Möglicher Hinweis im Modal:

```text
Kleiner Tipp: Schreib lieber 3 persönliche Sätze als nur „Bitte Angebot schicken“ – dann bekommst du meist die besseren Antworten.
```

Oder ruhiger:

```text
Je konkreter deine Anfrage ist, desto leichter können die Bands schnell einschätzen, ob sie zu eurem Event passen.
```

Ab 5 ausgewählten Bands optional anzeigen:

```text
Du hast 5 Bands ausgewählt. Das passt – achte nur darauf, dass deine Nachricht für alle Bands sinnvoll ist.
```

Technisch kann eine Maximalzahl sinnvoll sein, z. B. 8 Bands pro Anfrage. Das muss nicht hart kommuniziert werden, kann aber Missbrauch verhindern.

---

# Anti-Spam / Honeypot

Spam-Schutz ist kritisch, weil Mails im Namen bzw. über proudleut an Bands gehen. Wenn Bands mehrmals täglich Müll-Anfragen bekommen, schadet das der Reputation von proudleut.

Das aktuelle Webflow-Modal nutzt Honeypots, z. B.:

```text
firma_hidden
gaesteanzahl_hidden
```

Das ist okay, solange diese Felder wirklich unsichtbar sind.

Für das neue Next.js-System besser klarer trennen.

Echte sichtbare Felder:

```text
gaestezahl
telefon
```

Honeypot-Felder:

```text
firma_hidden
website_hidden
```

Oder wenn bestehende Namen weitergenutzt werden:

```text
firma_hidden
gaesteanzahl_hidden
```

Wichtig: `gaestezahl` und `gaesteanzahl_hidden` dürfen nie verwechselt werden.

Empfehlung für neuen Honeypot:

```text
firma_hidden
website_hidden
```

Bots springen oft auf Firma/Website/URL-Felder an.

Honeypot-Felder sollen technisch unsichtbar sein, aber nicht mit `display: none`.

Empfohlene CSS-Logik:

```css
position: absolute;
left: -9999px;
opacity: 0;
pointer-events: none;
```

Zusätzlich:

```text
tabIndex={-1}
```

---

# Spam-Schutz zweistufig

## 1. Next.js API Route prüft vor Make

- Honeypot-Felder müssen leer sein
- Name und E-Mail müssen vorhanden sein
- mindestens 1 Band muss ausgewählt sein
- E-Mail muss plausibel sein
- optional Mindestzeit zwischen Modal-Öffnung und Absenden, z. B. 2–3 Sekunden
- optional Maximalzahl Bands, z. B. 8
- Make Webhook URL nur serverseitig über Environment Variable
- optional Rate Limit pro IP oder E-Mail

Wichtig bei Honeypot-Treffern:

> Bei gefüllten Honeypot-Feldern 200 OK zurückgeben, damit der Bot denkt, die Anfrage sei erfolgreich gewesen.  
> Intern aber nichts an Make senden.

## 2. Make prüft nochmal

Make-Filter direkt nach dem Webhook, vor Airtable und vor Gmail:

```text
payload.name = Bandanfrage_Form
AND firma_hidden is empty
AND website_hidden is empty
```

bzw. bei aktuellem Setup:

```text
payload.name = Bandanfrage_Form
AND firma_hidden is empty
AND gaesteanzahl_hidden is empty
```

Wichtig:

- Der Filter muss vor jeder Mail und vor jedem Airtable-Record sitzen.
- Spam darf nicht bei Bands ankommen.

---

# API Route / Payload

Die API Route soll unter folgendem Pfad entstehen:

```text
/api/anfrage
```

Make Webhook URL:

```text
process.env.MAKE_ANFRAGE_WEBHOOK_URL
```

Wichtig:

- Die Make Webhook URL darf niemals im Frontend exponiert werden.
- Sie wird nur serverseitig in der API Route genutzt.
- Wenn eine `.env.example` existiert, soll `MAKE_ANFRAGE_WEBHOOK_URL` dort als leerer Platzhalter ergänzt werden.
- Keine echten Secrets committen.

Payload-Struktur:

```json
{
  "anfrage_id": "uuid",
  "source": "proudleut-next",
  "bands": [
    { "slug": "donnaweda", "name": "Donnaweda" }
  ],
  "eventtyp": "Hochzeit",
  "eventtyp_custom": "",
  "datum": "09.03.2026",
  "ort": "95445 Bayreuth",
  "veranstaltungsort": "Festscheune Müller",
  "gaestezahl": "100",
  "spielzeit": "18:00–01:00",
  "nachricht": "Hallo Donnaweda, wir sind gerade auf der Suche nach einer Band für unsere Hochzeit ...",
  "vorname": "Anna",
  "nachname": "Müller",
  "email": "anna@example.de",
  "telefon": "",
  "firma_hidden": "",
  "website_hidden": "",
  "timestamp": "2026-05-17T12:00:00.000Z"
}
```

Validierung in der API Route vor Make:

1. Honeypot-Felder müssen leer sein
2. `bands` Array muss mindestens 1 Eintrag haben
3. `vorname` und `email` müssen vorhanden sein
4. E-Mail muss Basis-Validierung bestehen
5. Datenschutz-Checkbox muss bestätigt sein
6. optional: Modal muss mindestens 3 Sekunden offen gewesen sein

---

# Make / Airtable Logik

Make empfängt eine Payload mit mehreren Bands.

Dann:

1. Webhook empfängt Payload
2. Spam/Honeypot-Filter
3. Iterator über `bands[]`
4. Pro Band:
   - individuelle E-Mail an genau diese Band
   - Airtable Record erstellen
5. Danach:
   - Bestätigung/Kopie an Veranstalter mit allen angefragten Bands

Wichtiges Feld:

```text
anfrage_id
```

Das ist eine UUID, die alle Einzelrecords einer Sammelanfrage gruppiert.

Airtable-Erweiterungen:

- `anfrage_id`
- `quelle`, z. B. `webflow-legacy` / `proudleut-next`
- `anzahl_bands`
- echte Gästezahl
- Telefonnummer optional
- Band-Slug
- Bandname
- Eventtyp
- Datum
- Ort / PLZ
- Veranstaltungsort
- Spielzeit
- Nachricht
- Kontaktname
- E-Mail

---

# Empfohlene Phasen

## Phase 1: Einzelanfrage-Modal auf Banddetailseiten

Noch keine Merkliste, keine Sticky Bar.

Ziel:

- neues Modal testen
- API Route zu Make testen
- Spam-Schutz testen
- Airtable-Felder sauber schreiben
- Mail an Band und Kopie an Veranstalter sauber gestalten
- Payload-Struktur aber bereits so vorbereiten, dass später mehrere Bands möglich sind

---

## Phase 2: Merken-Funktion auf Banddetailseiten

- Zustand Store
- Button „Band merken“
- Sticky Bar
- Modal kann mehrere Bands anzeigen

---

## Phase 3: Sammelanfrage aktivieren

- mehrere Bands in einem Modal
- `anfrage_id`
- Make Iterator
- Bestätigungsmail mit Bandliste
- Band-Mails bleiben trotzdem individuell und nennen keine anderen Bands

---

## Phase 4: Merken auf Kategorie-/Übersichtsseiten

Erst später. Nicht direkt am Anfang, weil die Bandcards sonst schnell zu funktional und marktplatzig wirken könnten.

---

# Offene Entscheidungen

Diese Punkte sind für den ersten Prompt weitgehend entschieden:

1. Session-State statt localStorage für die Merkliste
2. Multi-Band-Payload-Struktur ab Phase 1 vorbereiten
3. Gästezahl ab Phase 1 als echtes sichtbares Feld aufnehmen
4. Telefonnummer ab Phase 1 optional aufnehmen
5. Veranstaltungstyp-Dropdown mit „Sonstiges“-Freifeld
6. Event-Felder vor Kontakt-Feldern

Diese Punkte soll Claude im Analysebericht prüfen oder bestätigen:

1. Welche Bandfelder stehen aktuell im Next.js-Projekt schon zur Verfügung?
2. Gibt es bereits ein Modal-System oder Dialog-Komponenten?
3. Gibt es bereits Formular-Komponenten?
4. Gibt es bestehende Env-Konventionen?
5. Welche Airtable-Felder liefern Bandname, Slug, Bild und Veranstaltungstypen?
6. Wie heißt die bestehende Anfrage-Tabelle in Airtable?
7. Welche Make Webhook URL soll als Env Var verwendet werden?
8. Welche Honeypot-Felder sollen final in Make geprüft werden?
9. Gibt es bestehende Design-Komponenten für Buttons, Inputs, Labels, Fehlermeldungen?

---

# Wichtig für den ersten Claude-Code-Prompt

Der erste Claude-Code-Prompt sollte nicht sofort alles bauen.

Er soll Claude Code zuerst lesen und analysieren lassen:

- `CLAUDE.md`
- `projekt.md`
- `docs/content-model.md`
- relevante Airtable-Dateien
- Banddetailseite
- bestehende Komponentenstruktur
- vorhandene Formulare/Modals
- Env-Konventionen
- Make/API-Struktur, falls vorhanden
- `docs/anfragesystem-uebergabe.md`

Dann soll Claude einen Plan machen und auf Freigabe warten.

Ideale erste Aufgabe:

> Phase 1: Ein Next.js-natives Einzelanfrage-Modal auf der Banddetailseite vorbereiten, das intern bereits die spätere Multi-Band-Payload-Struktur nutzt, aber zunächst nur mit einer Band arbeitet.

Constraints:

- keine großen Refactorings
- keine Kategorie-Seiten anfassen
- keine Merkliste/Sticky Bar in Phase 1 bauen
- kein Zustand-Store in Phase 1 einführen, sofern nicht nötig
- Make Webhook URL nur serverseitig
- Honeypot-Felder von Anfang an einplanen
- Datenschutz-Checkbox einplanen und technisch verpflichtend machen
- Telefonnummer optional einplanen
- echte Gästezahl als sichtbares Qualitätsfeld einplanen
- Veranstaltungstyp-Dropdown mit „Sonstiges“-Freifeld
- bestehende Bandseite visuell respektieren
- proudleut-Sprache: ruhig, hochwertig, kein Warenkorb-Gefühl
- Band-Mail darf niemals nach Massenanfrage wirken
- pro Band immer eigene E-Mail
- andere angefragte Bands niemals in der Band-Mail nennen
- gemeinsame `anfrage_id` nur intern nutzen
- erst Analyse und Plan, dann Umsetzung nach Freigabe

---

# Completion Report nach Umsetzung

Nach Abschluss der Umsetzung soll Claude berichten:

- Was wurde gebaut?
- Welche Dateien wurden neu angelegt?
- Welche bestehenden Dateien wurden geändert?
- Welche Env-Variablen müssen gesetzt werden?
- Was muss in Make konfiguriert werden?
- Was muss in Airtable ergänzt werden?
- Was ist bereit für Phase 2?
- Welche offenen Punkte oder bekannten Limitierungen gibt es?

---

# Kernidee in einem Satz

> Proudleut bekommt keine Booking-Maschine, sondern eine ruhige, transparente Anfrage-Schicht: Veranstalter können passende Bands merken und sauber anfragen, Bands erhalten respektvolle individuelle Einzelmails, und proudleut wird endlich als Quelle der Anfrage sichtbar.
