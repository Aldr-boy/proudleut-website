# Klingt-nach-Kuration — laufendes Protokoll

Dauerhafte, fortführbare Dokumentation der fachlichen Mood-Kuration
für den „Klingt nach"-Rollout. Diese Datei wird nach jeder Runde
ergänzt, nicht überschrieben.

## Kopfstand

- Fertig vor Runde 1 (Donnaweda + Batch 1): **15 von 141**
- In Runde 1 final freigegeben: **29 Bands**
- Fachlicher Zwischenstand nach Runde 1: **44 von 141**
- In Runde 2 final freigegeben: **31 Bands**
- Fachlicher Zwischenstand nach Runde 2: **75 von 141**
- Weiterhin offen nach Runde 2: **66**

Hinweis: „fachlich freigegeben" bedeutet, dass die Mood-Zuordnung
kuratiert und dokumentiert ist. Es ist keine Aussage über einen
bereits erfolgten Production-Import — dieser erfolgt gesondert je
Batch (siehe `supabase/band_moods_*`).

---

## Kurationstabelle

Die Mood-Spalten (1–4) bilden bereits die spätere
`band_moods.sort_order`-Priorität ab (Mood 1 = sort_order 1 usw.).
Nicht benötigte Mood-Spalten bleiben leer.

| Runde | Band | Mood 1 | Mood 2 | Mood 3 | Mood 4 | Sicherheit | Entscheidungs- und Begründungsvermerk |
|---|---|---|---|---|---|---|---|
| 1 | 5toBeat | Tanzflächen-Garantie | Festlich und ausgelassen | | | hoch | „Tanzfläche im Fokus"; „Elegant aber ausgelassen" |
| 1 | A96 Musikanten | Festzeltenergie | | | | hoch | „Festzeltenergie pur"; „Frech" ohne Dialekt-Bezug nicht in Bayerisch & frech übersetzt |
| 1 | Aufzundn | Festzeltenergie | Mitsing-Faktor | Authentisch und handgemacht | | hoch | „Bierzelt"; „Mitsinggarantie"; „Echte Spielfreude spürbar" |
| 1 | Bayrisch Blau | Herzlich & nahbar | | | | mittel | „Wirtshausgemütlichkeit"; „Bayerisch & stolz drauf" bewusst nicht übersetzt (fehlendes Frech-/Schmäh-Signal) |
| 1 | Best-of-Band | Festzeltenergie | Tanzflächen-Garantie | | | hoch | „Festzeltenergie pur"; „Tanzfläche immer voll". Party pur gestrichen (Feier-Cluster-Limit, Xandi-Entscheidung) |
| 1 | Birddogs | Tanzflächen-Garantie | Generationenverbindend | Authentisch und handgemacht | | hoch | Alle drei wörtlich/direkt im Text |
| 1 | Blechstreet Boys | Festzeltenergie | | | | hoch | „Festzelt-Energie"; „Blechpower"/„Brass-Wumms" bewusst nicht übersetzt (Brass-Power = STEINBACH-Sonderfall) |
| 1 | Böhmisches Verlangen | Festzeltenergie | Authentisch und handgemacht | | | hoch | „Festzeltenergie mit Klasse"; „Handwerk statt Show" |
| 1 | Bretterboden | Festzeltenergie | | | | hoch | „Bierzelt trifft Saal"; „mitreißend" allein nicht übersetzt |
| 1 | Breznsalzer | Festzeltenergie | Mitsing-Faktor | | | hoch | „Zeltfest-Energie"; „Mitsingen Pflicht" |
| 1 | Broadway | Tanzflächen-Garantie | Konzertant & hochwertig | Generationenverbindend | | mittel | „Tanzbar"; „Elegant ohne Bierzelt" (Distanz zu Festzelt); „Generationen auf einer Tanzfläche" |
| 1 | Campfire | Festzeltenergie | Generationenverbindend | | | hoch | „Festzelt-Energie"; „Jung & Alt zusammen"; „Publikum auf der Bühne" bewusst nicht übersetzt (zeigt auf ausgeschlossenen Mood Publikumsnähe) |
| 1 | Candy Tunes | Tanzflächen-Garantie | Generationenverbindend | | | hoch | „Tanzflächen-Fokus"; „Generationsübergreifend" |
| 1 | Cherry Pink | Tanzflächen-Garantie | Party pur | | | hoch | „Tanzfläche bleibt voll"; „Gaudi" |
| 1 | Claudia und Ralf | Herzlich & nahbar | | | | hoch | wörtlicher Mood-Name im Text |
| 1 | Czech Aut | Herzlich & nahbar | | | | hoch | „Herzlich"; „mitreißend" allein nicht übersetzt |
| 1 | d'Hundskrippln | Rockig & mitreißend | Authentisch und handgemacht | | | mittel | „Rockkeller"/„Alpenrock" = explizites Rock-Signal; „Eigene Songs statt Coverkatalog" |
| 1 | d'Rieder | Festzeltenergie | Party pur | | | mittel | „Zünftig"; „Partyband"/„Partynacht" |
| 1 | d'Zechpreller | Festzeltenergie | Tanzflächen-Garantie | | | hoch | „Festzelt trifft Tanzfläche". Party pur gestrichen (Feier-Cluster-Limit, Xandi-Entscheidung) |
| 1 | De Gaudimacha | Bayerisch & frech | Festzeltenergie | Tanzflächen-Garantie | | hoch | „Boarisch durch und durch"; „Bierzelt trifft Tanzfläche". Party pur gestrichen (Feier-Cluster-Limit, Xandi-Entscheidung, neue Präzedenzregel begründet) |
| 1 | De Zwiadn | Festzeltenergie | Bayerisch & frech | Mitsing-Faktor | Party pur | hoch | „Bierzelt-Energie"; „Boarisch"; „Mitgrölen"; „Gaudi statt Glamour" |
| 1 | des Brassd scho! | Festzeltenergie | Authentisch und handgemacht | | | mittel | „Zünftig"; „Spielfreude"; „Blech mit Druck" (Brass-Power) bewusst nicht übersetzt |
| 1 | Dezent Böhmisch | Festzeltenergie | Generationenverbindend | | | hoch | „Festzeltenergie"; „Generationsübergreifend"; „Blechpower" bewusst nicht übersetzt |
| 1 | Die Gseea Wepsn | Festzeltenergie | Generationenverbindend | Party pur | | hoch | „Festzeltenergie pur"; „Generationsübergreifend"; „Bänke-Steh-Garantie" |
| 1 | Die Haumdaucher | Festzeltenergie | Party pur | | | hoch | „Festzeltenergie pur"; „Bayerische Partywut" |
| 1 | Die Lausbuba | Festzeltenergie | Bayerisch & frech | Mitsing-Faktor | | hoch | „Festzeltenergie pur"; „Bayerisch" (Phrase 2) + „Frech" (Phrase 4) — Dialekt- und Schmäh-Signal aus getrennten Phrasen desselben Texts, gemäß neuer Präzedenzregel zulässig |
| 1 | Die Ottis | Festzeltenergie | Authentisch und handgemacht | | | hoch | „Festzeltenergie pur"; „Alles live kein Playback" |
| 1 | Die WoidRocker | Party pur | | | | hoch | „Feiern bis in die Nacht"; „Publikum mittendrin" bewusst nicht übersetzt. Kein Rockig & mitreißend — Bandname allein ist kein ausreichendes Rock-Signal (Xandi-Entscheidung, neue Präzedenzregel) |
| 1 | Donikkl Crew | Mitsing-Faktor | Generationenverbindend | | | hoch | „Mitsingen statt zuschauen"; „ganze Familie" |
| 2 | Edelwuid | Tanzflächen-Garantie | Festlich und ausgelassen | Emotional & berührend | | hoch | „Tanzfläche ab erster Minute"; „Mal edel mal ausgelassen"; „Emotionale Hochzeitsmomente" |
| 2 | Ennstal Kryner | Mitsing-Faktor | Tanzflächen-Garantie | Festlich und ausgelassen | | mittel | „Mitsingen und Mittanzen"; „Gemütlich bis ausgelassen" |
| 2 | Entprima Live | Tanzflächen-Garantie | Authentisch und handgemacht | | | mittel | „Tanzfläche..."; „Stimmung statt Showeffekte" |
| 2 | extra … die Band! | Festzeltenergie | Tanzflächen-Garantie | | | hoch | „Bierzelt trifft Tanzfläche"; „Bayerisch & mitreißend" nicht übersetzt (kein Schmäh-Signal, „mitreißend" allein reicht nicht) |
| 2 | Foxy Gentlemen | Tanzflächen-Garantie | Generationenverbindend | | | hoch | „Tanzflächen-Energie"; „Generationsübergreifend" |
| 2 | Free Vocals | Emotional & berührend | Konzertant & hochwertig | | | hoch | „Gänsehaut ohne Instrumente" (wörtlich); „Stimmgewalt pur" |
| 2 | Freunde des Brautpaares | Lagerfeuer-Atmosphäre | Authentisch und handgemacht | Herzlich & nahbar | | mittel | „Akustische Nähe statt Show"; „Freundschaft hörbar gemacht" |
| 2 | Froschenkapelle | Festzeltenergie | Party pur | | | mittel | „Festzeltenergie mit Bläserpower" (Bläserpower nicht übersetzt); „Anarchisch gute Laune" |
| 2 | Froschhaxn Express | Festzeltenergie | | | | hoch | „Festzeltenergie pur"; „Bayerisch & jung" nicht übersetzt (kein Schmäh-Signal); „mitreißend" allein nicht übersetzt |
| 2 | Gary Rhos | Lagerfeuer-Atmosphäre | Konzertant & hochwertig | | | hoch | „Entspannte Gitarren-Atmosphäre"; „Smooth & instrumental" |
| 2 | Gaudinockerl | Bayerisch & frech | Authentisch und handgemacht | | | hoch | „Bairisch frech & ehrlich" (Dialekt+Schmäh in derselben Phrase) |
| 2 | Gaudinudln | Festzeltenergie | Generationenverbindend | | | hoch | „Festzeltenergie pur"; „Generationsübergreifend" |
| 2 | Gentle | Rockig & mitreißend | | | | hoch | „Old-School-Rockenergie" (explizites Rock-Signal) |
| 2 | Geraldino | Mitsing-Faktor | Generationenverbindend | | | mittel | „Kinder zum Mitmachen animieren"; „Familientauglich" |
| 2 | GetThat! | Festzeltenergie | | | | hoch | „Bierzelt-Energie pur"; „Von Alm bis Dancefloor" nicht übersetzt (Range-Marketing) |
| 2 | Grögötz Weißbir | Festzeltenergie | Generationenverbindend | | | hoch | „Festzeltenergie mit Heimatgefühl"; „Generationsübergreifend" |
| 2 | Hally Gally | Festzeltenergie | Party pur | | | hoch | „Festzeltenergie"; „Mittelfränkische Partystimmung". „Publikumsnähe" wörtlich im Text, bewusst nicht übernommen (ausgeschlossener Mood) |
| 2 | Harmonic Brass | Konzertant & hochwertig | | | | hoch | „Klassik auf Weltniveau" — alle vier Phrasen bestätigen denselben Mood, kein Ausgelassen-Signal |
| 2 | Hatphones | Authentisch und handgemacht | | | | mittel | „Herzblut statt Hochglanz" |
| 2 | Heartline | Party pur | | | | hoch | „Volksmusik trifft Partynacht"; „Vom Dinner bis zum Dancefloor" nicht übersetzt (Range-Marketing) |
| 2 | Heimatfieber | Festzeltenergie | Party pur | | | hoch | „Festzeltenergie"; „Heimat trifft Party" |
| 2 | Heimatg'fühl | Party pur | | | | hoch | „Bayerisch trifft Partynacht"; Range-Phrase „Vom Sektempfang zur Tanzfläche" nicht übersetzt |
| 2 | Herb'n Beets | Festzeltenergie | Party pur | | | hoch | „Festzeltenergie pur"; „Vollgas von Anfang an" |
| 2 | Hertz7 - Die Band | Tanzflächen-Garantie | Rockig & mitreißend | Authentisch und handgemacht | | mittel | „Tanzfläche bleibt nicht leer"; „Groove mit Druck" (Druck = Signalwort aus der Mood-Definition); „Spielfreude die ansteckt". „Bläser die mitreißen" nicht übersetzt (Brass-Power) |
| 2 | Hob Nou | Festzeltenergie | Rockig & mitreißend | Generationenverbindend | | hoch | „Festzelt trifft Rockbühne"; „Jung und Alt gemeinsam" |
| 2 | Hochzeitssängerin MIT HERZ | Lagerfeuer-Atmosphäre | Herzlich & nahbar | | | hoch | „Intime Klaviermomente"; „Persönlich statt unpersönlich" |
| 2 | Hulzstoussboum | Mitsing-Faktor | Authentisch und handgemacht | | | mittel | „Schunkeln & Mitsingen"; „Oberpfälzer Ursprünglichkeit". „Publikum wird Teil der Band" nicht übersetzt (Publikumsnähe) |
| 2 | James Band | Tanzflächen-Garantie | Festzeltenergie | Mitsing-Faktor | | hoch | „Tanzfläche ab der ersten Minute"; „Festzeltenergie"; „Mitsingen garantiert". „Publikumsnah" nicht übersetzt |
| 2 | Jive | Tanzflächen-Garantie | Generationenverbindend | | | hoch | „Biergarten trifft Tanzfläche"; „Jung und Alt auf einer Tanzfläche" |
| 2 | Kasplattnrocker | Festzeltenergie | Party pur | | | hoch | „Festzeltenergie pur"; „Partystimmung ohne Filter". Bandname „...rocker" bewusst NICHT als Rock-Signal gewertet (Präzedenzregel, konsistent mit Die WoidRocker) |
| 2 | Katharina Kornprobst | Festzeltenergie | | | | hoch | „Bayerisches Festzelt". Kein Festlich und ausgelassen — Bogen-Lesart über den Gesamttext als allgemeine Regel abgelehnt, es bleibt bei expliziten Einzelsignalen |

---

## Fachlich geprüft, weiterhin offen

Diese Bands wurden in Runde 1 inhaltlich geprüft, erhalten aber
bewusst noch keine finale Mood-Zuordnung. Sie werden in künftigen
Runden nicht erneut in die reguläre Auswahl gemischt, sondern bleiben
in dieser zentralen Liste, bis eine gesonderte Entscheidung erfolgt.

- **Bigband STEINBACH** — besitzt bereits Production-`band_moods`
  (Tanzflächen-Garantie, Konzertant & hochwertig, Festlich und
  ausgelassen, Brass-Power, `sort_order` durchgehend 0). Fachlich
  offen: „Festlich und ausgelassen" hat im aktuellen `Klingt_Nach`
  keine klare Textstütze; Brass-Power ist als Sonder-Mood bekannt und
  bleibt Übergangsfall bis Paket D. Wird am Ende gemeinsam entschieden
  (möglicher Zusammenhang mit einer späteren Repertoire- oder
  Katalogentscheidung). Bis dahin keine Production-Änderung, keine
  vorläufige Neusortierung.
- **Blechhilfswerk** — kein Treffer im 13er-Katalog. Siehe
  Kataloglücken-Kandidaten unten für das dokumentierte Profil.
- **Duanix Musi** — Text überwiegend poetisch-atmosphärisch
  („Bajuwarische Urgewalt", „Trad mit Schmiss", „Chiemgau-Energie").
  „Tanzlmusi" allein gilt nicht als belastbarer Nachweis für
  Tanzflächen-Garantie. Bei der Gesamtreview ggf. weitere belastbare
  Bandinformationen außerhalb des `Klingt_Nach`-Texts hinzuziehen.
- **Hochdruck Böhmische** — Text verweist ausschließlich auf
  ausgeschlossene bzw. Übergangs-Moods (Tradition, Brass-Power).
  Keine Mood-Zuordnung erzwungen, als Kataloglücken-Kandidat
  dokumentiert (siehe unten).

---

## Kataloglücken-Kandidaten

Fortlaufende Liste von Bands, deren Airtable-Text auf eine
möglicherweise fehlende Mood im 13er-Katalog hindeutet. Erst nach
allen vier Runden bewerten, ob sich daraus ausreichend Evidenz für
eine zusätzliche Mood ergibt.

- **Hochdruck Böhmische** — Text verweist ausschließlich auf
  ausgeschlossene bzw. Übergangs-Moods (Tradition, Brass-Power).
- **Blechhilfswerk** — Profil: böhmischer Blechklang, kirchlich und
  festlich, Jazz-Einschlag, junges Blasmusikgefühl. Kein Treffer im
  13er-Katalog.

**Zusätzlicher Hinweis (kein eigenständiger Kataloglücken-Fall):**
**Katharina Kornprobst** liefert mit „Kirchlich bis festlich | Feierliche
Nähe | Bayerisches Festzelt" ein weiteres Indiz für ein wiederholt im
Bestand auftretendes kirchlich-festliches Profil, das im aktuellen
13er-Katalog nicht sauber abgebildet ist (vgl. Blechhilfswerks
„Kirchlich & festlich"). Die Band selbst ist fachlich mit
Festzeltenergie abgeschlossen (kein offener Fall) — der Hinweis dient
ausschließlich der späteren Katalogbewertung nach Abschluss aller vier
Runden.

---

## Verbindliche Präzedenzregeln

**Grundsatz (ab Runde 2 verbindlich):** Regeländerungen dürfen
künftig niemals still als bereits bestehende Präzedenz eingeführt
werden. Jede neue oder geschärfte Regel muss als ausdrückliche
Entscheidungsfrage vorgelegt und von Xandi bestätigt werden, bevor sie
angewendet wird.

Gelten ab sofort für alle weiteren Kurationsrunden:

1. **Feier-Cluster-Limit (in Runde 2 ausdrücklich freigegeben):** Zum
   Feier-Cluster zählen ausschließlich Festzeltenergie, Party pur und
   Tanzflächen-Garantie. Ohne ein eigenständiges unterscheidendes
   Signal werden maximal zwei Moods aus diesem Cluster vergeben.
   Rockig & mitreißend und Festlich und ausgelassen zählen
   ausdrücklich **nicht** zum Feier-Cluster — sie bilden eigenständige
   qualitative Achsen und dürfen zusätzlich zu Feier-Cluster-Moods
   vergeben werden, sofern sie durch explizite Signale belegt sind.
2. **Dialekt-/Schmäh-Signal über getrennte Phrasen:** Das
   Dialekt-/Bayern-Signal und das Frech-/Schmäh-Signal für Bayerisch
   & frech dürfen aus unterschiedlichen Phrasen desselben
   `Klingt_Nach`-Texts stammen, sofern beide Signale jeweils explizit
   sind. Ein bloßes „Bayerisch & stolz drauf" oder „Bayerisch &
   bodenständig" ohne irgendein explizites Frech-/Schmäh-Signal im
   restlichen Text reicht weiterhin nicht. Ein interpretierter
   Gesamteindruck (z. B. ein Ton-Bogen über den gesamten Text) ersetzt
   kein explizites Signal (in Runde 2 an Katharina Kornprobst
   ausdrücklich bestätigt und abgegrenzt).
3. **Bandname ist kein Nachweis:** Der Bandname allein (z. B. „Die
   WoidRocker", „Kasplattnrocker") gilt nicht als ausreichendes
   fachliches Signal für eine Mood-Zuordnung (z. B. Rockig &
   mitreißend). Maßgeblich ist ausschließlich der tatsächliche
   Kurationstext.
4. **Keine Mood zum Auffüllen:** Fehlt ein belastbares zweites oder
   drittes Signal, bleibt die Band bei weniger als der Normalzahl an
   Moods (bis hin zu einem einzigen Mood) oder wird ganz
   zurückgestellt, statt eine Mood ohne Textstütze zu ergänzen.

---

## Zwischenstand nach Runde 1

**44 von 141** öffentlich relevanten Bands fachlich fertig kuratiert
(15 vor Runde 1 + 29 aus Runde 1). **97** weiterhin offen.

## Zwischenstand nach Runde 2

**75 von 141** öffentlich relevanten Bands fachlich fertig kuratiert
(44 nach Runde 1 + 31 aus Runde 2). **66** weiterhin offen.

Bereits fachlich geprüft, aber weiterhin offen (zentrale Liste, nicht
erneut in künftigen Runden auswählen):

- Bigband STEINBACH
- Blechhilfswerk
- Duanix Musi
- Hochdruck Böhmische
