# Event-Type-Redaktionsentscheidungen

## 1. Kontext

Dieses Dokument ist Phase 2 und baut auf dem Analysebericht [`docs/analysebericht-event-type-matrix.md`](analysebericht-event-type-matrix.md) auf. Der Analysebericht beschreibt den Ist-Zustand der Event-Type-Taxonomie in Airtable und Supabase. Dieses Dokument hält redaktionelle Entscheidungen des Betreibers fest und enthält noch keine technische Umsetzung.

---

> **Update 2026-06-13:** Die Entscheidung zu `Trauerfeier & Zeremonie` wurde verfeinert. Der Typ ist keine Bündelung von `Beerdigung` und `Geistliche Anlässe` mehr, sondern eine behutsamere Umbenennung von `Beerdigung`. `Geistliche Anlässe` wird wegen Mehrdeutigkeit aufgelöst und je nach konkretem Fall bestehenden Typen wie `Trauerfeier & Zeremonie`, `Hochzeit` oder `Taufe` zugeordnet.

---

## 2. Getroffene Entscheidungen — neue öffentliche Event-Types

| Neuer Event-Type | Gebündelte / zugeordnete AT-Begriffe | Begründung |
|---|---|---|
| Kinder- & Familienevent | Familiennachmittage, Kindergartenfest, Schulfest | Diese Begriffe beschreiben verwandte kind- und familienbezogene Veranstaltungskontexte. Öffentlich ist ein gemeinsamer, verständlicher Event-Type klarer als mehrere kleinteilige Einzelbegriffe. |
| Trauerfeier & Zeremonie | Beerdigung | `Trauerfeier & Zeremonie` ist die behutsamere öffentliche Benennung für `Beerdigung`. Der Begriff ist menschlicher und lässt auch Raum für weltliche Trauerfeiern, nicht nur kirchliche Beerdigungen. Es handelt sich nicht mehr um eine Bündelung, sondern um eine Umbenennung mit verbessertem Tonfall. |
| Benefizveranstaltung | Benefizveranstaltung | Benefizveranstaltung ist ein klar verständlicher Anlass und kann für Vereine, Städte, soziale Projekte und öffentliche Veranstalter relevant sein. |
| Vernissage | Vernissage | Vernissage beschreibt einen eigenständigen Kultur- und Galeriekontext und ist als Buchungssituation verständlich. |
| Club | Club | Club wird öffentlich geführt, aber als Venue-/Format-Kontext verstanden. Der Begriff beschreibt weniger einen klassischen Anlass als eine konkrete Auftrittssituation. |

---

## 3. Getroffene Entscheidungen — kein öffentlicher Event-Type

| Begriff | Behandlung | Begründung |
|---|---|---|
| Fernsehauftritt / Fernsehaufttritte | Profil-Referenz / Trust-Signal, kein Event-Type | Fernsehauftritt ist kein Buchungsanlass, sondern eine Referenz bzw. ein Vertrauenssignal im Bandprofil. Die Behandlung als Profil-Referenz löst zugleich den bestehenden Airtable-Split zwischen `Fernsehauftritt` und dem Tippfehler `Fernsehaufttritte`. |
| politische Veranstaltung | Nur intern taggen, nicht öffentlich als Event-Type führen | Der Begriff kann für interne Einschätzung relevant sein, soll aber wegen der Außenwirkung eines kuratierten Portals nicht als öffentlicher Filter oder öffentlicher Event-Type geführt werden. |
| Senioren60+ | Kein öffentlicher Event-Type | Der Begriff beschreibt eher eine Zielgruppe als einen Anlass. Zudem wirkt die Bezeichnung öffentlich sperrig und wenig passend für die proudleut-Sprache. |
| Theater | Kein eigener öffentlicher Event-Type | Theater wird eher als Venue- oder Format-Kontext verstanden, nicht als eigenständiger Buchungsanlass. |
| Geistliche Anlässe | Auflösen, kein eigener öffentlicher Event-Type | `Geistliche Anlässe` ist mehrdeutig und kann je nach konkretem Anlass in unterschiedliche bestehende Typen fallen, insbesondere `Trauerfeier & Zeremonie`, `Hochzeit` oder `Taufe`. Der Begriff wird daher nicht als eigener öffentlicher Event-Type geführt. Vorhandene Zuordnungen werden einzeln/händisch geprüft und passend zugeordnet. In Supabase hat `Geistliche Anlässe` aktuell 0 Zuordnungen; in Airtable betrifft es eine Band, die einzeln geprüft wird. |

---

## 4. Getroffene Entscheidungen — Aliase / Unterbegriffe

| Begriff | Behandlung | Notiz |
|---|---|---|
| Zoigl | Alias / regionaler Unterbegriff, vorerst kein eigener öffentlicher Filter | Zoigl ist regional relevant und bereits in `lib/categories.ts` referenziert. Bei einer späteren Supabase-Migration muss geklärt werden, ob Zoigl Alias, Detailtyp oder eigener Event-Type wird. |
| Grottenfest | Alias / regionaler Unterbegriff, vorerst kein eigener öffentlicher Filter | Grottenfest ist ein regionaler Spezialfall und ebenfalls in `lib/categories.ts` referenziert. Bei einer späteren Supabase-Migration muss die Behandlung geklärt werden. |
| Ski-Opening | Saisonaler Unterbegriff, vorerst kein eigener öffentlicher Filter | Ski-Opening bleibt als saisonaler Spezialfall vorgemerkt, wird aber nicht als eigener Haupttyp geführt. |
| Après-Ski-Party | Saisonaler Unterbegriff, vorerst kein eigener öffentlicher Filter | Après-Ski-Party bleibt als saisonaler Spezialfall vorgemerkt, wird aber nicht als eigener Haupttyp geführt. |

---

## 5. Architektur-Richtung — vorbereitet, nicht entschieden, nicht gebaut

Festzelt-Detailtypen wie Dult, Kirchweih, Volksfest, Oktoberfest und Gründungsfest bleiben erhalten und sollen perspektivisch ausgebaut werden. Der Festzelt-Cluster ist ein Beleg dafür, dass proudleut mit Oberbegriffen und darunter liegenden Detailtypen arbeitet.

„Kinder- & Familienevent" ist eine echte Bündelung mehrerer kleinteiliger AT-Begriffe unter einem gemeinsamen öffentlichen Typ. „Trauerfeier & Zeremonie" ist keine Bündelung, sondern eine behutsamere Umbenennung von „Beerdigung". „Geistliche Anlässe" zeigt als mehrdeutiger Alttyp, dass einzelne Begriffe aufgelöst und je nach Fall bestehenden Typen zugeordnet werden müssen. „Club" zeigt, dass manche Werte eher Venue-/Format-Kontext sind und nicht sauber in eine flache Event-Type-Liste passen.

Diese Beobachtungen motivieren eine spätere Struktur mit Gruppierungsebene (z. B. `event_groups`). Diese Architektur ist noch nicht entschieden und wird nicht in diesem Dokument umgesetzt. Kein Tabellenmodell, kein SQL, keine Spaltenliste, kein Schemavorschlag in diesem Dokument.

---

## 6. Offene Punkte

- Konkrete finale Benennung und Slugs der neuen öffentlichen Event-Types.
- Ob und wann Festzelt-Detailtypen über Donnaweda hinaus aktiv befüllt werden.
- Wie Alias-/Detailtypen technisch modelliert werden.
- Wie Oberbegriffe, Detailtypen, Aliase und Venue-/Format-Kontexte später voneinander getrennt werden.
- Migrations- und Umsetzungsfragen generell.
- Ob die spätere Architektur in einem eigenen Sprint vorbereitet wird.
- Händische Prüfung der bisherigen `Geistliche Anlässe`-Zuordnung aus Airtable (1 Band, einzeln zu klären).
- Spätere Entscheidung, wie mehrdeutige Alttypen dokumentiert oder technisch als Aliase/Altbegriffe behandelt werden.
