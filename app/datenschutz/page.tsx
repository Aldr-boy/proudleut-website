import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – proudleut',
  description: 'Datenschutzerklärung von proudleut.com.',
  alternates: {
    canonical: '/datenschutz',
  },
};

const h2Class = 'text-2xl md:text-3xl font-bold text-pl-text mt-12 mb-4 first:mt-0';
const h3Class = 'text-lg md:text-xl font-semibold text-pl-text mt-8 mb-2';
const pClass = 'text-pl-text-muted leading-relaxed mb-4';
const linkClass = 'text-pl-accent underline hover:text-pl-accent-link-hover break-words';
const ulClass = 'list-disc pl-6 text-pl-text-muted leading-relaxed mb-4 space-y-1';

export default function DatenschutzPage() {
  return (
    <main>
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[760px]">
            <h1 className="text-3xl md:text-4xl font-bold text-pl-text mb-6">Datenschutzerklärung</h1>
            <h2 className={h2Class}>1) Einleitung und Kontaktdaten des Verantwortlichen</h2>
            <p className={pClass}>1.1 Wir freuen uns, dass du unsere Website besuchst und bedanken uns für dein Interesse. Im Folgenden informieren wir dich über den Umgang mit deinen personenbezogenen Daten bei der Nutzung unserer Website. Personenbezogene Daten sind hierbei alle Daten, mit denen du persönlich identifiziert werden kannst.</p>
            <p className={pClass}>1.2 Verantwortlicher für die Datenverarbeitung auf dieser Website im Sinne der Datenschutz-Grundverordnung (DSGVO) ist Alexander Dressler, Am Rohrfeld 24, 92360 Mühlhausen, Deutschland, Tel.: +49 9185 2529881, E-Mail: <a href="mailto:alexander@proudleut.com" className={linkClass}>alexander@proudleut.com</a>. Der für die Verarbeitung von personenbezogenen Daten Verantwortliche ist diejenige natürliche oder juristische Person, die allein oder gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von personenbezogenen Daten entscheidet.</p>
            <h2 className={h2Class}>2) Datenerfassung beim Besuch unserer Website</h2>
            <p className={pClass}>2.1 Bei der bloß informatorischen Nutzung unserer Website, also wenn du uns keine Informationen übermittelst, erheben wir nur solche Daten, die dein Browser an den Seitenserver übermittelt (sog. „Server-Logfiles“). Wenn du unsere Website aufrufst, erheben wir die folgenden Daten, die für uns technisch erforderlich sind, um dir die Website anzuzeigen:</p>
            <ul className={ulClass}>
              <li>Unsere besuchte Website</li>
              <li>Datum und Uhrzeit zum Zeitpunkt des Zugriffs</li>
              <li>Menge der gesendeten Daten in Byte</li>
              <li>Quelle/Verweis, von welchem du auf die Seite gelangtest</li>
              <li>Verwendeter Browser</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Verwendete IP-Adresse</li>
            </ul>
            <p className={pClass}>Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. f DSGVO auf Basis unseres berechtigten Interesses an der Verbesserung der Stabilität und Funktionalität unserer Website. Die Daten werden dabei von unserem Hosting-Anbieter in unserem Auftrag verarbeitet (siehe Abschnitt 3.1). Eine darüber hinausgehende Weitergabe oder anderweitige Verwendung der Daten findet nicht statt. Wir behalten uns allerdings vor, die Server-Logfiles nachträglich zu überprüfen, sollten konkrete Anhaltspunkte auf eine rechtswidrige Nutzung hinweisen.</p>
            <p className={pClass}>2.2 Diese Website nutzt aus Sicherheitsgründen und zum Schutz der Übertragung personenbezogener Daten und anderer vertraulicher Inhalte (z. B. Anfragen an uns) eine SSL- bzw. TLS-Verschlüsselung. Du kannst eine verschlüsselte Verbindung an der Zeichenfolge „https://“ und dem Schloss-Symbol in deiner Browserzeile erkennen.</p>
            <h2 className={h2Class}>3) Hosting und Datenbank</h2>
            <h3 className={h3Class}>3.1 Vercel (Hosting und Auslieferung der Website)</h3>
            <p className={pClass}>Für das Hosting unserer Website und die Auslieferung der Seiteninhalte nutzen wir das System von folgendem Anbieter: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.</p>
            <p className={pClass}>Die Programmteile unserer Website (z. B. die Verarbeitung von Anfragen) laufen auf Servern des Anbieters in Frankfurt am Main, Deutschland. Statische Inhalte werden über ein weltweites Netzwerk des Anbieters ausgeliefert. Der Anbieter hat seine Hauptverarbeitungsstätten in den USA und setzt weitere Unterauftragnehmer ein (u. a. Cloud-Anbieter), sodass eine Verarbeitung auch außerhalb der EU nicht ausgeschlossen werden kann. Dabei werden technische Zugriffsdaten, insbesondere deine IP-Adresse, verarbeitet.</p>
            <p className={pClass}>Wir haben mit dem Anbieter einen Auftragsverarbeitungsvertrag geschlossen, der den Schutz der Daten unserer Seitenbesucher sicherstellt und eine unberechtigte Weitergabe an Dritte untersagt. Für Nutzungs- und Metadaten, die bei der Nutzung des Dienstes entstehen, verarbeitet der Anbieter Daten als eigener Verantwortlicher.</p>
            <p className={pClass}>Für Datenübermittlungen in die USA hat sich der Anbieter dem EU-US-Datenschutzrahmen (EU-US Data Privacy Framework) angeschlossen und ist dort als aktiver Teilnehmer gelistet. Ergänzend enthält der Vertrag Standardvertragsklauseln der EU-Kommission.</p>
            <h3 className={h3Class}>3.2 Supabase (Datenbank und Dateispeicher)</h3>
            <p className={pClass}>Wir nutzen den Datenbank- und Speicherdienst „Supabase“ der Supabase Pte. Ltd., 65 Chulia Street, #38-02/03, OCBC Centre, Singapur 049513, auf Basis einer Verarbeitung in unserem Auftrag.</p>
            <p className={pClass}>Wir haben unser Projekt in der Region Paris (Frankreich) angelegt. Dort werden die Datenbank und der Dateispeicher geführt und vorrangig verarbeitet. Der Anbieter und seine Unterauftragnehmer (u. a. Cloud-Anbieter mit Sitz in den USA) können Daten nach den Vertragsbedingungen auch an anderen Orten verarbeiten. Eine Verarbeitung außerhalb der EU kann daher nicht ausgeschlossen werden.</p>
            <p className={pClass}>Dort speichern wir Anfragen an Bands (siehe Abschnitt 4), die Bandprofile sowie Bilder und PDF-Dateien. Klickst du auf „PDF ansehen“, ruft dein Browser die Datei direkt von den Servern von Supabase ab. Dabei wird deine IP-Adresse an Supabase übermittelt. Bilder werden über unsere eigene Domain ausgeliefert.</p>
            <p className={pClass}>Wir haben mit dem Anbieter einen Auftragsverarbeitungsvertrag (Data Processing Addendum, Version vom 1. August 2026) geschlossen, der Standardvertragsklauseln der EU-Kommission für Übermittlungen in Drittländer enthält.</p>
            <p className={pClass}>Weitere Hinweise zum Datenschutz von Supabase erhältst du unter <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>https://supabase.com/privacy</a>.</p>
            <h2 className={h2Class}>4) Anfragen und Kontaktaufnahme</h2>
            <h3 id="anfragen" className={`${h3Class} scroll-mt-24`}>4.1 Anfrage an Bands</h3>
            <p className={pClass}>Über unser Anfrageformular kannst du eine oder mehrere Bands unverbindlich anfragen. Wir verarbeiten dabei die Angaben, die du im Formular machst. Pflichtangaben sind Vorname, E-Mail-Adresse und ein Wunschtermin oder Zeitraum (ein fester Termin ist nicht nötig). Freiwillig sind Nachname, Telefonnummer, Art der Veranstaltung, PLZ und Ort, Veranstaltungsort, Gästezahl, Spielzeit und eine Nachricht. Vor dem Absenden bestätigst du, dass du damit einverstanden bist, dass wir deine Anfrage an die ausgewählten Bands weiterleiten, und dass du diese Datenschutzerklärung gelesen hast. Wir speichern den Zeitpunkt dieser Bestätigung sowie die Version der Datenschutzerklärung.</p>
            <p className={pClass}>Wir senden deine Anfrage mit allen Angaben per E-Mail an die von dir ausgewählten Bands. Deine E-Mail-Adresse ist dabei als Antwortadresse hinterlegt, sodass die Band dir direkt antworten kann. An die von dir angegebene Adresse senden wir eine Bestätigung. Die Anfrage, die versandten Nachrichten (Betreff und Text) und der Versandstatus werden in unserer Datenbank gespeichert (siehe Abschnitt 3.2).</p>
            <p className={pClass}>Rechtsgrundlage für die Weiterleitung deiner Anfrage an die ausgewählten Bands ist deine Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO. Du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen, indem du uns an <a href="mailto:alexander@proudleut.com" className={linkClass}>alexander@proudleut.com</a> schreibst. Im Übrigen ist Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO, soweit deine Anfrage auf die Anbahnung eines Vertrags gerichtet ist, sowie unser berechtigtes Interesse an der Bearbeitung deiner Anfrage gemäß Art. 6 Abs. 1 lit. f DSGVO.</p>
            <p className={pClass}>Speicherdauer: Anfragen beziehen sich häufig auf Veranstaltungen, die Jahre in der Zukunft liegen. Deine personenbezogenen Angaben (insbesondere Name, E-Mail-Adresse, Telefonnummer, Nachricht und die versandten Nachrichten) speichern wir bis 12 Monate nach dem Veranstaltungsdatum bzw. nach dem Ende des von dir genannten Zeitraums, um die Anfrage nachweisen zu können. Danach anonymisieren wir die Anfrage, sodass kein Bezug zu dir mehr hergestellt werden kann. Die anonymisierten Angaben (z. B. Art und Zeitraum der Veranstaltung, Region, Gästezahl, angefragte Band) nutzen wir weiterhin für statistische Auswertungen. Du kannst die Löschung deiner Anfrage jederzeit verlangen. Gesetzliche Aufbewahrungspflichten bleiben unberührt.</p>
            <h3 className={h3Class}>4.2 Resend (E-Mail-Versand)</h3>
            <p className={pClass}>Für den Versand der E-Mails zu Anfragen (Anfrage an die Band und Bestätigung an dich) nutzen wir diesen Anbieter: Plus Five Five, Inc. (Resend), 2261 Market Street #5039, San Francisco, CA 94114, USA.</p>
            <p className={pClass}>Wir geben die dafür nötigen Angaben (Empfängeradresse, Betreff und Inhalt der Nachricht sowie technische Versanddaten) an den Anbieter weiter, damit er den Versand in unserem Auftrag übernimmt. Rechtsgrundlage ist die jeweilige Rechtsgrundlage der versendeten Nachricht nach Abschnitt 4.1: für die Anfrage an die Band deine Einwilligung, für die Bestätigung an dich Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO.</p>
            <p className={pClass}>Die Verarbeitung findet vorrangig in den USA statt. Für eigene Zwecke wie Betrieb, Sicherheit und Missbrauchsabwehr verarbeitet der Anbieter technische Nutzungsdaten als eigener Verantwortlicher.</p>
            <p className={pClass}>Wir haben mit dem Anbieter einen Auftragsverarbeitungsvertrag (Data Processing Addendum) geschlossen. Für Datenübermittlungen in die USA enthält der Vertrag Standardvertragsklauseln der EU-Kommission. Zusätzlich ist der Anbieter am EU-US-Datenschutzrahmen (EU-US Data Privacy Framework) beteiligt.</p>
            <h3 className={h3Class}>4.3 Band vorstellen</h3>
            <p className={pClass}>Wenn du über unser Formular „Band vorstellen“ eine Band anmeldest, verarbeiten wir die Angaben, die du im Formular machst (insbesondere Bandname, Region, Website, Beschreibung und Kontaktdaten der Ansprechperson). Du erhältst eine Bestätigung per E-Mail, und wir erhalten eine interne Benachrichtigung. Wir nutzen die Angaben, um die Band zu prüfen und gegebenenfalls aufzunehmen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO. Wir speichern die Angaben, solange sie für die Prüfung der Band und für eine mögliche Zusammenarbeit erforderlich sind; im Übrigen gilt Abschnitt 8. Für den E-Mail-Versand gilt Abschnitt 4.2.</p>
            <h3 className={h3Class}>4.4 Schutz vor Missbrauch</h3>
            <p className={pClass}>Zum Schutz vor automatisierten Anfragen nutzen wir ein verstecktes Formularfeld, eine Mindestbearbeitungszeit und eine Begrenzung der Anfragen pro Zeitfenster. Dafür wird deine IP-Adresse mit einem geheimen Schlüssel zu einem pseudonymisierten Hashwert verarbeitet. Nur dieser Wert wird für die Dauer des jeweiligen Zeitfensters in unserer Datenbank gespeichert, die IP-Adresse selbst nicht. Rechtsgrundlage ist unser berechtigtes Interesse am Schutz vor Missbrauch gemäß Art. 6 Abs. 1 lit. f DSGVO.</p>
            <h3 className={h3Class}>4.5 Kontakt per E-Mail</h3>
            <p className={pClass}>Schreibst du uns an <a href="mailto:alexander@proudleut.com" className={linkClass}>alexander@proudleut.com</a>, verarbeiten wir deine Angaben, um dein Anliegen zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, bei Vertragsbezug zusätzlich Art. 6 Abs. 1 lit. b DSGVO. Deine Daten löschen wir nach abschließender Bearbeitung, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
            <h2 className={h2Class}>5) Webanalyse</h2>
            <h3 className={h3Class}>Fathom Analytics</h3>
            <p className={pClass}>Diese Website nutzt den Webanalysedienst des folgenden Anbieters: Conva Ventures Inc., 26 Bastion Square, Third Floor Burnes House, Victoria, British Columbia, V8W 1H9, Kanada.</p>
            <p className={pClass}>Beim Aufruf unserer Seiten lädt dein Browser ein Skript von den Servern des Anbieters (cdn.usefathom.com). Dabei wird deine IP-Adresse an den Anbieter übermittelt. Bei jedem Seitenaufruf erfasst das Skript die aufgerufene Seite und die Seite, von der du kommst. Nach Angaben des Anbieters werden dabei keine Cookies und keine vergleichbaren Speichertechniken auf deinem Gerät eingesetzt und keine Informationen auf deinem Gerät ausgelesen.</p>
            <p className={pClass}>Zum Schutz der Seitenbesucher verwendet der Anbieter eine pseudonymisierte, zeitlich begrenzte Besucherkennung (Hash-Wert), die aus dem User-Agent (Informationen zu Browser und Betriebssystem) und der IP-Adresse gebildet wird. Die IP-Adresse von Besuchern aus der EU wird nach Angaben in der Dokumentation des Anbieters zunächst auf Servern in der EU verarbeitet und dort anonymisiert („EU Isolation“), bevor aggregierte Daten auf Servern in den USA verarbeitet werden.</p>
            <p className={pClass}>Die Verarbeitung erfolgt auf Basis unseres berechtigten Interesses an der statistischen Auswertung des Nutzungsverhaltens zu Optimierungszwecken gemäß Art. 6 Abs. 1 lit. f DSGVO.</p>
            <p className={pClass}>Wir haben mit dem Anbieter einen Auftragsverarbeitungsvertrag geschlossen, der den Schutz der Daten unserer Seitenbesucher sicherstellt und eine unberechtigte Weitergabe an Dritte untersagt.</p>
            <p className={pClass}>Bei einer Datenübermittlung an den Anbieterstandort ist ein angemessenes Datenschutzniveau durch einen Angemessenheitsbeschluss der Europäischen Kommission gewährleistet.</p>
            <h2 className={h2Class}>6) Einwilligungsverwaltung und eingebettete Inhalte</h2>
            <h3 id="usercentrics" className={`${h3Class} scroll-mt-24`}>6.1 Usercentrics (Einwilligungsverwaltung)</h3>
            <p className={pClass}>Zur Verwaltung deiner Einwilligungen nutzen wir das Consent-Management-Tool „Usercentrics“ des folgenden Anbieters: Usercentrics GmbH, Sendlinger Straße 7, 80331 München, Deutschland.</p>
            <p className={pClass}>Beim Aufruf unserer Seiten lädt dein Browser das Tool und seine Konfiguration von Servern des Anbieters und nimmt dabei auch Kontakt zu dem Server auf, der Einwilligungsentscheidungen entgegennimmt. Dabei wird deine IP-Adresse übermittelt. Zur Dokumentation deiner Entscheidung verarbeitet der Anbieter nach den Angaben im Auftragsverarbeitungsvertrag Einwilligungsdaten (insbesondere deine Entscheidung und den Zeitpunkt), Gerätedaten, deine IP-Adresse und Standortangaben, damit wir deine Einwilligung nachweisen können. Deine Entscheidung wird zusätzlich in deinem Browser gespeichert (localStorage-Einträge „ucData“, „ucString“ und „ucGcmStatus“), damit du nicht bei jedem Besuch erneut gefragt wirst. Du kannst sie jederzeit über den Link „Datenschutz-Einstellungen“ am Seitenende ändern.</p>
            <p className={pClass}>Der Anbieter verarbeitet die Daten nach den Angaben im Auftragsverarbeitungsvertrag in der EU bzw. im EWR und setzt dafür Unterauftragnehmer ein (u. a. Google Cloud EMEA Ltd., BunnyWay d.o.o., Hetzner Online GmbH). Wir haben mit dem Anbieter einen Auftragsverarbeitungsvertrag geschlossen.</p>
            <p className={pClass}>Rechtsgrundlage für die Verarbeitung ist Art. 6 Abs. 1 lit. c DSGVO in Verbindung mit Art. 7 Abs. 1 DSGVO (Nachweis der Einwilligung). Das Speichern deiner Entscheidung in deinem Browser ist für die Einwilligungsabfrage erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).</p>
            <h3 id="youtube" className={`${h3Class} scroll-mt-24`}>6.2 YouTube</h3>
            <p className={pClass}>Auf einzelnen Seiten zeigen wir Videos des folgenden Anbieters: Google Ireland Limited, Gordon House, 4 Barrow St, Dublin, D04 E5W5, Irland. Daten können zudem übermittelt werden an: Google LLC, USA.</p>
            <p className={pClass}>Beim Aufruf der Seite werden keine Daten an YouTube übermittelt. Erst wenn du im Video-Fenster „Video laden“ wählst und in der Einwilligungsabfrage zustimmst, lädt dein Browser das Video über youtube-nocookie.com (erweiterter Datenschutzmodus). Dabei werden Daten an YouTube bzw. Google übermittelt, insbesondere deine IP-Adresse und die besuchte Seite. Bist du während deines Seitenbesuchs in einem Nutzerkonto beim Anbieter eingeloggt, können deine Daten deinem Konto zugeordnet werden. Wenn du die Zuordnung zu deinem Konto nicht wünschst, musst du dich vor dem Laden des Videos ausloggen.</p>
            <p className={pClass}>YouTube kann außerdem Informationen in deinem Browser speichern. Bei unserer Messung waren das beispielsweise Einträge im Local Storage der Domain youtube-nocookie.com („ytidb::LAST_RESULT_ENTRY_KEY“, „yt-icons-last-purged“) und eine IndexedDB („YtIdbMeta“); Cookies wurden dabei nicht gesetzt. Diese Einträge bleiben nach einem Widerruf bestehen, weil sie auf der Domain von YouTube liegen. Du kannst sie in den Einstellungen deines Browsers löschen.</p>
            <p className={pClass}>Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit mit Wirkung für die Zukunft über den Link „Datenschutz-Einstellungen“ am Seitenende widerrufen. Dann wird das Video nicht mehr geladen.</p>
            <p className={pClass}>Für Datenübermittlungen in die USA hat sich der Anbieter dem EU-US-Datenschutzrahmen (EU-US Data Privacy Framework) angeschlossen, das auf Basis eines Angemessenheitsbeschlusses der Europäischen Kommission die Einhaltung des europäischen Datenschutzniveaus sicherstellt.</p>
            <h3 id="browser-speicher" className={`${h3Class} scroll-mt-24`}>6.3 Cookies und Browser-Speicher</h3>
            <p className={pClass}>Unsere Seite setzt selbst keine Cookies. Im Browser speichern wir nur deine Entscheidung zur Einwilligung (siehe Abschnitt 6.1). Nach deiner Zustimmung kann YouTube weitere Einträge speichern (siehe Abschnitt 6.2).</p>
            <h2 className={h2Class}>7) Rechte des Betroffenen</h2>
            <p className={pClass}>7.1 Das geltende Datenschutzrecht gewährt dir gegenüber uns als Verantwortlichen hinsichtlich der Verarbeitung deiner personenbezogenen Daten die nachstehenden Betroffenenrechte (Auskunfts- und Interventionsrechte), wobei für die jeweiligen Ausübungsvoraussetzungen auf die angeführte Rechtsgrundlage verwiesen wird:</p>
            <ul className={ulClass}>
              <li>Auskunftsrecht gemäß Art. 15 DSGVO;</li>
              <li>Recht auf Berichtigung gemäß Art. 16 DSGVO;</li>
              <li>Recht auf Löschung gemäß Art. 17 DSGVO;</li>
              <li>Recht auf Einschränkung der Verarbeitung gemäß Art. 18 DSGVO;</li>
              <li>Recht auf Unterrichtung gemäß Art. 19 DSGVO;</li>
              <li>Recht auf Datenübertragbarkeit gemäß Art. 20 DSGVO;</li>
              <li>Recht auf Widerruf erteilter Einwilligungen gemäß Art. 7 Abs. 3 DSGVO;</li>
              <li>Recht auf Beschwerde gemäß Art. 77 DSGVO.</li>
            </ul>
            <p className={pClass}>Die für uns zuständige Aufsichtsbehörde ist das Bayerische Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.</p>
            <p className={pClass}>7.2 WIDERSPRUCHSRECHT</p>
            <p className={pClass}>WENN WIR IM RAHMEN EINER INTERESSENABWÄGUNG DEINE PERSONENBEZOGENEN DATEN AUFGRUND UNSERES ÜBERWIEGENDEN BERECHTIGTEN INTERESSES VERARBEITEN, HAST DU DAS JEDERZEITIGE RECHT, AUS GRÜNDEN, DIE SICH AUS DEINER BESONDEREN SITUATION ERGEBEN, GEGEN DIESE VERARBEITUNG WIDERSPRUCH MIT WIRKUNG FÜR DIE ZUKUNFT EINZULEGEN.</p>
            <p className={pClass}>MACHST DU VON DEINEM WIDERSPRUCHSRECHT GEBRAUCH, BEENDEN WIR DIE VERARBEITUNG DER BETROFFENEN DATEN. EINE WEITERVERARBEITUNG BLEIBT ABER VORBEHALTEN, WENN WIR ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNG NACHWEISEN KÖNNEN, DIE DEINE INTERESSEN, GRUNDRECHTE UND GRUNDFREIHEITEN ÜBERWIEGEN, ODER WENN DIE VERARBEITUNG DER GELTENDMACHUNG, AUSÜBUNG ODER VERTEIDIGUNG VON RECHTSANSPRÜCHEN DIENT.</p>
            <p className={pClass}>WERDEN DEINE PERSONENBEZOGENEN DATEN VON UNS VERARBEITET, UM DIREKTWERBUNG ZU BETREIBEN, HAST DU DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE VERARBEITUNG DIR BETREFFENDER PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG EINZULEGEN. DU KANNST DEN WIDERSPRUCH WIE OBEN BESCHRIEBEN AUSÜBEN.</p>
            <p className={pClass}>MACHST DU VON DEINEM WIDERSPRUCHSRECHT GEBRAUCH, BEENDEN WIR DIE VERARBEITUNG DER BETROFFENEN DATEN ZU DIREKTWERBEZWECKEN.</p>
            <h2 className={h2Class}>8) Dauer der Speicherung personenbezogener Daten</h2>
            <p className={pClass}>Die Dauer der Speicherung von personenbezogenen Daten bemisst sich anhand der jeweiligen Rechtsgrundlage, am Verarbeitungszweck und – sofern einschlägig – zusätzlich anhand der jeweiligen gesetzlichen Aufbewahrungsfrist (z. B. handels- und steuerrechtliche Aufbewahrungsfristen).</p>
            <p className={pClass}>Bei der Verarbeitung von personenbezogenen Daten auf Grundlage einer ausdrücklichen Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO werden die betroffenen Daten so lange gespeichert, bis du deine Einwilligung widerrufst.</p>
            <p className={pClass}>Existieren gesetzliche Aufbewahrungsfristen für Daten, die im Rahmen rechtsgeschäftlicher bzw. rechtsgeschäftsähnlicher Verpflichtungen auf der Grundlage von Art. 6 Abs. 1 lit. b DSGVO verarbeitet werden, werden diese Daten nach Ablauf der Aufbewahrungsfristen routinemäßig gelöscht, sofern sie nicht mehr zur Vertragserfüllung oder Vertragsanbahnung erforderlich sind und/oder unsererseits kein berechtigtes Interesse an der Weiterspeicherung fortbesteht.</p>
            <p className={pClass}>Bei der Verarbeitung von personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO werden diese Daten so lange gespeichert, bis du dein Widerspruchsrecht nach Art. 21 Abs. 1 DSGVO ausübst, es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die deine Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.</p>
            <p className={pClass}>Bei der Verarbeitung von personenbezogenen Daten zum Zwecke der Direktwerbung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO werden diese Daten so lange gespeichert, bis du dein Widerspruchsrecht nach Art. 21 Abs. 2 DSGVO ausübst.</p>
            <p className={pClass}>Sofern sich aus den sonstigen Informationen dieser Erklärung über spezifische Verarbeitungssituationen nichts anderes ergibt, werden gespeicherte personenbezogene Daten im Übrigen dann gelöscht, wenn sie für die Zwecke, für die sie erhoben oder auf sonstige Weise verarbeitet wurden, nicht mehr notwendig sind.</p>
            <p className={pClass}>Stand: 04.10.2026</p>
          </div>
        </div>
      </section>
    </main>
  );
}
