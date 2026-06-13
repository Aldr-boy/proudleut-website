# Event-Type-Redaktionsentscheidungen

## 1. Kontext

Dieses Dokument ist Phase 2 und baut auf dem Analysebericht [`docs/analysebericht-event-type-matrix.md`](analysebericht-event-type-matrix.md) auf. Der Analysebericht beschreibt den Ist-Zustand der Event-Type-Taxonomie in Airtable und Supabase. Dieses Dokument hält redaktionelle Entscheidungen des Betreibers fest und enthält noch keine technische Umsetzung.

---

## 2. Getroffene Entscheidungen — neue öffentliche Event-Types

| Neuer Event-Type | Gebündelte / zugeordnete AT-Begriffe | Begründung |
|---|---|---|
| Kinder- & Familienevent | Familiennachmittage, Kindergartenfest, Schulfest | Diese Begriffe beschreiben verwandte kind- und familienbezogene Veranstaltungskontexte. Öffentlich ist ein gemeinsamer, verständlicher Event-Type klarer als mehrere kleinteilige Einzelbegriffe. |
| Trauerfeier & Zeremonie | Beerdigung, Geistliche Anlässe | Diese Begriffe gehören in eine sensible Welt rund um Trauer, Kirche und Zeremonie. Öffentlich soll hier ein behutsamer gemeinsamer Begriff geführt werden, statt Nutzer zwischen kleinteiligen oder harten Einzelbegriffen wählen zu lassen. |
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

Festzelt-Detailtypen wie Dult, Kirchweih, Volksfest, Oktoberfest und Gründungsfest bleiben erhalten und sollen perspektivisch ausgebaut werden.

Die beschlossenen Bündelungen „Kinder- & Familienevent" und „Trauerfeier & Zeremonie" sowie die implizite Oberwelt „Festzelt & Volksfest" zeigen, dass proudleut künftig mit Oberbegriffen, Detailtypen und Alias-/Unterbegriffen arbeiten sollte. Auch „Club" zeigt, dass manche Werte eher Venue-/Format-Kontext sind und nicht sauber in eine flache Event-Type-Liste passen.

Diese Beobachtungen motivieren eine spätere Struktur mit Gruppierungsebene (z. B. `event_groups`). Diese Architektur ist noch nicht entschieden und wird nicht in diesem Dokument umgesetzt. Kein Tabellenmodell, kein SQL, keine Spaltenliste, kein Schemavorschlag in diesem Dokument.

---

## 6. Offene Punkte

- Konkrete finale Benennung und Slugs der neuen öffentlichen Event-Types.
- Ob und wann Festzelt-Detailtypen über Donnaweda hinaus aktiv befüllt werden.
- Wie Alias-/Detailtypen technisch modelliert werden.
- Wie Oberbegriffe, Detailtypen, Aliase und Venue-/Format-Kontexte später voneinander getrennt werden.
- Migrations- und Umsetzungsfragen generell.
- Ob die spätere Architektur in einem eigenen Sprint vorbereitet wird.
