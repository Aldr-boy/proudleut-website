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
- In Runde 3 final freigegeben: **20 Bands**
- Fachlicher Zwischenstand nach Runde 3: **95 von 141**
- Weiterhin offen nach Runde 3: **46**
- In Runde 4 final freigegeben: **39 Bands**
- Fachlicher Zwischenstand nach Runde 4 (vor Schlussentscheidung): **134 von 141**
- Schlussentscheidung zu den verbliebenen 7 Fällen getroffen — siehe
  „Abschluss der Kuration" unten
- **Abschluss der Kuration: 141 von 141 aktive Bands fachlich geprüft
  und entschieden**
- Davon mit mindestens einer Mood-Zuordnung: **135**
- Davon bewusster, begründeter Empty State: **6**

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
| 3 | Königlich Bayrisches Vollgas Orchester | Festzeltenergie | | | | mittel | „Festzeltenergie pur"; „Bayerisch & stolz drauf" ohne Schmäh-Signal nicht übersetzt |
| 3 | Let's Fetz | Authentisch und handgemacht | | | | mittel | „Musik statt Show"; „Handgemacht & live" |
| 3 | Moosbüffel | Festzeltenergie | Authentisch und handgemacht | | | mittel | „Bierzelt-Energie pur"; „Gitarren statt Konserve". „Bayerisch durch und durch" ohne Schmäh-Signal nicht als Bayerisch & frech gewertet |
| 3 | Mountain Crew | Festzeltenergie | Rockig & mitreißend | | | mittel | „Festzeltenergie"; „Rockgitarre" als ausdrückliches Rock-Signal. „100.000 Hände in der Luft" nicht als Party pur übersetzt |
| 3 | Non Stop | Festzeltenergie | Tanzflächen-Garantie | | | hoch | direkte Signale; Party pur wegen Feier-Cluster-Limit gestrichen |
| 3 | Ö'ha | Festzeltenergie | Party pur | | | mittel | „Bierzelt-Stimmung pur"; „Party" in „Tracht trifft Party" |
| 3 | Out Of Bayern | Festzeltenergie | | | | mittel | „Festzeltenergie mit Lederhosen"; „Bayerisch & stolz drauf" ohne Schmäh-Signal nicht übersetzt |
| 3 | Rotzlöffl | Festzeltenergie | Bayerisch & frech | | | hoch | „Bierzelt trifft Bühnenshow"; „Rotzfrech & authentisch bayerisch" |
| 3 | Route 12 34 | Festzeltenergie | Party pur | | | mittel | „Bierzelt-Eskalation"; „feiern" in „Unter Freunden feiern" |
| 3 | Rundumadum | Festzeltenergie | Tanzflächen-Garantie | | | hoch | beide Signale direkt im Text |
| 3 | SaKrisch | Festzeltenergie | Party pur | | | hoch | redaktionelles Klingt_Nach; „Festzeltenergie" und „Bierzelt-Partystimmung" |
| 3 | Sappralot | Festzeltenergie | | | | mittel | „Festzeltenergie pur"; kein Schmäh-Signal |
| 3 | Saustoimusi | Festzeltenergie | Tanzflächen-Garantie | | | mittel | „Festzeltenergie mit Blasmusik"; „Tanzfläche in Schieflage" |
| 3 | SIMMISAMMA | Festzeltenergie | | | | mittel | „Festzeltstimmung pur"; Range-Phrase nicht übersetzt |
| 3 | Spitz af Knopf | Festzeltenergie | Authentisch und handgemacht | | | mittel | „Bairische Festzeltenergie" belegt Festzeltenergie; Dialektschreibweise allein genügt nicht für Bayerisch & frech; „Authentisch & ungekünstelt" |
| 3 | Sturschädl | Festzeltenergie | Generationenverbindend | Tanzflächen-Garantie | | mittel | „Festzeltenergie pur"; „Jung und Alt"; „tanzt". „Bayerisch & ausgelassen" nicht übersetzt |
| 3 | Urwaidler | Festzeltenergie | Rockig & mitreißend | | | hoch | „Festzeltenergie pur"; „rockige" in „Boarisch-rockige Wucht". Kein Frech-/Schmäh-Signal |
| 3 | Waidler-Power | Festzeltenergie | Party pur | | | mittel | „Bierzeltenergie pur"; „Partymacher" |
| 3 | X'Ploushn | Festzeltenergie | Mitsing-Faktor | Herzlich & nahbar | | mittel | „Festzelt-Energie"; „Mitsingen inklusive"; „Nahbar" |
| 3 | zruck zu Dir! | Festzeltenergie | Rockig & mitreißend | | | hoch | „Festzeltenergie pur"; „E-Gitarre" in „Lederhosen trifft E-Gitarre" als bestätigtes Instrumenten-/Rocksignal |
| 4 | Limited | Tanzflächen-Garantie | Rockig & mitreißend | | | hoch | „Tanzfläche von Anfang an"; „Rockige Hochzeitsnacht" (explizites Rock-Signal) |
| 4 | Loops | Festzeltenergie | Tanzflächen-Garantie | Rockig & mitreißend | Generationenverbindend | hoch | „Festzeltenergie mit Klasse"; „Tanzflächen-Garantie" wörtlich; „rockig" in „Bayerisch & rockig"; „Generationsübergreifend". Bayerisch & frech nicht übersetzt (kein Schmäh-Signal) |
| 4 | LPC | Tanzflächen-Garantie | | | | hoch | „Tanzfläche von Anfang an"; „Jazz bis Partymodus" als Range-Phrase nicht übersetzt |
| 4 | Max Headroom | Mitsing-Faktor | Rockig & mitreißend | Generationenverbindend | | mittel | „Mitsingmomente inklusive"; „Rock" und „zwei Generationen" in „Rock für zwei Generationen" — zwei eigenständige Signale derselben Phrase (Präzedenzregel „Mehrere Signale in derselben Phrase") |
| 4 | May Vibes | Tanzflächen-Garantie | | | | mittel | „tanzbar" in „Elegant und tanzbar" (Präzedenzregel „tanzbar" als direktes Signal). „Hintergrundmusik bis Partymodus" als Range-Phrase nicht übersetzt |
| 4 | Michael Jackts Net | Festzeltenergie | Rockig & mitreißend | | | hoch | „Festzeltenergie mit Hornpower"; „Rocknächte im Freien". Bayerisch & frech nicht übersetzt (nur „Bayerische Partydichte", kein Schmäh-Signal) |
| 4 | mix2max | Tanzflächen-Garantie | Generationenverbindend | Festzeltenergie | | mittel | „volle Tanzfläche"; „Generationenverbinder"; „Bierzelt" in „Bierzelt trifft Wohnzimmer" (Trifft-Präzedenz, „Wohnzimmer" nicht übersetzt) |
| 4 | Mixtape | Festzeltenergie | Generationenverbindend | Mitsing-Faktor | | hoch | „Festzeltenergie"; „Generationsübergreifend"; „Mitsingmomente". Bayerisch & frech nicht übersetzt (nur „Bayerisch & modern") |
| 4 | More Candy | Tanzflächen-Garantie | | | | mittel | „Tanzfläche" in „Tanzfläche trifft Ballade" (Trifft-Präzedenz, „Ballade" nicht übersetzt) |
| 4 | MyfriendZ | Tanzflächen-Garantie | | | | hoch | „Tanzfläche von Anfang an". Bayerisch & frech nicht übersetzt (nur „Bayerische Verwurzelung, breites Repertoire", kein Schmäh-Signal) |
| 4 | Nice Ties | Bayerisch & frech | | | | hoch | Dialekt „Bayerisch" (aus „Bayerisch & englisch") + Schmäh-Wort „Witz" (aus „Witz & Bühnenpräsenz"), getrennte Phrasen gemäß Präzedenzregel 2 |
| 4 | Nick's Nice | Festzeltenergie | Rockig & mitreißend | Mitsing-Faktor | | mittel | „Bierzelt" und „Rockbühne" in „Bierzelt trifft Rockbühne" (Trifft-Präzedenz, beide Seiten anerkannt); „Mitsingen garantiert" |
| 4 | Onesee | Festzeltenergie | Tanzflächen-Garantie | Generationenverbindend | | hoch | „Festzeltenergie"; „Tanzflächen-Garantie"; „Generationsübergreifend" wörtlich. Bayerisch & frech nicht übersetzt (nur „Bayerisch & jung") |
| 4 | Partybox | Tanzflächen-Garantie | Party pur | | | mittel | „Tanzfläche von Anfang an"; „Partynacht" in „Schlager trifft Partynacht" (Trifft-Präzedenz, „Schlager" nicht übersetzt) |
| 4 | Prime Time | Festzeltenergie | Tanzflächen-Garantie | | | hoch | „Festzeltenergie mit Klasse"; „Tanzfläche füllt sich" |
| 4 | Singing Sonixx | Party pur | | | | mittel | „große Party" in „Kleine Bühne, große Party" — direktes Party-Signal trotz Kontrastform |
| 4 | Soiz'n'Pepper | Authentisch und handgemacht | Tanzflächen-Garantie | | | mittel | „Handgemacht & direkt"; „Tanzfläche" in „Tanzfläche trifft Stilgefühl" (Trifft-Präzedenz, „Stilgefühl" nicht übersetzt) |
| 4 | Sommerwind | Bayerisch & frech | Lagerfeuer-Atmosphäre | Tanzflächen-Garantie | | mittel | Dialekt „Bayerischer" + Schmäh-Wort „Humor" in derselben Phrase; „Unplugged-Momente im Saal"; „Tanzfläche" in „Tanzfläche trifft Stammtisch" (Trifft-Präzedenz, „Stammtisch" nicht übersetzt) |
| 4 | Spectrum | Festzeltenergie | Herzlich & nahbar | Rockig & mitreißend | | mittel | „Festzeltenergie"; „Herzlichkeit" in „Bayerische Herzlichkeit" (nur Herzlichkeit-Anteil verwertet, kein Bayerisch-&-frech-Anspruch); „Rocknacht" in „Schlager trifft Rocknacht" (Trifft-Präzedenz) |
| 4 | SPOTLIGHT Eventband | Tanzflächen-Garantie | Party pur | | | hoch | „Volle Tanzfläche"; „Partyenergie pur" (nahezu wörtliche Mood-Entsprechung) |
| 4 | The Silverhammers | Generationenverbindend | Tanzflächen-Garantie | Authentisch und handgemacht | | mittel | „Generationsübergreifend" und „tanzbar" in „Generationsübergreifend tanzbar" — zwei eigenständige Signale derselben Phrase; „Handwerk statt Playback" |
| 4 | vier-tell-four | Festzeltenergie | Tanzflächen-Garantie | | | hoch | „Festzeltgefühl im Gasthaus"; „Tanz bis Mitternacht". Bayerisch & frech nicht übersetzt (nur „Boarisch & gesellig", kein Schmäh-Signal) |
| 4 | Whoobers | Lagerfeuer-Atmosphäre | Rockig & mitreißend | Tanzflächen-Garantie | | mittel | „Akustische Wärme zum Auftakt"; „Rockige" und „Tanzfläche" in „Rockige Tanzfläche" — zwei eigenständige Signale derselben Phrase |
| 4 | Wiesnkönige | Festzeltenergie | Generationenverbindend | Tanzflächen-Garantie | | mittel | „Festzeltenergie" wörtlich; „Jung und Alt" und „tanzt" in „Jung und Alt tanzt" — zwei eigenständige Signale derselben Phrase |
| 4 | Wois Bois | Bayerisch & frech | | | | hoch | Regionalsignal „Ostbayerischer" + Schmäh-Wort „Humor", getrennte Phrasen |
| 4 | Muckasäck | Festzeltenergie | Tanzflächen-Garantie | | | mittel | „Festzelt" und „Dancefloor" in „Festzelt trifft Dancefloor" (Trifft-Präzedenz, beide Seiten anerkannt). „Blechdruck" nicht übersetzt (Brass-Power-Abgrenzung) |
| 4 | Quetschnblech | Authentisch und handgemacht | Tanzflächen-Garantie | | | mittel | „Echte Volksmusik lebt"; „Tanzboden" in „Wirtshaus trifft Tanzboden" (Trifft-Präzedenz, „Wirtshaus" nicht übersetzt). „ungezähmt" nicht als Bayerisch-&-frech-Signal gewertet (Präzedenzregel „Abgrenzung ungezähmt") |
| 4 | Seubersdorfer Blasmusik | Festzeltenergie | Rockig & mitreißend | | | hoch | „Bierzelt-Energie pur"; „Rock" in „Böhmisch trifft Rock" |
| 4 | Tegernseer Tanzlmusi | Festzeltenergie | | | | hoch | „Festzeltenergie pur". Bayerisch & frech nicht übersetzt (nur „Bayerisch & stolz drauf", kein Schmäh-Signal) |
| 4 | Urner Musi | Festzeltenergie | | | | hoch | „Festzeltenergie mit Niveau". Bayerisch & frech nicht übersetzt (gleiche Konstellation wie Tegernseer Tanzlmusi) |
| 4 | Lebensg'fühl | Emotional & berührend | Lagerfeuer-Atmosphäre | | | hoch | „Stille Gänsehautmomente"/„Emotionale Trauungsatmosphäre"; „Innig statt laut" |
| 4 | Saitenwind | Lagerfeuer-Atmosphäre | Emotional & berührend | | | hoch | „Akustische Intimität"; „Stille Momente, berührt" |
| 4 | The Stereo Show | Authentisch und handgemacht | Generationenverbindend | | | hoch | „Handgemacht & ungefiltert"; „Musik durch alle Generationen" |
| 4 | KIZZRock | Rockig & mitreißend | | | | mittel | „Rock" in „Rock mit Lacher-Garantie", gestützt durch „echter Gitarrenrock" (Musikalisch-Feld). Kinder-bezogene Signale bewusst nicht übersetzt |
| 4 | Schlawindl | Rockig & mitreißend | | | | mittel | „Rockiger Live-Sound" (Musikalisch-Feld, unabhängig vom Kinder-Rahmen „Kinder rocken mit") |
| 4 | Sabrina Robold | Herzlich & nahbar | Emotional & berührend | Lagerfeuer-Atmosphäre | | hoch | „Persönlich & herzlich"; „Emotionale Momente"; „Intime Atmosphäre" |
| 4 | Steffi Heim | Herzlich & nahbar | | | | mittel | „Persönlich statt Show". „Kirchliche Wärme" bewusst nicht übersetzt (vgl. Katharina-Kornprobst-Vorsicht bei kirchlichen Phrasen) |
| 4 | San2 and His Soul Patrol | Konzertant & hochwertig | | | | mittel | „Konzertabend mit Seele" |
| 4 | Tir Nan Og | Tanzflächen-Garantie | | | | mittel | „tanzbar" in „Tanzbar & rau" (Präzedenzregel „tanzbar" als direktes Signal) |

---

## Sonderfälle (fachlich abgeschlossen)

Diese sieben Bands wurden in den jeweils genannten Runden inhaltlich
geprüft und mit der Schlussentscheidung unter „Abschluss der
Kuration" final entschieden — sechs davon als bewusster, begründeter
Empty State, eine (Bigband STEINBACH) mit teils bestätigten, teils
entfernten bzw. geparkten Moods. Ein Empty State ist dabei ein
fachlich fertiges Ergebnis, kein offener Fall. Diese Liste dokumentiert
weiterhin die fachliche Begründung je Band und wird nicht mehr in
künftige reguläre Kurationsrunden gemischt.

- **Bigband STEINBACH** — besitzt aktuell, vor Ausführung der
  vorbereiteten Entfernungsmigration, die Production-`band_moods`
  Tanzflächen-Garantie, Konzertant & hochwertig, Festlich und
  ausgelassen sowie Brass-Power (`sort_order` durchgehend 0). Schluss-
  entscheidung: Tanzflächen-Garantie und Konzertant & hochwertig
  bleiben regulär bestätigt (textlich gestützt). „Festlich und
  ausgelassen" hat im aktuellen `Klingt_Nach` keine Textstütze mehr
  und ist fachlich zur Entfernung entschieden — die Entfernung ist
  technisch vorbereitet, aber noch nicht in Production ausgeführt
  (siehe
  `supabase/band_moods_steinbach_festlich_ausgelassen_removal.sql`).
  Brass-Power bleibt unverändert bestehen und ist ausschließlich für
  Paket D geparkt (siehe unten) — kein offener Kurationsfall mehr.
- **Blechhilfswerk** — kein Treffer im 13er-Katalog. Schluss-
  entscheidung: bewusster Empty State, keine Mood erzwungen. Die
  mögliche Kataloglücke ist unten als geparkte Beobachtung dokumentiert.
- **Duanix Musi** — Text überwiegend poetisch-atmosphärisch
  („Bajuwarische Urgewalt", „Trad mit Schmiss", „Chiemgau-Energie").
  „Tanzlmusi" allein gilt nicht als belastbarer Nachweis für
  Tanzflächen-Garantie. Schlussentscheidung: bewusster Empty State.
  Weitere Bandinformationen sind keine Voraussetzung für diesen
  Abschluss, ermöglichen aber ggf. eine spätere Neuprüfung (geparkt).
- **Hochdruck Böhmische** — Text verweist ausschließlich auf
  ausgeschlossene bzw. Übergangs-Moods (Tradition, Brass-Power).
  Schlussentscheidung: bewusster Empty State, keine Mood erzwungen.
  Die Brass-Power-Erwähnung bleibt reiner Paket-D-Hinweis.
- **Silk and Sound** — Runde 4 geprüft. Keine belastbare Zuordnung im
  vorhandenen 13er-Katalog, AI-Text beschreibt vor allem Zurückhaltung
  und Atmosphäre statt Aufmerksamkeit. Schlussentscheidung: bewusster
  Empty State, keine Mood erzwungen. Mögliche strukturelle Nähe zu
  Smooth'n'Groove unten als geparkte Beobachtung dokumentiert.
- **Rüscherl Muse** — Runde 4 geprüft. Redaktionelles Klingt_Nach
  vorhanden, aber „Tanzlmusi mit frischem Schwung" reicht nicht für
  Tanzflächen-Garantie (konsistent mit der Duanix-Abgrenzung).
  Schlussentscheidung: bewusster Empty State. Maßgeblich bleibt das
  redaktionelle Klingt_Nach-Feld; der umfangreichere AI-Vorschlag wird
  nicht ersatzweise als Beweisquelle verwendet. Eine mögliche spätere
  Überarbeitung des redaktionellen Texts ist unten als geparktes
  Datenpflege-To-do dokumentiert.
- **Smooth'n'Groove** — Runde 4 geprüft. Profil beschreibt bewusst
  dezente Hintergrundmusik und Gesprächstauglichkeit, kein sauberer
  Treffer im vorhandenen 13er-Katalog. Schlussentscheidung: bewusster
  Empty State, keine Mood erzwungen. Als möglicher Kataloglücken-
  Kandidat unten geparkt dokumentiert.

---

## Kataloglücken-Kandidaten

Fortlaufende Liste von Bands, deren Airtable-Text auf eine
möglicherweise fehlende Mood im 13er-Katalog hindeutet. Diese Liste
ist mit Abschluss der regulären Kuration vollständig; ob sich daraus
ausreichend Evidenz für einen zusätzlichen Mood ergibt, ist eine
separate, geparkte Produktentscheidung und kein Bestandteil des
aktuellen Kurationsabschlusses (siehe „Abschluss der Kuration" unten).

- **Hochdruck Böhmische** — Text verweist ausschließlich auf
  ausgeschlossene bzw. Übergangs-Moods (Tradition, Brass-Power).
- **Blechhilfswerk** — Profil: böhmischer Blechklang, kirchlich und
  festlich, Jazz-Einschlag, junges Blasmusikgefühl. Kein Treffer im
  13er-Katalog.
- **Smooth'n'Groove** — Profil: bewusst dezente Hintergrundmusik,
  Gesprächstauglichkeit, Lounge-Atmosphäre ohne Party-Anspruch
  („Gespräche bleiben möglich", „Groove ohne Lautstärke"). Kein
  sauberer Treffer im 13er-Katalog für diese Positionierung.

**Zusätzlicher Hinweis (kein eigenständiger Kataloglücken-Fall):**
**Katharina Kornprobst** liefert mit „Kirchlich bis festlich | Feierliche
Nähe | Bayerisches Festzelt" ein weiteres Indiz für ein wiederholt im
Bestand auftretendes kirchlich-festliches Profil, das im aktuellen
13er-Katalog nicht sauber abgebildet ist (vgl. Blechhilfswerks
„Kirchlich & festlich"). Die Band selbst ist fachlich mit
Festzeltenergie abgeschlossen (kein offener Fall) — der Hinweis dient
ausschließlich der späteren, geparkten Katalogbewertung und ist kein
Bestandteil des aktuellen Kurationsabschlusses.

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
5. **E-Gitarren-/Rockinstrument-Signal (in Runde 3 ausdrücklich
   bestätigt):** Ein explizites E-Gitarren- oder vergleichbares
   Rockinstrument-Signal im tatsächlichen Kurationstext kann „Rockig &
   mitreißend" begründen, sofern es einen energetischen Bandsound
   beschreibt — auch wenn das Wort „rock" oder „rockig" selbst nicht
   vorkommt. Der Bandname allein bleibt weiterhin ausdrücklich kein
   ausreichender Nachweis.

   Dokumentarische Abgrenzung: `zruck zu Dir!` ist die erste
   bestätigte Anwendung dieser neuen Instrumenten-Präzedenz ohne das
   Wort „rock" (Signal: „E-Gitarre"). `Mountain Crew` enthält mit
   „Rockgitarre" bereits ein ausdrückliches Rock-Signal (das Wort
   „Rock" selbst kommt vor) und ist daher keine Erstanwendung dieser
   neuen Regel.
6. **Direkte Signale innerhalb einer „X trifft Y"-Phrase (in Runde 4
   ausdrücklich bestätigt):** Mehrere Bestandteile derselben Phrase
   dürfen jeweils einen eigenen Mood begründen, wenn jeder Bestandteil
   für sich ein bereits anerkanntes direktes Signal enthält. Die
   Konstruktion „X trifft Y" erzeugt nicht automatisch Moods.
   Bestätigte direkte Signale:
   - Bierzelt oder Festzelt → Festzeltenergie
   - Tanzfläche, Tanzboden oder Dancefloor → Tanzflächen-Garantie
   - Partynacht oder große Party → Party pur
   - Rockbühne oder Rocknacht → Rockig & mitreißend

   Nicht anerkannte Gegenstücke wie Wohnzimmer, Stilgefühl, Stammtisch
   oder Ballade werden nicht automatisch übersetzt. Diese Regel gilt
   konsistent für alle strukturgleichen Fälle, nicht nur für zuvor
   ausdrücklich benannte Bandkarten. Dokumentierte Anwendungen aus
   Runde 4: Nick's Nice, More Candy, Partybox, Singing Sonixx,
   Muckasäck, mix2max, Soiz'n'Pepper, Sommerwind, Quetschnblech.
7. **„tanzbar" als direktes Signal (in Runde 4 ausdrücklich
   bestätigt):** Das ausdrückliche Adjektiv „tanzbar" kann Tanzflächen-
   Garantie begründen. Bestätigte bzw. konsistent angewandte Fälle:
   Broadway (bestehende Präzedenz aus Runde 1), May Vibes, Tir Nan Og,
   The Silverhammers.
8. **Mehrere Signale in derselben Phrase (in Runde 4 ausdrücklich
   bestätigt):** Zwei oder mehr jeweils explizite Signalbestandteile
   derselben kurzen Phrase dürfen unterschiedliche Moods begründen.
   Anwendungen: Max Headroom („Rock für zwei Generationen"), Whoobers
   („Rockige Tanzfläche"), Wiesnkönige („Jung und Alt tanzt"), The
   Silverhammers („Generationsübergreifend tanzbar").
9. **Abgrenzung „ungezähmt" (in Runde 4 ausdrücklich bestätigt):**
   „Ungezähmt" allein gilt nicht als Frech-, Schmäh-, Humor- oder
   Augenzwinkern-Signal für Bayerisch & frech. Anwendung: Quetschnblech
   erhält daraus kein Bayerisch & frech.

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

## Zwischenstand nach Runde 3

**95 von 141** öffentlich relevanten Bands fachlich fertig kuratiert
(75 nach Runde 2 + 20 aus Runde 3). **46** weiterhin offen.

Runde 3 umfasst genau 20 Bands (Bandart-Cluster „bayrische-
partybands") mit insgesamt 37 kuratierten Mood-Zuordnungen. Keine
neue Kataloglücke entstanden, keine Änderung an der bestehenden
Sonderfallliste.

Von den 46 weiterhin offenen Bands sind:

- **4** bereits fachlich geprüft und bewusst offen (unverändert):
  - Bigband STEINBACH
  - Blechhilfswerk
  - Duanix Musi
  - Hochdruck Böhmische
- **42** bislang noch nicht fachlich geprüft.

## Zwischenstand nach Runde 4

**134 von 141** öffentlich relevanten Bands fachlich fertig kuratiert
(95 nach Runde 3 + 39 aus Runde 4). **7** weiterhin offen. (Zahlen vor
der Schlussentscheidung — siehe „Abschluss der Kuration" unten für den
finalen Stand.)

Runde 4 umfasst alle 42 zuvor ungeprüften Bands — damit ist die
reguläre Erstprüfung des vollständigen Bestands abgeschlossen. Davon:

- **39** Bands fachlich freigegeben, mit insgesamt **77** kuratierten
  Mood-Zuordnungen
- **2** Bands bewusst offen (Silk and Sound, Rüscherl Muse)
- **1** Band als Kataloglücken-Kandidat dokumentiert (Smooth'n'Groove)

Damit wurden alle 141 Bands mindestens einmal fachlich geprüft. Es
folgt keine reguläre Kurationsrunde 5. Die Schlussentscheidung über
die sieben verbliebenen Fälle wurde unmittelbar im Anschluss
getroffen — siehe „Abschluss der Kuration" unten:

- Bigband STEINBACH
- Blechhilfswerk
- Duanix Musi
- Hochdruck Böhmische
- Silk and Sound
- Rüscherl Muse
- Smooth'n'Groove

## Abschluss der Kuration

Mit der Schlussentscheidung zu den sieben zuvor verbliebenen Fällen
ist die reguläre „Klingt nach"-Kuration abgeschlossen.

**Grundsatzentscheidung:** Ein bewusst begründeter Empty State ist ein
fachlich fertiges Ergebnis, kein offener Fall. Die bisherige
Steuerungszahl „fachlich fertig" (die bewusste Empty States nicht
mitzählte) wird deshalb nicht fortgeführt.

**Steuerungszahlen ab sofort:**

- **141 von 141** aktiven Bands fachlich geprüft und entschieden
- **135** Bands mit mindestens einer Mood-Zuordnung
- **6** Bands mit bewusstem, begründetem Empty State (Blechhilfswerk,
  Duanix Musi, Hochdruck Böhmische, Silk and Sound, Rüscherl Muse,
  Smooth'n'Groove)

Diese Zahlen beschreiben den fachlichen Kurations-Sollstand, nicht den
vollständigen Production-Iststand. Der technische Production-Import
der Runden 3 und 4 mit zusammen 59 Bands (20 aus Runde 3 + 39 aus
Runde 4) sowie die vorbereitete STEINBACH-Entfernung sind separate,
noch ausstehende Schritte und nicht Bestandteil dieses
Dokumentationsabschlusses. Der Gesamtstand setzt sich aus 16 bereits
vor den vier Kurationsrunden behandelten Bands, 119 Entscheidungen aus
den Runden 1 bis 4 und 6 bewussten Empty States zusammen.

Diese drei Zahlen sind getrennt zu betrachten: „fachlich entschieden"
ist der Abschlussstatus, „mit Mood-Zuordnung" und „Empty State" sind
das inhaltliche Ergebnis dieser Entscheidung — keines der beiden macht
das andere unfertig. Bigband STEINBACH zählt in „fachlich entschieden"
und in „mit Mood-Zuordnung" (zwei reguläre Moods bestätigt), aber
nicht als Empty State.

Die einzelnen Schlussentscheidungen sind oben unter „Sonderfälle
(fachlich abgeschlossen)" je Band dokumentiert.

### Geparkte Folgefragen (kein Bestandteil des aktuellen Abschlusses)

Folgende Punkte sind für spätere, separate Prüfungen geparkt und
blockieren den Abschluss der aktuellen Kuration nicht:

- Paket D: Brass-Power bei Bigband STEINBACH und eine mögliche
  spätere Gesamtbewertung dieses Sonder-Moods
- mögliche Kataloglücke „kirchlich-festlich" (Blechhilfswerk,
  Hochdruck Böhmische teilweise, Zusatzhinweis Katharina Kornprobst)
- mögliche Kataloglücke „dezente/gehobene Hintergrundmusik" (Silk and
  Sound, Smooth'n'Groove)
- mögliche redaktionelle Textpflege des `Klingt_Nach`-Felds bei
  Rüscherl Muse
- mögliche spätere Neubewertung von Duanix Musi oder anderen Empty-
  State-Bands, falls bessere redaktionelle Daten hinzukommen
