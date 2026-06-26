# Entscheidungsvorlage: Öffentliche Event-Type-Architektur

**Stand:** 2026-06-14  
**Typ:** Entscheidungsvorlage — keine Umsetzung, keine Code-Änderung  
**Für:** Redaktionelle Entscheidungsrunde mit Xandi

---

## 1. Zweck & Status-Legende

Dieses Dokument ist eine **Entscheidungsvorlage**, keine Umsetzung. Es fasst den aktuellen Stand der Event-Type-Klassifizierung zusammen und benennt konkret, welche Entscheidungen noch ausstehen.

### Status-Werte

| Status | Bedeutung |
|---|---|
| `entschieden` | Aus vorhandenen Repo-Dokumenten belegbar — nicht neu zu diskutieren |
| `empfohlen` | Vorschlag von Claude Code, redaktionell noch zu bestätigen |
| `offen` | Echte Streitfrage — gehört in die gemeinsame Diskussion |
| `später prüfen` | Aktuell kein öffentlicher Kandidat, aber möglicher späterer Ausbau |
| `nicht öffentlich` | Bewusst kein Themenwelt-Kandidat |

### Gelesene Quellen

- `docs/analysebericht-event-type-matrix.md` — 76 AT-Raw-Typen mit Typ-Klassen und Bandzahlen
- `docs/event-type-redaktionsentscheidungen.md` — getroffene redaktionelle Entscheidungen (Phase 2)
- `docs/plan-event-types-3a.md` — Block-3A-Insert-Plan (pausiert)
- `lib/categories.ts` — aktuell öffentliche CATEGORIES-Struktur (5 Themenwelten)
- `docs/befund-event-type-sichtbarkeit.md` — Chip-Link-Mechanik und Supabase-Slug-Audit
- `docs/analysebericht-datenquellen-public-frontend.md` — Architektur-Befund

---

## 2. Bereits getroffene Entscheidungen

Diese Entscheidungen sind im Repo belegt und werden in diesem Dokument nicht neu zur Debatte gestellt.

| Wert | Entscheidung | Status | Quelle / Beleg | Hinweis |
|---|---|---|---|---|
| Hochzeit | Öffentliche Themenwelt `/veranstaltung/hochzeit` | entschieden | `lib/categories.ts` | Besteht seit Phase 1 |
| Festzelt & Volksfest | Öffentliche Themenwelt `/veranstaltung/festzelt` | entschieden | `lib/categories.ts` | Besteht seit Phase 1 |
| Firmenfeier & Business Event | Öffentliche Themenwelt `/veranstaltung/firmenfeier` | entschieden | `lib/categories.ts` | Besteht seit Phase 1 |
| Geburtstag & Privatfeier | Öffentliche Themenwelt `/veranstaltung/geburtstag` | entschieden | `lib/categories.ts` | Besteht seit Phase 1 |
| Gala & Empfang | Öffentliche Themenwelt `/veranstaltung/gala` | entschieden | `lib/categories.ts` | Besteht seit Phase 1 |
| Club | Neue öffentliche Themenwelt `/veranstaltung/club` | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 2 | Venue-/Format-Kontext; Insert pausiert (Block 3A) |
| Benefizveranstaltung | Neue öffentliche Themenwelt | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 2 | Insert pausiert (Block 3A) |
| Vernissage | Neue öffentliche Themenwelt | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 2 | Aktuell noch unter `gala` in CATEGORIES |
| Kinder- & Familienevent | Neue öffentliche Themenwelt (bündelt Familiennachmittage, Kindergartenfest, Schulfest) | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 2 | Insert pausiert (Block 3A) |
| Trauerfeier & Zeremonie | Neue öffentliche Themenwelt (behutsamere Umbenennung von Beerdigung) | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 2 + Update 2026-06-13 | Separater Sprint; explizit ausgeschlossen aus Block 3A |
| Geistliche Anlässe | Auflösen — kein eigener öffentlicher Event-Type | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 3 + Update 2026-06-13 | 1 AT-Band einzeln prüfen |
| Fernsehauftritt | Profil-Referenz / Trust-Signal, kein Event-Type | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 3 | Löst auch Tippfehler-Split auf |
| Fernsehaufttritte | Profil-Referenz (Tippfehler-Variante) | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 3 | AT-Datensatz mit doppeltem t |
| politische Veranstaltung | Nur intern taggen — kein öffentlicher Event-Type | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 3 | Außenwirkung des Portals als Begründung |
| Senioren60+ | Kein öffentlicher Event-Type | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 3 | Zielgruppe, kein Anlass; Sprache passt nicht zu proudleut |
| Theater | Kein öffentlicher Event-Type | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 3 | Venue-/Format-Kontext, kein Buchungsanlass |
| Zoigl | Alias / regionaler Unterbegriff unter `festzelt` | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 4 + `lib/categories.ts` | Bereits in festzelt.airtableEventTypes |
| Grottenfest | Alias / regionaler Unterbegriff unter `festzelt` | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 4 + `lib/categories.ts` | Bereits in festzelt.airtableEventTypes |
| Ski-Opening | Saisonaler Unterbegriff — kein eigener öffentlicher Filter | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 4 | Vorgemerkt als späterer Ausbaukandidat |
| Apreski-Party | Saisonaler Unterbegriff — kein eigener öffentlicher Filter | entschieden | `event-type-redaktionsentscheidungen.md` Sec. 4 | Dort „Après-Ski-Party" — identischer AT-Wert |

---

## 3. Klassifizierungs-Vorschlag — alle 76 Werte

> **Leitprinzip:** Default ist `interner Detailtyp`. Öffentliche Themenwelt ist die Ausnahme und braucht Begründung.

| Wert | Typ-Klasse | Vorschlag | Status | Kurze Begründung | Beleg / Quelle |
|---|---|---|---|---|---|
| Firmenfeier & Business Event | Anlass | öffentliche Themenwelt | entschieden | Primärtyp hinter /veranstaltung/firmenfeier; 116 AT-Bands | `lib/categories.ts` |
| Hochzeit | Anlass | öffentliche Themenwelt | entschieden | Primärtyp hinter /veranstaltung/hochzeit; 111 AT-Bands | `lib/categories.ts` |
| Festzelt | Venue-Kontext | öffentliche Themenwelt | entschieden | Primärtyp hinter /veranstaltung/festzelt; 85 AT-Bands | `lib/categories.ts` |
| städtische Veranstaltung | Anlass | interner Detailtyp | entschieden | AT-Canon: Stadt- und Bürgerfest; unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Geburtstagsfeier | Anlass | öffentliche Themenwelt | entschieden | Primärtyp hinter /veranstaltung/geburtstag; 57 AT-Bands | `lib/categories.ts` |
| Fasching | Saison | interner Detailtyp | offen | 55 AT-Bands; starke saisonale Identität; eigene Themenwelt diskutierbar | keine belegte Entscheidung |
| Kirchweih | Anlass | interner Detailtyp | später prüfen | 54 AT-Bands via Canon Festzelt; in SB nur 1 Band (Donnaweda); Festzelt-Detailtyp heute | `analysebericht-event-type-matrix.md` Sec. 5.1 |
| Gründungsfest | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; in SB nur 1 Band; kein Seitenpotenzial heute | `analysebericht-event-type-matrix.md` Sec. 5.1 |
| Volksfest | Anlass | interner Detailtyp | später prüfen | 53 AT-Bands via Canon Festzelt; in SB nur 1 Band; hohe SEO-Relevanz denkbar | `analysebericht-event-type-matrix.md` Sec. 5.1 |
| Dult | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; in SB nur 1 Band; Bayern-Nische, zu klein | `analysebericht-event-type-matrix.md` Sec. 5.1 |
| Oktoberfest | Anlass | interner Detailtyp | offen | 36 AT-Bands; starkes SEO-Potenzial; noch keine Entscheidung | keine belegte Entscheidung |
| Festival | Format | interner Detailtyp | offen | 29 AT-Bands; klar verständlicher Typ; eigene Seite sinnvoll? | keine belegte Entscheidung |
| private Feiern | Anlass | interner Detailtyp | entschieden | Unter geburtstag als airtableEventType | `lib/categories.ts`, geburtstag |
| Open Air | Format | interner Detailtyp | empfohlen | 27 AT-Bands; Format-Typ ohne klaren Buchungsanlass; kein eigener Anlasskontext | keine belegte Entscheidung |
| Jubiläum | Anlass | interner Detailtyp | entschieden | Unter geburtstag als airtableEventType | `lib/categories.ts`, geburtstag |
| Vereinsfest | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; 25 AT-Bands; kein eigener SB-Typ | `analysebericht-event-type-matrix.md` |
| Weinfest | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; 24 AT-Bands; kein eigener SB-Typ | `analysebericht-event-type-matrix.md` |
| Trauung | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Zeremonie-Detail; 21 AT-Bands | `analysebericht-event-type-matrix.md` |
| Abschlussfeier | Anlass | interner Detailtyp | entschieden | Unter firmenfeier als airtableEventType | `lib/categories.ts`, firmenfeier |
| Ball | Format | interner Detailtyp | entschieden | Unter gala als airtableEventType | `lib/categories.ts`, gala |
| Weihnachtsfeier | Anlass | interner Detailtyp | offen | Aktuell unter firmenfeier; saisonal-kontextabhängig; eigene Themenwelt diskutierbar | `lib/categories.ts` (aktuell firmenfeier); Auftrag-Leitplanke |
| Bierfest | Anlass | interner Detailtyp | entschieden | Unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Brauereifest | Anlass | interner Detailtyp | entschieden | Unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Gala | Format | interner Detailtyp | empfohlen | AT-Canon: Firmenfeier & Business Event; trägt zu firmenfeier bei — ACHTUNG: Namenskollision mit CATEGORY-Slug „gala" (= Gala & Empfang) | `analysebericht-event-type-matrix.md` |
| Bürgerfest | Anlass | interner Detailtyp | entschieden | Unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Biergarten | Venue-Kontext | interner Detailtyp | entschieden | Unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Dorffest | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; 14 AT-Bands; kein eigener SB-Typ | `analysebericht-event-type-matrix.md` |
| exklusive Privatfeiern | Anlass | interner Detailtyp | entschieden | Unter geburtstag als airtableEventType | `lib/categories.ts`, geburtstag |
| Starkbierfest | Saison | interner Detailtyp | empfohlen | Canon Festzelt; saisonal; 14 AT-Bands | `analysebericht-event-type-matrix.md` |
| Konzert | Format | nicht-öffentlich | empfohlen | Format-Ambiguität: `Konzert` ist auch `band_type`; kein klarer Buchungsanlass für Veranstalter | `analysebericht-sprint5-bandart.md` |
| Kulturveranstaltungen | Format | interner Detailtyp | empfohlen | 13 AT-Bands; kein klares SEO-Thema; Format-Oberbegriff | `analysebericht-event-type-matrix.md` |
| Empfang | Format | interner Detailtyp | entschieden | Unter gala als airtableEventType | `lib/categories.ts`, gala |
| Tanzveranstaltung | Format | interner Detailtyp | empfohlen | Format-Typ; 12 AT-Bands; kein eigener Anlasskontext | `analysebericht-event-type-matrix.md` |
| Brautentführung | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Hochzeits-Detail; 11 AT-Bands | `analysebericht-event-type-matrix.md` |
| Executive Event | Format | interner Detailtyp | empfohlen | Canon Firmenfeier; 11 AT-Bands; Business-Detailtyp | `analysebericht-event-type-matrix.md` |
| Sektempfang | Format | interner Detailtyp | empfohlen | Canon Hochzeit; Hochzeits-Detail; 11 AT-Bands | `analysebericht-event-type-matrix.md` |
| Wirtshausmusi | Venue-Kontext | interner Detailtyp | entschieden | Unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Bankett | Format | interner Detailtyp | entschieden | Unter gala als airtableEventType | `lib/categories.ts`, gala |
| Burschenfest | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; 9 AT-Bands | `analysebericht-event-type-matrix.md` |
| Messe | Format | interner Detailtyp | empfohlen | Canon Firmenfeier; 9 AT-Bands; B2B-Detailtyp | `analysebericht-event-type-matrix.md` |
| Taufe | Anlass | interner Detailtyp | entschieden | Unter geburtstag als airtableEventType | `lib/categories.ts`, geburtstag |
| Frühschoppen | Format | interner Detailtyp | entschieden | Unter festzelt als airtableEventType | `lib/categories.ts`, festzelt |
| Standesamt | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Zeremonie-Detail; 8 AT-Bands | `analysebericht-event-type-matrix.md` |
| Faschingsball | Saison | interner Detailtyp | empfohlen | Canon Fasching; saisonales Detail; 7 AT-Bands | `analysebericht-event-type-matrix.md` |
| Freie Trauung | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Hochzeits-Detail; 6 AT-Bands | `analysebericht-event-type-matrix.md` |
| Familiennachmittage | Zielgruppe | interner Detailtyp | entschieden | Aktuell unter geburtstag; auch Einzel-Feed für Kinder- & Familienevent | `lib/categories.ts` + `event-type-redaktionsentscheidungen.md` Sec. 2 |
| Sommerfest | Saison | interner Detailtyp | offen | Aktuell unter firmenfeier; saisonal-kontextabhängig; eigene Themenwelt diskutierbar | `lib/categories.ts` (aktuell firmenfeier); Auftrag-Leitplanke |
| Apreski-Party | Saison | interner Detailtyp | entschieden | Saisonaler Unterbegriff; kein öffentlicher Filter | `event-type-redaktionsentscheidungen.md` Sec. 4 |
| Award-Show | Format | interner Detailtyp | entschieden | Unter firmenfeier als airtableEventType | `lib/categories.ts`, firmenfeier |
| Beerdigung | Anlass | interner Detailtyp | entschieden | Umbenennung zu Trauerfeier & Zeremonie (separater Sprint); kein eigenständiger öffentlicher Typ mehr | `event-type-redaktionsentscheidungen.md` Sec. 2 + Update 2026-06-13 |
| Club | Venue-Kontext | öffentliche Themenwelt | entschieden | Beschlossene neue Themenwelt /veranstaltung/club; Insert pausiert (Block 3A) | `event-type-redaktionsentscheidungen.md` Sec. 2 |
| Ehrenabende | Anlass | interner Detailtyp | entschieden | Unter gala als airtableEventType | `lib/categories.ts`, gala |
| Fernsehaufttritte | Referenz | nicht-öffentlich | entschieden | Profil-Referenz/Trust-Signal; Tippfehler-Variante (doppeltes t) | `event-type-redaktionsentscheidungen.md` Sec. 3 |
| Kindergartenfest | Zielgruppe | interner Detailtyp | entschieden | Feed für neue Themenwelt Kinder- & Familienevent | `event-type-redaktionsentscheidungen.md` Sec. 2 |
| Polterabend | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Hochzeits-Detail; 4 AT-Bands | `analysebericht-event-type-matrix.md` |
| Schulfest | Zielgruppe | interner Detailtyp | entschieden | Feed für neue Themenwelt Kinder- & Familienevent | `event-type-redaktionsentscheidungen.md` Sec. 2 |
| Vernissage | Format | öffentliche Themenwelt | entschieden | Beschlossene neue Themenwelt /veranstaltung/vernissage; aktuell noch auch unter gala in CATEGORIES | `event-type-redaktionsentscheidungen.md` Sec. 2 + `lib/categories.ts` |
| Bar | Venue-Kontext | nicht-öffentlich | empfohlen | Venue-Kontext; nur 2–3 Bands; kein eigenständiger Buchungsanlass für Veranstalter | `analysebericht-event-type-matrix.md` |
| Fernsehauftritt | Referenz | nicht-öffentlich | entschieden | Profil-Referenz/Trust-Signal; kein Buchungsanlass | `event-type-redaktionsentscheidungen.md` Sec. 3 |
| politische Veranstaltung | Anlass | nicht-öffentlich | entschieden | Nur intern taggen; bewusst kein öffentlicher Filter | `event-type-redaktionsentscheidungen.md` Sec. 3 |
| Sportfest | Anlass | interner Detailtyp | empfohlen | 3 AT-Bands; kein klares Thema für eigene Seite | `analysebericht-event-type-matrix.md` |
| Zoigl | Venue-Kontext | interner Detailtyp | entschieden | Regionaler Alias; bereits unter festzelt | `event-type-redaktionsentscheidungen.md` Sec. 4 + `lib/categories.ts` |
| Benefizveranstaltung | Anlass | öffentliche Themenwelt | entschieden | Beschlossene neue Themenwelt; Insert pausiert (Block 3A) | `event-type-redaktionsentscheidungen.md` Sec. 2 |
| Grottenfest | Anlass | interner Detailtyp | entschieden | Regionaler Alias; bereits unter festzelt | `event-type-redaktionsentscheidungen.md` Sec. 4 + `lib/categories.ts` |
| Inthronisationsball | Saison | interner Detailtyp | empfohlen | Canon Fasching; saisonales Detail; 2 AT-Bands; zu klein | `analysebericht-event-type-matrix.md` |
| Oktoberfest in München | Anlass | interner Detailtyp | empfohlen | Sub-Oktoberfest; sehr spezifisch; 2 AT-Bands | `analysebericht-event-type-matrix.md` |
| Ski-Opening | Saison | interner Detailtyp | entschieden | Saisonaler Unterbegriff; kein eigener öffentlicher Filter | `event-type-redaktionsentscheidungen.md` Sec. 4 |
| Theater | Format | nicht-öffentlich | entschieden | Kein eigener öffentlicher Event-Type | `event-type-redaktionsentscheidungen.md` Sec. 3 |
| Agape | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Hochzeits-Detail; 1 AT-Band | `analysebericht-event-type-matrix.md` |
| Biker-Party | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; Nische; 1 AT-Band | `analysebericht-event-type-matrix.md` |
| Geistliche Anlässe | Anlass | nicht-öffentlich | entschieden | Auflösen; 1 AT-Band einzeln prüfen und zuordnen | `event-type-redaktionsentscheidungen.md` Sec. 3 + Update 2026-06-13 |
| Kaffee & Kuchen | Anlass | interner Detailtyp | empfohlen | Canon Hochzeit; Hochzeits-Detail; 1 AT-Band | `analysebericht-event-type-matrix.md` |
| Maibaumfest | Saison | interner Detailtyp | empfohlen | Canon Festzelt; saisonal; 1 AT-Band | `analysebericht-event-type-matrix.md` |
| Motorradtreffen | Anlass | interner Detailtyp | empfohlen | Canon Festzelt; Nische; 1 AT-Band | `analysebericht-event-type-matrix.md` |
| Rockevent | Format | interner Detailtyp | empfohlen | Canon Festzelt; 1 AT-Band | `analysebericht-event-type-matrix.md` |
| Senioren60+ | Zielgruppe | nicht-öffentlich | entschieden | Zielgruppe, kein Anlass; Sprache passt nicht zu proudleut | `event-type-redaktionsentscheidungen.md` Sec. 3 |

### Vollständigkeitsprüfung

| Kennzahl | Wert |
|---|---|
| Werte in `analysebericht-event-type-matrix.md` | 76 |
| Werte in dieser Vorlage | 76 |
| Abweichungen | keine |

---

## 4. Vorgeschlagene öffentliche Themenwelten

### 4a. Bestehende Themenwelten (entschieden)

| Themenwelt | Slug | Status | Warum öffentlich? | Welche Detailtypen darunter? |
|---|---|---|---|---|
| Hochzeit | `hochzeit` | entschieden | Stärkstes Buchungssegment; 111 Bands | Trauung, Freie Trauung, Standesamt, Sektempfang, Polterabend, Brautentführung, Agape, Kaffee & Kuchen |
| Festzelt & Volksfest | `festzelt` | entschieden | Bayern-Kernthema; 85+ Bands; 10 AT-Typen | Stadt- und Bürgerfest, Bierfest, Brauereifest, Bürgerfest, Biergarten, Wirtshausmusi, Frühschoppen, Zoigl, Grottenfest, Dorffest, Weinfest, Vereinsfest, Burschenfest, Starkbierfest, Maibaumfest, Motorradtreffen, Biker-Party, Rockevent |
| Firmenfeier & Business Event | `firmenfeier` | entschieden | 116 Bands; breites B2B-Segment | Abschlussfeier, Award-Show, Gala (raw type), Executive Event, Messe |
| Geburtstag & Privatfeier | `geburtstag` | entschieden | 57 Bands; breites Privat-Segment | private Feiern, exklusive Privatfeiern, Jubiläum, Taufe, Familiennachmittage |
| Gala & Empfang | `gala` | entschieden | Hochwertigkeitssegment; Ball, Bankett, Empfang | Ball, Bankett, Empfang, Ehrenabende, Vernissage (aktuell noch hier, bis eigene Seite) |

### 4b. Beschlossene neue Themenwelten (entschieden, Umsetzung ausstehend)

| Themenwelt | Slug-Vorschlag | Status | Warum öffentlich? | Welche Detailtypen darunter? |
|---|---|---|---|---|
| Kinder- & Familienevent | `kinder-und-familienevent` | entschieden | Bündelt Familiennachmittage, Kindergartenfest, Schulfest; eigener Kontext | Familiennachmittage, Kindergartenfest, Schulfest |
| Benefizveranstaltung | `benefizveranstaltung` | entschieden | Klarer Anlasskontext; relevant für Vereine, Städte, soziale Träger | — |
| Vernissage | `vernissage` | entschieden | Eigenständiger Kultur-/Galeriekontext | — |
| Club | `club` | entschieden | Eigenständige Auftrittssituation (Venue-/Format-Kontext) | — |
| Trauerfeier & Zeremonie | `trauerfeier-und-zeremonie` | entschieden | Behutsamere Umbenennung von Beerdigung; separater Sprint | Beerdigung (als alter AT-Typ) |

### 4c. Potenzielle zukünftige Themenwelten (offen)

| Themenwelt | Slug-Vorschlag | Status | Warum öffentlich (Argument)? | Offene Frage |
|---|---|---|---|---|
| Fasching | `fasching` | offen | 55 AT-Bands; klare saisonale Identität | Eigene Seite oder interner Saisontyp? |
| Oktoberfest | `oktoberfest` | offen | 36 AT-Bands; enormes SEO-Potenzial | Eigene Seite oder Festzelt-Detailtyp? |
| Weihnachtsfeier | `weihnachtsfeier` | offen | 19 Bands; saisonal eigenständig; nicht nur Firmenfeier | Bleibt unter firmenfeier oder eigene saisonale Seite? |
| Sommerfest | `sommerfest` | offen | 5 Bands; saisonal; nicht nur Firmenfeier | Bleibt unter firmenfeier oder eigene saisonale Seite? |
| Festival | `festival` | offen | 29 Bands; klarer Typ; SEO-Potenzial | Format-Typ ohne Anlasskontext — eigene Seite sinnvoll? |
| Kirchweih | `kirchweih` | später prüfen | 54 AT-Bands (via Canon); regional relevant | SB-Datenbasis fehlt (1 Band); zuerst SB befüllen |
| Volksfest | `volksfest` | später prüfen | 53 AT-Bands (via Canon); hohe Bekanntheit | SB-Datenbasis fehlt (1 Band); zuerst SB befüllen |

---

## 5. Interne Detailtypen

Folgende Typen werden als interne Detailtypen geführt — kein eigener `/veranstaltung/`-Pfad, aber als Filter-/Tagging-Wert intern verwendbar.

### Anlass

| Wert | Übergeordnetes Thema | Status | Begründung |
|---|---|---|---|
| städtische Veranstaltung | festzelt | entschieden | AT-Canon Stadt- und Bürgerfest; unter festzelt |
| private Feiern | geburtstag | entschieden | Unter geburtstag |
| Jubiläum | geburtstag | entschieden | Unter geburtstag |
| Abschlussfeier | firmenfeier | entschieden | Unter firmenfeier |
| Bierfest | festzelt | entschieden | Unter festzelt |
| Brauereifest | festzelt | entschieden | Unter festzelt |
| Bürgerfest | festzelt | entschieden | Unter festzelt |
| exklusive Privatfeiern | geburtstag | entschieden | Unter geburtstag |
| Ehrenabende | gala | entschieden | Unter gala |
| Familiennachmittage | geburtstag / Kinder- & Familienevent | entschieden | Doppelrolle: aktuell geburtstag; künftig Kinder- & Familienevent |
| Zoigl | festzelt | entschieden | Regionaler Alias; unter festzelt |
| Grottenfest | festzelt | entschieden | Regionaler Alias; unter festzelt |
| Apreski-Party | — | entschieden | Saisonaler Unterbegriff; vorerst kein öffentlicher Filter |
| Beerdigung | Trauerfeier & Zeremonie | entschieden | Umbenennung (separater Sprint) |
| Kindergartenfest | Kinder- & Familienevent | entschieden | Feed für neue Themenwelt |
| Schulfest | Kinder- & Familienevent | entschieden | Feed für neue Themenwelt |
| Vereinsfest | festzelt | empfohlen | Canon Festzelt; kein eigener SB-Typ |
| Weinfest | festzelt | empfohlen | Canon Festzelt; kein eigener SB-Typ |
| Trauung | hochzeit | empfohlen | Canon Hochzeit |
| Dorffest | festzelt | empfohlen | Canon Festzelt |
| Burschenfest | festzelt | empfohlen | Canon Festzelt |
| Polterabend | hochzeit | empfohlen | Canon Hochzeit |
| Brautentführung | hochzeit | empfohlen | Canon Hochzeit |
| Standesamt | hochzeit | empfohlen | Canon Hochzeit |
| Freie Trauung | hochzeit | empfohlen | Canon Hochzeit |
| Sportfest | — | empfohlen | 3 AT-Bands; zu klein für eigene Seite |
| Agape | hochzeit | empfohlen | 1 AT-Band; Hochzeits-Detail |
| Kaffee & Kuchen | hochzeit | empfohlen | 1 AT-Band; Hochzeits-Detail |
| Biker-Party | festzelt | empfohlen | 1 AT-Band; Nische |
| Motorradtreffen | festzelt | empfohlen | 1 AT-Band; Nische |
| Oktoberfest in München | festzelt / oktoberfest | empfohlen | Sub-Oktoberfest; 2 AT-Bands |

### Format

| Wert | Übergeordnetes Thema | Status | Begründung |
|---|---|---|---|
| Ball | gala | entschieden | Unter gala |
| Empfang | gala | entschieden | Unter gala |
| Bankett | gala | entschieden | Unter gala |
| Frühschoppen | festzelt | entschieden | Unter festzelt |
| Wirtshausmusi | festzelt | entschieden | Unter festzelt |
| Award-Show | firmenfeier | entschieden | Unter firmenfeier |
| Gala (raw) | firmenfeier | empfohlen | Canon Firmenfeier; ACHTUNG: Namenskollision mit CATEGORY-Slug „gala" |
| Open Air | — | empfohlen | Format-Typ; kein eigener Anlasskontext |
| Kulturveranstaltungen | — | empfohlen | Format-Oberbegriff; 13 Bands |
| Tanzveranstaltung | — | empfohlen | Format-Typ; 12 Bands |
| Executive Event | firmenfeier | empfohlen | Canon Firmenfeier; Business-Detailtyp |
| Sektempfang | hochzeit | empfohlen | Canon Hochzeit; Hochzeits-Detail |
| Messe | firmenfeier | empfohlen | Canon Firmenfeier; B2B-Detailtyp |
| Rockevent | festzelt | empfohlen | Canon Festzelt; 1 Band |

### Saison

| Wert | Übergeordnetes Thema | Status | Begründung |
|---|---|---|---|
| Ski-Opening | — | entschieden | Saisonaler Unterbegriff |
| Apreski-Party | — | entschieden | Saisonaler Unterbegriff |
| Starkbierfest | festzelt | empfohlen | Canon Festzelt; saisonal |
| Faschingsball | Fasching | empfohlen | Canon Fasching; saisonal |
| Inthronisationsball | Fasching | empfohlen | Canon Fasching; 2 Bands |
| Maibaumfest | festzelt | empfohlen | Canon Festzelt; saisonal; 1 Band |

### Venue-Kontext

| Wert | Übergeordnetes Thema | Status | Begründung |
|---|---|---|---|
| Biergarten | festzelt | entschieden | Unter festzelt |
| Zoigl | festzelt | entschieden | Regionaler Alias |
| Grottenfest | festzelt | entschieden | Regionaler Alias |

### Zielgruppe

| Wert | Übergeordnetes Thema | Status | Begründung |
|---|---|---|---|
| Familiennachmittage | geburtstag / Kinder- & Familienevent | entschieden | Doppelrolle |
| Kindergartenfest | Kinder- & Familienevent | entschieden | Feed für neue Themenwelt |
| Schulfest | Kinder- & Familienevent | entschieden | Feed für neue Themenwelt |

### Referenz

| Wert | Behandlung | Status | Begründung |
|---|---|---|---|
| Fernsehauftritt | Profil-Referenz/Trust-Signal | entschieden | Kein Buchungsanlass |
| Fernsehaufttritte | Profil-Referenz/Trust-Signal (Tippfehler) | entschieden | Identisch mit Fernsehauftritt; AT-Tippfehler |

**Warum diese Typen keine eigene `/veranstaltung/`-Seite bekommen:**
- Entweder tragen sie als Detailtypen zu einer übergeordneten Themenwelt bei (und erscheinen dort im Bandfilter)
- Oder sie beschreiben ein Aufführungsformat (Open Air, Konzert, Tanzveranstaltung), das keinen eigenständigen Buchungsanlass darstellt
- Oder ihre Bandzahl ist zu gering für eine eigenständige Landingpage (< 5 Bands)
- Oder sie sind regional/saisonal zu spezifisch für eine dauerhaft betriebene öffentliche Seite

---

## 6. Nicht-öffentliche Werte

Diese Werte werden bewusst nicht als öffentliche Themenwelten geführt.

| Wert | Typ-Klasse | Status | Begründung |
|---|---|---|---|
| Fernsehauftritt | Referenz | entschieden | Profil-Referenz, kein Buchungsanlass; Trust-Signal auf Bandprofil |
| Fernsehaufttritte | Referenz | entschieden | Tippfehler-Variante; gleiche Behandlung wie Fernsehauftritt |
| politische Veranstaltung | Anlass | entschieden | Außenwirkung des kuratierten Portals; nur intern taggen |
| Senioren60+ | Zielgruppe | entschieden | Zielgruppe, kein Anlass; Sprache passt nicht zu proudleut |
| Theater | Format | entschieden | Venue-/Format-Kontext; kein eigenständiger Buchungsanlass |
| Geistliche Anlässe | Anlass | entschieden | Mehrdeutig; auflösen; 1 AT-Band händisch zuordnen |
| Konzert | Format | empfohlen | `Konzert` ist auch `band_type` — semantische Überschneidung; kein klarer Buchungsanlass |
| Bar | Venue-Kontext | empfohlen | Nur 2–3 Bands; kein eigenständiger Buchungsanlass für Veranstalter |

---

## 7. Offene Streitfragen für die redaktionelle Runde

### 7.1 Fasching — Eigene saisonale Themenwelt oder interner Detailtyp?

**Wert:** Fasching (55 AT-Bands, 61 SB-Bands)

**Entscheidungsfrage:** Bekommt Fasching eine eigene `/veranstaltung/fasching`-Seite, oder bleibt es ein interner Saisontyp ohne öffentliche Seite?

**Option A — Eigene Themenwelt:**
- /veranstaltung/fasching als Landingpage
- Stärkste Band-Basis der noch nicht öffentlichen Typen (55 Bands)
- Klare saisonale Identität, gute SEO-Relevanz
- Bündelt Fasching + Faschingsball + Inthronisationsball als Detailtypen

**Option B — Interner Detailtyp:**
- Fasching bleibt intern getaggt, keine öffentliche Seite
- Bands für Fasching sind damit auf keiner Kategorie-Seite sichtbar

**Fachliche Konsequenz von B:** 55 Bands, die Fasching spielen, haben keine öffentliche Kategorie-Seite, auf der sie erscheinen.

**Technische Konsequenz von A:** Neuer CATEGORIES-Eintrag `fasching`; Supabase-Slug muss zu CATEGORIES passen.

---

### 7.2 Oktoberfest — Eigene Themenwelt oder Festzelt-Detailtyp?

**Wert:** Oktoberfest (36 AT-Bands)

**Entscheidungsfrage:** Bekommt Oktoberfest eine eigene `/veranstaltung/oktoberfest`-Seite, oder bleibt es Detailtyp unter Festzelt?

**Option A — Eigene Themenwelt:**
- /veranstaltung/oktoberfest mit starkem SEO-Potenzial
- Klare regionale Identität und internationale Bekanntheit

**Option B — Festzelt-Detailtyp:**
- Oktoberfest bleibt unter /veranstaltung/festzelt
- Einfacheres Routing; aber Potenzial ungenutzt
- SB-Datenbasis: aktuell nur 1 Band mit Supabase-Typ `oktoberfest` (Donnaweda)

**Fachliche Konsequenz:** Oktoberfest ist möglicherweise der stärkste SEO-Slug unter den noch nicht öffentlichen Typen.

**Technische Konsequenz von A:** Supabase-Slug `oktoberfest` muss für alle relevanten Bands gesetzt werden; neuer CATEGORIES-Eintrag.

---

### 7.3 Weihnachtsfeier — Eigene saisonale Themenwelt oder bleibt unter Firmenfeier?

**Wert:** Weihnachtsfeier (19 AT-Bands, 19 SB-Bands)

**Entscheidungsfrage:** Bekommt Weihnachtsfeier eine eigene Seite oder bleibt sie als Detailtyp unter Firmenfeier?

**Kontext:** Weihnachtsfeier ist aktuell in `lib/categories.ts` als airtableEventType unter `firmenfeier` eingetragen. Das bedeutet: Bands mit Weihnachtsfeier erscheinen auf /veranstaltung/firmenfeier. Aber: Weihnachtsfeier ist nicht automatisch eine Firmenfeier — sie kann privat, vereinlich, kirchlich oder städtisch sein.

**Option A — Bleibt unter firmenfeier:**
- Kein Code-Aufwand
- Bands erscheinen auf /veranstaltung/firmenfeier

**Option B — Eigene saisonale Themenwelt:**
- /veranstaltung/weihnachtsfeier
- Stärkeres SEO-Profil für den saisonalen Buchungsfall
- Saisonal eingrenzen (Oktober–Januar)

**Fachliche Konsequenz:** Wenn B: Weihnachtsfeier aus firmenfeier.airtableEventTypes entfernen und eigenen CATEGORIES-Eintrag anlegen.

---

### 7.4 Sommerfest — Eigene saisonale Themenwelt oder bleibt unter Firmenfeier?

**Wert:** Sommerfest (5 AT-Bands, 4 SB-Bands)

**Entscheidungsfrage:** Bekommt Sommerfest eine eigene Seite oder bleibt es unter Firmenfeier?

**Kontext:** Gleiche Logik wie Weihnachtsfeier — Sommerfest kann privat, vereinlich oder städtisch sein. Bandbasis (5) ist deutlich kleiner als Weihnachtsfeier (19).

**Option A — Bleibt unter firmenfeier:** Status quo, kein Aufwand.

**Option B — Eigene saisonale Themenwelt:** /veranstaltung/sommerfest; Bandbasis klein, aber SEO denkbar.

**Empfehlung:** Abhängig von Entscheidung zu 7.3 — wenn Weihnachtsfeier eine eigene Seite bekommt, ist Sommerfest ein logischer nächster Schritt; wenn nicht, bleibt Sommerfest unter firmenfeier.

---

### 7.5 Festival — Eigene Format-Themenwelt oder interner Detailtyp?

**Wert:** Festival (29 AT-Bands, 29 SB-Bands)

**Entscheidungsfrage:** Bekommt Festival eine eigene `/veranstaltung/festival`-Seite?

**Besonderheit:** Festival ist ein Format-Typ, kein klassischer Anlasstyp. Veranstalter suchen eher nach „Band für Festival" als nach einem Anlass. Ob das SEO-Relevanz hat, hängt davon ab, ob Festivalveranstalter tatsächlich auf proudleut.com suchen.

**Option A — Eigene Themenwelt:** /veranstaltung/festival; 29 Bands wären eine solide Basis.

**Option B — Interner Detailtyp:** Festival bleibt intern; Bands erscheinen auf keiner öffentlichen Kategorieseite.

**Fachliche Konsequenz von B:** 29 Bands (größere Gruppe als Club, Benefizveranstaltung, Vernissage zusammen) ohne öffentliche Seite.

---

### 7.6 Kirchweih / Volksfest — Eigene Themenwelten oder Festzelt-Detailtypen?

**Werte:** Kirchweih (54 AT-Bands), Volksfest (53 AT-Bands)

**Entscheidungsfrage:** Bekommen Kirchweih und/oder Volksfest eigene Seiten, oder bleiben sie Festzelt-Detailtypen?

**Kontext:** Beide haben sehr hohe AT-Bandmengen (54/53), aber die AT-Zahlen entstehen durch das Canon-Mapping: Bands, die „Kirchweih" oder „Volksfest" in AT haben, wurden in Supabase unter „Festzelt" zusammengefasst. In Supabase hat Kirchweih nur 1 Band, Volksfest nur 1 Band.

**Option A — Eigene Themenwelten:**
- Starke inhaltliche Eigenständigkeit (Kirchweih ≠ Festzelt ≠ Volksfest)
- Erfordert: Supabase-Daten befüllen (heute nur 1 Band je Typ)

**Option B — Unter Festzelt:**
- Einfacher; bestehende /veranstaltung/festzelt deckt diese Fälle ab

**Fachliche Konsequenz:** Vor einer eigenen Seite müsste die SB-Datenbasis aufgebaut werden.

---

### 7.7 Trauerfeier & Zeremonie — Wann startet der separate Sprint?

**Kontext:** Entschieden: Beerdigung wird zu Trauerfeier & Zeremonie (behutsamere Umbenennung). Explizit aus Block 3A ausgeschlossen. Kein Timing entschieden.

**Entscheidungsfrage:** Wann wird der separate Sprint für Trauerfeier & Zeremonie gestartet? Was sind die Voraussetzungen?

**Fachliche Konsequenz:** Bis dahin erscheinen Bands mit Beerdigung auf keiner öffentlichen Kategorie-Seite.

---

## 8. Technische Architektur-Optionen

Kein Vorschlag wird hier als Entscheidung formuliert. Nur Optionenvergleich.

### Option A — `event_groups` / öffentliche Themenwelt-Tabelle

**Idee:** Neue Supabase-Tabelle `event_groups` (oder `public_themes`). Jeder `event_type` bekommt eine optionale `event_group_id`-Spalte. Das Public Frontend liest Themenwelten aus Supabase statt aus `lib/categories.ts`.

**Vorteile:**
- Themenwelten redaktionell im Admin pflegbar — kein Code-Deploy für neue Seiten nötig
- Klare Trennung: öffentliche Themenwelt vs. interner Detailtyp ist explizit modelliert
- Chip-Links auf Detailseiten können direkt auf `event_group.slug` abbilden — kein Guard nötig
- Skalierbar: beliebig viele Themenwelten ohne Code-Änderung

**Nachteile:**
- Neue Tabelle, neue Migration, neues Admin-UI
- `lib/categories.ts` muss vollständig refactored werden
- ISR-Caching für Themenwelten muss bedacht werden (heute statisch, dann Supabase-Abfrage)
- Höchster Umsetzungsaufwand aller drei Optionen

**Auswirkung auf Admin:** Neue Verwaltungsseite für Themenwelten; event_type-Bearbeitungsseite braucht `event_group`-Dropdown.

**Auswirkung auf Public Frontend:** `generateStaticParams` liest Slugs aus Supabase; `CATEGORIES` entfällt; Chip-Links über `event_type.event_group.slug`.

---

### Option B — Mapping `event_type_slug → public_category_slug`

**Idee:** Neue Spalte auf `event_types`: `public_category_slug text`. Jeder Supabase-Typ kann optional einem öffentlichen CATEGORIES-Slug zugeordnet werden. `normalizeBand` nutzt dieses Mapping für `categorySlugs`.

**Vorteile:**
- Kein neuer Seitentyp; CATEGORIES bleibt die Routing-Wahrheit
- Chip-Links werden präzise: der `public_category_slug` ist direkt verknüpft
- Kein komplexes `getCategoryBySlug()`-Guard mehr nötig
- Einfachste Schema-Erweiterung (eine Spalte)

**Nachteile:**
- Themenwelten bleiben in `lib/categories.ts` hartcodiert — jede neue Themenwelt braucht Code-Deploy
- Lose Kopplung: Mapping muss manuell gepflegt werden
- Admin: neues Feld pro event_type setzen; Pflege-Overhead
- Supabase-Slugs und CATEGORIES bleiben zwei separate Welten

**Auswirkung auf Admin:** Neues Feld `public_category_slug` im event_type-Edit; optionales Dropdown mit CATEGORIES-Slugs.

**Auswirkung auf Public Frontend:** `normalizeBand` baut `categorySlugs` aus `public_category_slug` statt aus `event_type.slug`; Guard `getCategoryBySlug()` entfällt.

---

### Option C — Weiterführung von `lib/categories.ts` als öffentliche Ebene

**Idee:** Status quo behalten. Neue Themenwelten entstehen durch PR in `lib/categories.ts` + Code-Deploy. Kein DB-Aufwand.

**Vorteile:**
- Kein DB-Aufwand, kein neues Admin-UI, kein Migrations-Aufwand
- Schnell: neue Themenwelt durch einen PR in einer Datei
- Bewährt für die 5 bestehenden Themenwelten

**Nachteile:**
- Jede neue Themenwelt braucht Code-Change + Deploy — nicht redaktionell pflegbar
- Supabase-Slugs und CATEGORIES bleiben dauerhaft nicht synchronisiert
- Chip-Links auf Detailseiten brauchen defensiven Guard (heute `getCategoryBySlug()`)
- Derzeit haben nur 2 von 5 CATEGORIES-Slugs einen Supabase-Gegenstück-Match
- Mit jeder neuen Themenwelt wächst das Mapping-Delta zwischen CATEGORIES und Supabase

**Technische Schulden:** Der Chip-Link-Guard in `BandTagsSection.tsx` ist eine Notlösung für das Slug-Mismatch-Problem, das Option C strukturell nicht löst.

---

## 9. Offene Fragen / nicht aus Code belegbar

Folgende Punkte sind aus dem Repo allein nicht klärbar und erfordern eine aktuelle Supabase-Abfrage oder eine redaktionelle Entscheidung:

1. **Genaue Bandbasis für Fasching in Supabase:** Matrixbefund: 61 SB-Bands. Welche konkreten Bands und ob alle mit korrekten AT-Slugs verknüpft sind: nicht ohne Abfrage klärbar.

2. **Finaler Slug für Trauerfeier & Zeremonie:** `trauerfeier-und-zeremonie` ist der naheliegende Slug, aber kein belegter Entscheidungsstand aus dem Repo.

3. **Reihenfolge der neuen Themenwelten:** Sollen Club, Benefizveranstaltung, Vernissage, Kinder- & Familienevent gleichzeitig oder sequenziell eingeführt werden? Kein belegter Stand.

4. **Architektur-Entscheidung (Abschnitt 8):** Welche der drei Optionen umgesetzt wird, ist vollständig offen — keine Vorentscheidung im Repo.

5. **Weihnachtsfeier / Sommerfest:** Ob und wann sie aus `firmenfeier.airtableEventTypes` entfernt werden, ist nicht entschieden.

6. **Festzelt-Granularität in Supabase:** Ob Kirchweih, Volksfest, Dult, Gründungsfest, Oktoberfest als eigenständige SB-Typen langfristig befüllt oder zu Festzelt konsolidiert werden (Matrixbefund Sec. 5.1).

7. **Geistliche Anlässe — welche Band?** Die 1 AT-Band (Blechhilfswerk) muss händisch einem bestehenden Typ (Trauerfeier & Zeremonie, Hochzeit oder Taufe) zugeordnet werden. Welchem? Nicht aus Code klärbar.

---

## 10. Nächste sinnvolle Schritte

Nur Empfehlungen — keine Umsetzung in diesem Dokument.

1. **Xandi prüft Abschnitt 7** — alle offenen Streitfragen werden redaktionell entschieden.
2. **Priorität klären:** Welche neuen Themenwelten kommen zuerst (Runde 1: Block 3A; Runde 2: Fasching, Weihnachtsfeier, Oktoberfest, ...)?
3. **Architektur-Entscheidung treffen (Abschnitt 8)** — Option A, B oder C als technische Basis für alle künftigen Themenwelten festlegen.
4. **Erst nach Architektur-Entscheidung:** Block 3A umsetzen (Club, Benefizveranstaltung, Vernissage, Kinder- & Familienevent).
5. **Trauerfeier & Zeremonie** als separaten Sprint einplanen — Timing festlegen.
6. **Geistliche Anlässe** händisch auflösen (1 Band, Airtable-Zuordnung prüfen).
7. **Festzelt-Granularität** entscheiden (Abschnitt 9, Punkt 6) — Grundlage für Kirchweih/Volksfest/Oktoberfest als spätere Themenwelten.

---

*Entscheidungsvorlage abgeschlossen — keine Schreiboperationen, keine DB-Verbindungen, kein Commit.*
