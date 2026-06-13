# Analysebericht: Event-Type-Matrix proudleut.com

**Erstellt:** 2026-06-11  
**Datenstand:** Live-Abfrage Airtable + Supabase  
**Zweck:** Reine Bestandsaufnahme – keine Schreiboperationen, keine Migration

---

## 1. Ist-Zustand Airtable

| Kennzahl | Wert |
|---|---|
| Aktive Bands | 142 |
| Veranstaltungen-Datensätze | 77 |
| Unique Raw-Typen (Name Kurzform) | 76 |
| Unique Canonical-Gruppen (event_canon) | 46 |

### Top-Canons nach Bandbelegung (AT, dedupliziert)

| Canon | Subtypes im AT | Bands (AT) |
|---|---|---|
| Firmenfeier & Business Event | 4 | 118 |
| Hochzeit | 9 | 111 |
| Festzelt | 16 | 96 |
| Stadt- und Bürgerfest | 1 | 67 |
| Fasching | 3 | 61 |
| Geburtstagsfeier | 1 | 57 |
| Festival | 1 | 29 |
| private Feiern | 1 | 29 |
| Open Air | 1 | 27 |
| Jubiläum | 1 | 26 |

**Festzelt-Subtypes** (16 raw types unter einem Canon):  
Biker-Party, Burschenfest, Dorffest, Dult, Festzelt, Gründungsfest, Kirchweih, Maibaumfest, Motorradtreffen, Oktoberfest, Oktoberfest in München, Rockevent, Starkbierfest, Vereinsfest, Volksfest, Weinfest

**Hochzeit-Subtypes** (9 raw types):  
Agape, Brautentführung, Freie Trauung, Hochzeit, Kaffee & Kuchen, Polterabend, Sektempfang, Standesamt, Trauung

---

## 2. Ist-Zustand Supabase

| Kennzahl | Wert |
|---|---|
| Aktive Bands | 142 |
| Event-Types gesamt (alle aktiv) | 38 |
| band_event_types-Zeilen gesamt | 870 |
| Durchschnittliche ETs pro Band | ~6,1 |

### Alle Supabase event_types nach Bandbelegung

| Name | Slug | Bands (SB) | Beispiele |
|---|---|---|---|
| Firmenfeier & Business Event | firmenfeier-business-event | 117 | Quertreiber, Aufzundn, 2 unplugged |
| Hochzeit | hochzeit | 111 | Quertreiber, Aufzundn, 2 unplugged |
| Festzelt | festzelt | 96 | Quertreiber, Aufzundn, 2 unplugged |
| Stadt- und Bürgerfest | stadt-und-buergerfest | 68 | Aufzundn, 2 unplugged, 5toBeat |
| Fasching | fasching | 61 | Donnaweda, Quertreiber, Aufzundn |
| Geburtstagsfeier | geburtstagsfeier | 57 | 2 unplugged, 5toBeat, 9to5 |
| Festival | festival | 29 | A96 Musikanten, Böhmisches Verlangen, Blechstreet Boys |
| private Feiern | private-feiern | 29 | 2 unplugged, 5toBeat, A96 Musikanten |
| Open Air | open-air | 27 | A96 Musikanten, Best-of-Band, Blechstreet Boys |
| Jubiläum | jubilaeum | 26 | 9to5, A96 Musikanten, Bayrisch Blau |
| Abschlussfeier | abschlussfeier | 19 | 5toBeat, BigBeat, Bretterboden |
| Ball | ball | 19 | 5toBeat, 9to5, Birddogs |
| Weihnachtsfeier | weihnachtsfeier | 19 | 2 unplugged, Best-of-Band, Birddogs |
| Bierfest | bierfest | 18 | A96 Musikanten, Bretterboden, Countryholics |
| Brauereifest | brauereifest | 18 | A96 Musikanten, Blechstreet Boys, Bröslschmarrn |
| Bürgerfest | buergerfest | 17 | Donnaweda, Quertreiber, 2 unplugged |
| Biergarten | biergarten | 15 | A96 Musikanten, Böhmisches Verlangen, Bröslschmarrn |
| exklusive Privatfeiern | exklusive-privatfeiern | 14 | 9to5, Birddogs, Bigband STEINBACH |
| Konzert | konzert | 13 | Bigband STEINBACH, d'Hundskrippln, Donikkl Crew |
| Kultur | kultur | 13 | 2 unplugged, A96 Musikanten, Bigband STEINBACH |
| Empfang | empfang | 12 | Bayrisch Blau, Cherry Pink, James Band |
| Tanzveranstaltung | tanzveranstaltung | 12 | BigBeat, d'Rieder, Foxy Gentlemen |
| Wirtshausmusi | wirtshausmusi | 11 | A96 Musikanten, Almdoodler, Bärntreiber |
| Bankett | bankett | 10 | 5toBeat, Bigband STEINBACH, LPC |
| Taufe | taufe | 9 | Campfire, Freunde des Brautpaares, Hochzeitssängerin MIT HERZ |
| Frühschoppen | fruehschoppen | 8 | A96 Musikanten, Almdoodler, Bärntreiber |
| Sommerfest | sommerfest | 4 | Countryholics, des Brassd scho!, More Candy |
| Award-Show | award-show | 3 | Birddogs, More Candy, Silk and Sound |
| Beerdigung | beerdigung | 3 | Hochzeitssängerin MIT HERZ, Katharina Kornprobst, Free Vocals |
| Ehrenabende | ehrenabende | 3 | Dezent Böhmisch, Gary Rhos, Smooth'n'Groove |
| Sportfest | sportfest | 2 | Die Haumdaucher, Donikkl Crew |
| Bar | bar | 2 | Czech Aut, LPC |
| Kirchweih | kirchweih | **1** | Donnaweda |
| Gründungsfest | gruendungsfest | **1** | Donnaweda |
| Volksfest | volksfest | **1** | Donnaweda |
| Dult | dult | **1** | Donnaweda |
| Oktoberfest | oktoberfest | **1** | Donnaweda |
| Geistliche Anlässe | geistliche-anlaesse | **0** | — |

---

## 3. Befund-Matrix: alle 76 AT-Raw-Typen

Legende für `SB-Match`:
- `exact` — AT Name Kurzform stimmt 1:1 mit SB name überein
- `exact-via-canon` — AT event_canon stimmt mit SB name überein (Raw-Typ wurde beim Import zusammengefasst)
- `nein` — kein SB-Match gefunden

Legende für `Typ-Klasse`:
- **Anlass** — Veranstaltungsanlass (Zweck/Grund der Feier)
- **Format** — Aufführungsformat oder Veranstaltungsstruktur
- **Venue-Kontext** — primär durch den Veranstaltungsort definiert
- **Saison** — primär kalendarisch/saisonal geprägt
- **Zielgruppe** — primär durch Zielgruppe definiert
- **Referenz** — Medienauftritt, kein klassischer Live-Kontext

| AT Raw (Name Kurzform) | AT Canon | Typ-Klasse | Bands (AT) | Beispiele (AT) | SB-Match | SB-Name | Bands (SB) | Bemerkung |
|---|---|---|---|---|---|---|---|---|
| Firmenfeier & Business Event | Firmenfeier & Business Event | Anlass | 116 | 2 unplugged, 5toBeat, 9to5 | exact | Firmenfeier & Business Event | 117 | |
| Hochzeit | Hochzeit | Anlass | 111 | 2 unplugged, 5toBeat, 9to5 | exact | Hochzeit | 111 | 9 AT-Subtypes; SB-Typ ist Canon-Bucket |
| Festzelt | Festzelt | Venue-Kontext | 85 | A96 Musikanten, Aufzundn, Bärntreiber | exact | Festzelt | 96 | 16 AT-Subtypes; SB-Bucket + 5 eigenständige Subtypen (siehe unten) |
| städtische Veranstaltung | Stadt- und Bürgerfest | Anlass | 67 | 2 unplugged, 5toBeat, Aufzundn | exact-via-canon | Stadt- und Bürgerfest | 68 | Einziger AT-Raw-Typ mit Canon „Stadt- und Bürgerfest" |
| Geburtstagsfeier | Geburtstagsfeier | Anlass | 57 | 2 unplugged, 5toBeat, 9to5 | exact | Geburtstagsfeier | 57 | |
| Fasching | Fasching | Saison | 55 | 2 unplugged, Bärntreiber, Best-of-Band | exact | Fasching | 61 | 3 AT-Subtypes: Fasching, Faschingsball, Inthronisationsball |
| Kirchweih | Festzelt | Anlass | 54 | Bärntreiber, Best-of-Band, Blechhilfswerk | exact | Kirchweih | 1 | AT-Canon = Festzelt; in SB eigenständiger Typ mit 1 Bandzuweisung (Donnaweda) |
| Gründungsfest | Festzelt | Anlass | 53 | A96 Musikanten, Bärntreiber, Blechstreet Boys | exact | Gründungsfest | 1 | AT-Canon = Festzelt; in SB eigenständiger Typ mit 1 Bandzuweisung (Donnaweda) |
| Volksfest | Festzelt | Anlass | 53 | A96 Musikanten, Aufzundn, Böhmisches Verlangen | exact | Volksfest | 1 | AT-Canon = Festzelt; in SB eigenständiger Typ mit 1 Bandzuweisung (Donnaweda) |
| Dult | Festzelt | Anlass | 47 | A96 Musikanten, Best-of-Band, Blechstreet Boys | exact | Dult | 1 | AT-Canon = Festzelt; in SB eigenständiger Typ mit 1 Bandzuweisung (Donnaweda) |
| Oktoberfest | Festzelt | Anlass | 36 | A96 Musikanten, Blechstreet Boys, Böhmisches Verlangen | exact | Oktoberfest | 1 | AT-Canon = Festzelt; in SB eigenständiger Typ mit 1 Bandzuweisung (Donnaweda) |
| Festival | Festival | Format | 29 | A96 Musikanten, Blechstreet Boys, Böhmisches Verlangen | exact | Festival | 29 | |
| private Feiern | private Feiern | Anlass | 29 | 2 unplugged, 5toBeat, A96 Musikanten | exact | private Feiern | 29 | |
| Open Air | Open Air | Format | 27 | A96 Musikanten, Best-of-Band, Bigband STEINBACH | exact | Open Air | 27 | |
| Jubiläum | Jubiläum | Anlass | 26 | 9to5, A96 Musikanten, Bayrisch Blau | exact | Jubiläum | 26 | |
| Vereinsfest | Festzelt | Anlass | 25 | 2 unplugged, Bayrisch Blau, Blechhilfswerk | exact-via-canon | Festzelt | 96 | |
| Weinfest | Festzelt | Anlass | 24 | 2 unplugged, Bärntreiber, Böhmisches Verlangen | exact-via-canon | Festzelt | 96 | |
| Trauung | Hochzeit | Anlass | 21 | 2 unplugged, Almdoodler, Campfire | exact-via-canon | Hochzeit | 111 | |
| Abschlussfeier | Abschlussfeier | Anlass | 19 | 5toBeat, BigBeat, Bretterboden | exact | Abschlussfeier | 19 | |
| Ball | Ball | Format | 19 | 5toBeat, 9to5, Bigband STEINBACH | exact | Ball | 19 | |
| Weihnachtsfeier | Weihnachtsfeier | Anlass | 19 | 2 unplugged, Best-of-Band, Bigband STEINBACH | exact | Weihnachtsfeier | 19 | |
| Bierfest | Bierfest | Anlass | 18 | A96 Musikanten, Bretterboden, Countryholics | exact | Bierfest | 18 | |
| Brauereifest | Brauereifest | Anlass | 18 | A96 Musikanten, Blechstreet Boys, Bröslschmarrn | exact | Brauereifest | 18 | |
| Gala | Firmenfeier & Business Event | Format | 18 | 9to5, Bigband STEINBACH, Birddogs | exact-via-canon | Firmenfeier & Business Event | 117 | |
| Bürgerfest | Bürgerfest | Anlass | 17 | 2 unplugged, Bärntreiber, Bigband STEINBACH | exact | Bürgerfest | 17 | |
| Biergarten | Biergarten | Venue-Kontext | 15 | A96 Musikanten, Böhmisches Verlangen, Bröslschmarrn | exact | Biergarten | 15 | |
| Dorffest | Festzelt | Anlass | 14 | 2 unplugged, A96 Musikanten, BigBeat | exact-via-canon | Festzelt | 96 | |
| exklusive Privatfeiern | exklusive Privatfeiern | Anlass | 14 | 9to5, Bigband STEINBACH, Birddogs | exact | exklusive Privatfeiern | 14 | |
| Starkbierfest | Festzelt | Saison | 14 | A96 Musikanten, Böhmisches Verlangen, Breznsalzer | exact-via-canon | Festzelt | 96 | |
| Konzert | Konzert | Format | 13 | Bigband STEINBACH, Claudia und Ralf, d'Hundskrippln | exact | Konzert | 13 | |
| Kulturveranstaltungen | Kultur | Format | 13 | 2 unplugged, A96 Musikanten, Bigband STEINBACH | exact-via-canon | Kultur | 13 | AT-Raw-Name weicht von SB-Name ab (Kulturveranstaltungen → Kultur) |
| Empfang | Empfang | Format | 12 | Bayrisch Blau, Broadway, Cherry Pink | exact | Empfang | 12 | |
| Tanzveranstaltung | Tanzveranstaltung | Format | 12 | BigBeat, Broadway, d'Rieder | exact | Tanzveranstaltung | 12 | |
| Brautentführung | Hochzeit | Anlass | 11 | Bröslschmarrn, Campfire, De Gaudimacha | exact-via-canon | Hochzeit | 111 | |
| Executive Event | Firmenfeier & Business Event | Format | 11 | Bigband STEINBACH, Birddogs, Candy Tunes | exact-via-canon | Firmenfeier & Business Event | 117 | |
| Sektempfang | Hochzeit | Format | 11 | Almdoodler, Campfire, Claudia Dechand | exact-via-canon | Hochzeit | 111 | |
| Wirtshausmusi | Wirtshausmusi | Venue-Kontext | 11 | A96 Musikanten, Almdoodler, Bärntreiber | exact | Wirtshausmusi | 11 | |
| Bankett | Bankett | Format | 10 | 5toBeat, Bigband STEINBACH, Broadway | exact | Bankett | 10 | |
| Burschenfest | Festzelt | Anlass | 9 | A96 Musikanten, Blechstreet Boys, d'Rieder | exact-via-canon | Festzelt | 96 | |
| Messe | Firmenfeier & Business Event | Format | 9 | 9to5, Birddogs, Duanix Musi | exact-via-canon | Firmenfeier & Business Event | 117 | |
| Taufe | Taufe | Anlass | 9 | Campfire, Claudia und Ralf, Deep Decision | exact | Taufe | 9 | |
| Frühschoppen | Frühschoppen | Format | 8 | A96 Musikanten, Almdoodler, Bärntreiber | exact | Frühschoppen | 8 | |
| Standesamt | Hochzeit | Anlass | 8 | Almdoodler, Claudia Dechand, Claudia und Ralf | exact-via-canon | Hochzeit | 111 | |
| Faschingsball | Fasching | Saison | 7 | Aufzundn, Foxy Gentlemen, Hatphones | exact-via-canon | Fasching | 61 | |
| Freie Trauung | Hochzeit | Anlass | 6 | Claudia Dechand, Claudia und Ralf, Freunde des Brautpaares | exact-via-canon | Hochzeit | 111 | |
| Familiennachmittage | Familiennachmittage | Zielgruppe | 5 | Donikkl Crew, Geraldino, Hochzeitssängerin MIT HERZ | nein | — | 0 | |
| Sommerfest | Sommerfest | Saison | 5 | Birddogs, Countryholics, des Brassd scho! | exact | Sommerfest | 4 | |
| Apreski-Party | Apreski-Party | Saison | 4 | Königlich Bayrisches Vollgas Orchester, Out Of Bayern, SIMMISAMMA | nein | — | 0 | |
| Award-Show | Award-Show | Format | 4 | 9to5, Birddogs, More Candy | exact | Award-Show | 3 | |
| Beerdigung | Beerdigung | Anlass | 4 | Almdoodler, Free Vocals, Hochzeitssängerin MIT HERZ | exact | Beerdigung | 3 | |
| Club | Club | Venue-Kontext | 4 | Countryholics, Entprima Live, Gentle | nein | — | 0 | |
| Ehrenabende | Ehrenabende | Anlass | 4 | Böhmisches Verlangen, Dezent Böhmisch, Gary Rhos | exact | Ehrenabende | 3 | |
| Fernsehaufttritte | Fernsehaufttritte | Referenz | 4 | Gaudinockerl, Mountain Crew, Rotzlöffl | nein | — | 0 | Tippfehler im AT-Datensatz (doppeltes t); vgl. „Fernsehauftritt" |
| Kindergartenfest | Kindergartenfest | Zielgruppe | 4 | Donikkl Crew, Geraldino, KIZZRock | nein | — | 0 | |
| Polterabend | Hochzeit | Anlass | 4 | Bröslschmarrn, Die Gseea Wepsn, Hally Gally | exact-via-canon | Hochzeit | 111 | |
| Schulfest | Schulfest | Zielgruppe | 4 | Donikkl Crew, Geraldino, KIZZRock | nein | — | 0 | |
| Vernissage | Vernissage | Format | 4 | Claudia Dechand, Gary Rhos, Smooth'n'Groove | nein | — | 0 | |
| Bar | Bar | Venue-Kontext | 3 | Aufzundn, Czech Aut, LPC | exact | Bar | 2 | |
| Fernsehauftritt | Fernsehauftritt | Referenz | 3 | Duanix Musi, Königlich Bayrisches Vollgas Orchester, Tegernseer Tanzlmusi | nein | — | 0 | Vgl. „Fernsehaufttritte" (separater AT-Datensatz mit Tippfehler) |
| politische Veranstaltung | politische Veranstaltung | Anlass | 3 | Bröslschmarrn, Hot Sugar, Quetschnblech | nein | — | 0 | |
| Sportfest | Sportfest | Anlass | 3 | Blechstreet Boys, Die Haumdaucher, Donikkl Crew | exact | Sportfest | 2 | |
| Zoigl | Zoigl | Venue-Kontext | 3 | Gaudinockerl, Hochdruck Böhmische, Hulzstoussboum | nein | — | 0 | In lib/categories.ts (Kategorie festzelt) als airtableEventType gelistet; kein SB-Typ |
| Benefizveranstaltung | Benefizveranstaltung | Anlass | 2 | Harmonic Brass, Nick's Nice | nein | — | 0 | |
| Grottenfest | Grottenfest | Anlass | 2 | Campfire, Heimatfieber | nein | — | 0 | In lib/categories.ts (Kategorie festzelt) als airtableEventType gelistet; kein SB-Typ |
| Inthronisationsball | Fasching | Saison | 2 | Non Stop, vier-tell-four | exact-via-canon | Fasching | 61 | |
| Oktoberfest in München | Festzelt | Anlass | 2 | Quetschnblech, SIMMISAMMA | exact-via-canon | Festzelt | 96 | Subtyp zu Oktoberfest; spezifiziert München-Auftritte |
| Ski-Opening | Ski-Opening | Saison | 2 | Candy Tunes, Wiesnkönige | nein | — | 0 | |
| Theater | Theater | Format | 2 | Schlawindl, Soiz'n'Pepper | nein | — | 0 | |
| Agape | Hochzeit | Anlass | 1 | Coverage | exact-via-canon | Hochzeit | 111 | |
| Biker-Party | Festzelt | Anlass | 1 | Psyco Dad | exact-via-canon | Festzelt | 96 | |
| Geistliche Anlässe | Geistliche Anlässe | Anlass | 1 | Blechhilfswerk | exact | Geistliche Anlässe | 0 | SB-Typ vorhanden, 0 Bands zugewiesen; 1 Band im AT (Blechhilfswerk) |
| Kaffee & Kuchen | Hochzeit | Anlass | 1 | Freunde des Brautpaares | exact-via-canon | Hochzeit | 111 | |
| Maibaumfest | Festzelt | Saison | 1 | Campfire | exact-via-canon | Festzelt | 96 | |
| Motorradtreffen | Festzelt | Anlass | 1 | Psyco Dad | exact-via-canon | Festzelt | 96 | |
| Rockevent | Festzelt | Format | 1 | Psyco Dad | exact-via-canon | Festzelt | 96 | |
| Senioren60+ | Senioren60+ | Zielgruppe | 1 | Broadway | nein | — | 0 | |

**Zusammenfassung:**

| Match-Typ | Anzahl AT-Raw-Typen |
|---|---|
| exact | 36 |
| exact-via-canon | 25 |
| **nein (kein SB-Match)** | **15** |
| **Gesamt** | **76** |

| Typ-Klasse | Anzahl |
|---|---|
| Anlass | 39 |
| Format | 17 |
| Venue-Kontext | 6 |
| Saison | 8 |
| Zielgruppe | 4 |
| Referenz | 2 |

---

## 4. Lücken-Check

### Bänder ohne event_type in Supabase

**Ergebnis: 0 Bänder betroffen.**  
Alle 142 aktiven SB-Bands haben mindestens einen event_type zugewiesen.

### AT-Raw-Typen ohne SB-Gegenstück (15 Typen)

Diese AT-Typen existieren in Supabase noch nicht als event_type:

| AT Raw | Typ-Klasse | Bands (AT) | Anmerkung |
|---|---|---|---|
| Familiennachmittage | Zielgruppe | 5 | Kinderprogramm-Kontext |
| Apreski-Party | Saison | 4 | saisonal, Nische |
| Club | Venue-Kontext | 4 | Nacht-/Club-Kontext |
| Fernsehaufttritte | Referenz | 4 | Tippfehler im AT-Datensatz (doppeltes t) |
| Kindergartenfest | Zielgruppe | 4 | Kinderprogramm-Kontext |
| Schulfest | Zielgruppe | 4 | Kinderprogramm-Kontext |
| Vernissage | Format | 4 | Kunst/Galerie-Kontext |
| Fernsehauftritt | Referenz | 3 | Vgl. „Fernsehaufttritte" (Tippfehler dort) |
| politische Veranstaltung | Anlass | 3 | — |
| Zoigl | Venue-Kontext | 3 | In lib/categories.ts (Kategorie festzelt) gelistet |
| Benefizveranstaltung | Anlass | 2 | — |
| Grottenfest | Anlass | 2 | In lib/categories.ts (Kategorie festzelt) gelistet |
| Ski-Opening | Saison | 2 | saisonal |
| Theater | Format | 2 | — |
| Senioren60+ | Zielgruppe | 1 | — |

**Hinweis zu `Zoigl` und `Grottenfest`:** Beide sind in [`lib/categories.ts`](../lib/categories.ts) als `airtableEventTypes` der Kategorie „Festzelt & Volksfest" eingetragen und werden damit für die öffentliche Kategorieseite bereits ausgewertet — obwohl kein SB-Gegenstück existiert. Das ist kein Fehler (die Kategorie-Seiten lesen direkt aus Airtable), sollte aber bei einer SB-Migration dieser Typen beachtet werden.

### SB-Only-Typen (in SB, kein AT-Raw-Gegenstück)

**Ergebnis: 0 SB-Only-Typen.**  
Alle 38 SB-event_types haben mindestens einen AT-Raw-Match.

---

## 5. Strukturelle Auffälligkeiten

### 5.1 Festzelt-Subtypes: Split vs. Canon-Bucket

In Supabase existieren sowohl ein generischer "Festzelt"-Typ (96 Bands) als auch granulare Festzelt-Subtypes als eigenständige event_types:

| SB event_type | Bands (SB) |
|---|---|
| Festzelt | 96 |
| Kirchweih | 1 (nur Donnaweda) |
| Gründungsfest | 1 (nur Donnaweda) |
| Volksfest | 1 (nur Donnaweda) |
| Dult | 1 (nur Donnaweda) |
| Oktoberfest | 1 (nur Donnaweda) |

**Befund:** Die granularen Subtypen wurden beim AT-Import für die meisten Bands unter dem Canon "Festzelt" zusammengefasst. Nur Donnaweda hat sie granular zugewiesen — vermutlich weil deren Migration separat und manuell erfolgte. Die granularen SB-Typen sind damit faktisch leer bis auf eine Band.

**Entscheidungsbedarf:** Sollen die granularen Festzelt-Subtypen in SB bleiben (als optionale Feingranularität für die Zukunft) oder werden sie zu "Festzelt" konsolidiert? Keine sofortige Auswirkung auf die öffentliche Sichtbarkeit, da Kategorieseiten Airtable nutzen.

### 5.2 Geistliche Anlässe: 0 Bands in SB

Der event_type "Geistliche Anlässe" existiert in Supabase (active), hat aber 0 Band-Zuweisungen. In Airtable hat er 1 Band (Blechhilfswerk). Kein akuter Handlungsbedarf.

### 5.3 Tippfehler: Fernsehaufttritte / Fernsehauftritt

In Airtable existieren zwei separate Datensätze:
- „Fernsehaufttritte" (4 Bands, doppeltes t — Tippfehler)
- „Fernsehauftritt" (3 Bands, korrekt)

Beide haben unterschiedliche canons (identisch mit dem jeweiligen Raw-Namen) und keinen SB-Match. Falls diese Typen jemals in SB migriert werden, sollte zuerst der Airtable-Tippfehler korrigiert werden.

### 5.4 AT-Zahlen vs. SB-Zahlen: Abweichungen bei gleicher Kategorie

Durch das Canon-Mapping können SB-Zahlen höher sein als AT-Raw-Zahlen:

| Kategorie | Bands AT (Raw) | Bands SB |
|---|---|---|
| Festzelt | 85 | 96 (+11) |
| Fasching | 55 | 61 (+6) |
| Stadt- und Bürgerfest | 67 | 68 (+1) |

Erklärung: Die AT-Raw-Zahlen zählen nur Bands mit dem exakten Raw-Namen. Bands, die z.B. „Kirchweih" oder „Dorffest" haben (aber nicht „Festzelt"), werden in SB zum Canon "Festzelt" gezählt.  
Umgekehrt können SB-Zahlen niedriger sein, wenn einzelne Bands manuell ohne bestimmte Typen angelegt wurden.

---

## 6. Offene Datenfragen

1. **Festzelt-Granularität**: Sollen Kirchweih, Gründungsfest, Volksfest, Dult, Oktoberfest als eigenständige SB-event_types langfristig befüllt werden — oder Konsolidierung zu "Festzelt"?

2. **AT-only-Typen (15)**: Welche davon sollen künftig in SB angelegt werden? Kandidaten mit relevanter Band-Zahl (≥ 3):
   - Familiennachmittage (5), Apreski-Party (4), Club (4), Kindergartenfest (4), Schulfest (4), Vernissage (4), Fernsehauftritt (3), politische Veranstaltung (3), Zoigl (3)

3. **Tippfehler „Fernsehaufttritte"**: Korrektur im Airtable-Datensatz empfohlen, bevor dieser Typ in SB migriert wird.

4. **Zoigl & Grottenfest**: In `lib/categories.ts` als Festzelt-Unterkategorie referenziert — bei künftiger SB-Migration klären, ob eigene SB-event_types oder weiterhin AT-only.

5. **Senioren60+, Beerdigung, Geistliche Anlässe**: Spezialanlässe mit sehr kleiner Bandmenge. Entscheidung: eigene Kategorieseite gewollt oder nur internes Tagging?

---

## 7. Anhang: Alle canons nach Relevanz (AT-Bandcount)

| Canon | Raw-Typen darunter | Bands (AT) |
|---|---|---|
| Firmenfeier & Business Event | 4 | 118 |
| Hochzeit | 9 | 111 |
| Festzelt | 16 | 96 |
| Stadt- und Bürgerfest | 1 | 67 |
| Fasching | 3 | 61 |
| Geburtstagsfeier | 1 | 57 |
| Festival | 1 | 29 |
| private Feiern | 1 | 29 |
| Open Air | 1 | 27 |
| Jubiläum | 1 | 26 |
| Abschlussfeier | 1 | 19 |
| Ball | 1 | 19 |
| Weihnachtsfeier | 1 | 19 |
| Bierfest | 1 | 18 |
| Brauereifest | 1 | 18 |
| Bürgerfest | 1 | 17 |
| Biergarten | 1 | 15 |
| exklusive Privatfeiern | 1 | 14 |
| Konzert | 1 | 13 |
| Kultur | 1 | 13 |
| Empfang | 1 | 12 |
| Tanzveranstaltung | 1 | 12 |
| Wirtshausmusi | 1 | 11 |
| Bankett | 1 | 10 |
| Taufe | 1 | 9 |
| Frühschoppen | 1 | 8 |
| Familiennachmittage | 1 | 5 |
| Sommerfest | 1 | 5 |
| Apreski-Party | 1 | 4 |
| Award-Show | 1 | 4 |
| Beerdigung | 1 | 4 |
| Club | 1 | 4 |
| Ehrenabende | 1 | 4 |
| Fernsehaufttritte | 1 | 4 |
| Kindergartenfest | 1 | 4 |
| Schulfest | 1 | 4 |
| Vernissage | 1 | 4 |
| Bar | 1 | 3 |
| Fernsehauftritt | 1 | 3 |
| politische Veranstaltung | 1 | 3 |
| Sportfest | 1 | 3 |
| Zoigl | 1 | 3 |
| Benefizveranstaltung | 1 | 2 |
| Grottenfest | 1 | 2 |
| Ski-Opening | 1 | 2 |
| Theater | 1 | 2 |
| Geistliche Anlässe | 1 | 1 |
| Senioren60+ | 1 | 1 |
