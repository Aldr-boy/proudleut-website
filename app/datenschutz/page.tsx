import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzhinweise – proudleut',
  description: 'Datenschutzhinweise von proudleut.com.',
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
            <h1 className="text-3xl md:text-4xl font-bold text-pl-text mb-6">
              Datenschutzhinweise
            </h1>

            <p className={`${pClass} text-lg`}>
              Es freut uns, dass Du den Weg zu unserer Webseite gefunden habst und Interesse an
              unserem Unternehmen und den darauf gelisteten Musikern und Bands zeigst. Die
              Sicherheit Deiner persönlichen Daten liegt uns am Herzen und wir möchten
              sicherstellen, dass Du Dich beim Durchstöbern unserer Internetseiten geschützt und
              wohl fühlst.
            </p>

            {/* 1. Datenerfassung auf dieser Website */}
            <h2 className={h2Class}>1. Datenerfassung auf dieser Website</h2>

            <h3 className={h3Class}>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</h3>
            <p className={pClass}>
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
              Kontaktdaten kannst Du dem Abschnitt „Hinweis zur Verantwortlichen Stelle“ in dieser
              Datenschutzerklärung entnehmen.
            </p>

            <h3 className={h3Class}>Wie erfassen wir Deine Daten?</h3>
            <p className={pClass}>
              Deine Daten werden zum einen dadurch erhoben, dass Du uns diese mitteilst. Hierbei
              kann es sich z. B. um Daten handeln, die Du in ein Kontaktformular eingibst.
            </p>
            <p className={pClass}>
              Andere Daten werden automatisch oder nach Deiner Einwilligung beim Besuch der
              Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B.
              Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser
              Daten erfolgt automatisch, sobald Du diese Website betrittst.
            </p>

            <h3 className={h3Class}>Wofür nutzen wir Deine Daten?</h3>
            <p className={pClass}>
              Ein Teil der Daten wird erhoben, um eine fehlerfreie Bereitstellung der Website zu
              gewährleisten. Andere Daten können zur Analyse Deines Nutzerverhaltens verwendet
              werden.
            </p>

            <h3 className={h3Class}>Welche Rechte hast Du bezüglich Deiner Daten?</h3>
            <p className={pClass}>
              Du hast jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und
              Zweck Deiner gespeicherten personenbezogenen Daten zu erhalten. Du hast außerdem ein
              Recht, die Berichtigung oder Löschung dieser Daten zu verlangen. Wenn Du eine
              Einwilligung zur Datenverarbeitung erteilt hast, kannst Du diese Einwilligung
              jederzeit für die Zukunft widerrufen. Außerdem hast Du das Recht, unter bestimmten
              Umständen die Einschränkung der Verarbeitung Deiner personenbezogenen Daten zu
              verlangen. Des Weiteren steht Dir ein Beschwerderecht bei der zuständigen
              Aufsichtsbehörde zu.
            </p>
            <p className={pClass}>
              Hierzu sowie zu weiteren Fragen zum Thema Datenschutz kannst Du Dich jederzeit gerne
              an uns wenden.
            </p>

            <h3 className={h3Class}>Analyse-Tools und Tools von Drittanbietern</h3>
            <p className={pClass}>
              Beim Besuch dieser Website kann Dein Surf-Verhalten statistisch ausgewertet werden.
              Das geschieht vor allem mit sogenannten Analyseprogrammen.
            </p>
            <p className={pClass}>
              Detaillierte Informationen zu diesen Analyseprogrammen findest Du in der folgenden
              Datenschutzerklärung.
            </p>

            {/* 2. Hosting */}
            <h2 className={h2Class}>2. Hosting</h2>
            <p className={pClass}>Wir hosten die Inhalte unserer Website bei folgendem Anbieter:</p>

            <h3 className={h3Class}>Webflow</h3>
            <p className={pClass}>
              Anbieter ist die Webflow, Inc., 398 11th Street, 2nd Floor, San Francisco, CA 94103,
              USA (nachfolgend Webflow). Wenn Du unsere Website besuchst, erfasst Webflow
              verschiedene Logfiles inklusive Deiner IP-Adressen.
            </p>
            <p className={pClass}>
              Webflow ist ein Tool zum Erstellen und zum Hosten von Websites. Webflow speichert
              Cookies oder sonstige Wiedererkennungstechnologien, die für die Darstellung der
              Seite, zur Bereitstellung bestimmter Webseitenfunktionen und zur Gewährleistung der
              Sicherheit erforderlich sind (notwendige Cookies).
            </p>
            <p className={pClass}>
              Details kannst Du gerne er Datenschutzerklärung von Webflow:{' '}
              <a
                href="https://webflow.com/legal/eu-privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://webflow.com/legal/eu-privacy-policy
              </a>{' '}
              entnehmen.
            </p>
            <p className={pClass}>
              Die Verwendung von Webflow erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Wir
              haben ein berechtigtes Interesse an einer möglichst zuverlässigen Darstellung
              unserer Website. Sofern eine entsprechende Einwilligung abgefragt wurde, erfolgt die
              Verarbeitung ausschließlich auf Grundlage von Art.6 Abs. 1 lit. a DSGVO und § 25
              Abs. 1 TTDSG, soweit die Einwilligung der Speicherung von Cookies oder den Zugriff
              auf Informationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des
              TTDSG umfasst. Die Einwilligung ist jederzeit widerrufbar.
            </p>
            <p className={pClass}>
              Die Datenübertragung in die USA wird auf die Standardvertragsklauseln der
              EU-Kommission gestützt. Details findest Du bitte hier:
              https://webflow.com/legal/eu-privacy-policy.
            </p>
            <p className={pClass}>
              Das Unternehmen verfügt über eine Zertifizierung nach dem „EU-US Data Privacy
              Framework“ (DPF). Der DPF ist ein Übereinkommen zwischen der Europäischen Union und
              den USA, der die Einhaltung europäischer Datenschutzstandards bei
              Datenverarbeitungen in den USA gewährleisten soll. Jedes nachdem DPF zertifizierte
              Unternehmen verpflichtet sich, diese Datenschutzstandards einzuhalten. Weitere
              Informationen hierzu erhältst Du vom Anbieter unter folgendem Link:
              https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&amp;id=a2zt0000000TT9jAAG&amp;status=Active
            </p>

            <h3 className={h3Class}>Auftragsverarbeitung</h3>
            <p className={pClass}>
              Wir haben einen Vertrag über Auftragsverarbeitung (AVV) zur Nutzung des oben
              genannten Dienstes geschlossen. Hierbei handelt es sich um einen
              datenschutzrechtlich vorgeschriebenen Vertrag, der gewährleistet, dass dieser die
              personenbezogenen Daten unserer Websitebesucher nur nach unseren Weisungen und unter
              Einhaltung der DSGVO verarbeitet.
            </p>

            {/* 3. Allgemeine Hinweise und Pflichtinformationen */}
            <h2 className={h2Class}>3. Allgemeine Hinweise und Pflichtinformationen</h2>

            <h3 className={h3Class}>Datenschutz</h3>
            <p className={pClass}>
              Die Betreiber dieser Seiten nehmen den Schutz Deiner persönlichen Daten sehr ernst.
              Wir behandeln Deine personenbezogenen Daten vertraulich und entsprechend den
              gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>
            <p className={pClass}>
              Wenn Du diese Website benutzt, werden verschiedene personenbezogene Daten erhoben.
              Personenbezogene Daten sind Daten, mit denen Du persönlich identifiziert werden
              kannst. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben und
              wofür wir sie nutzen. Sie erläutert auch, wie und zu welchem Zweck das geschieht.
            </p>
            <p className={pClass}>
              Wir weisen darauf hin, dass die Datenübertragung im Internet (z. B. bei der
              Kommunikation per E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser Schutz
              der Daten vor dem Zugriff durch Dritte ist nicht möglich.
            </p>

            <h3 className={h3Class}>Hinweis zur verantwortlichen Stelle</h3>
            <p className={pClass}>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className={pClass}>
              Alexander Dressler
              <br />
              Am Rohrfeld 24
              <br />
              92360 Mühlhausen
              <br />
              Telefon: +49 (0) 9185 2529881
              <br />
              E-Mail:{' '}
              <a href="http://alexander@proudleut.com" target="_blank" rel="noopener noreferrer" className={linkClass}>
                alexander@proudleut.com
              </a>
            </p>
            <p className={pClass}>
              Verantwortliche Stelle ist die natürliche oder juristische Person, die allein oder
              gemeinsam mit anderen über die Zwecke und Mittel der Verarbeitung von
              personenbezogenen Daten (z. B. Namen, E-Mail-Adressen o. Ä.) entscheidet.
            </p>

            <h3 className={h3Class}>Speicherdauer</h3>
            <p className={pClass}>
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt
              wurde, verbleiben Deine personenbezogenen Daten bei uns, bis der Zweck für die
              Datenverarbeitung entfällt. Wenn Du ein berechtigtes Löschersuchen geltend machen
              oder eine Einwilligung zur Datenverarbeitung widerrufst, werden Deine Daten
              gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für die Speicherung
              Deiner personenbezogenen Daten haben (z. B. steuer- oder handelsrechtliche
              Aufbewahrungsfristen); im letztgenannten Fall erfolgt die Löschung nach Fortfall
              dieser Gründe.
            </p>

            <h3 className={h3Class}>
              Allgemeine Hinweise zu den Rechtsgrundlagen der Datenverarbeitung auf dieser Website
            </h3>
            <p className={pClass}>
              Sofern Du in die Datenverarbeitung eingewilligt hast, verarbeiten wir Deine
              personenbezogenen Daten auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 9
              Abs. 2 lit. a DSGVO, sofern besondere Datenkategorien nach Art. 9 Abs. 1 DSGVO
              verarbeitet werden. Im Falle einer ausdrücklichen Einwilligung in die Übertragung
              personenbezogener Daten in Drittstaaten erfolgt die Datenverarbeitung außerdem auf
              Grundlage von Art.49 Abs. 1 lit. a DSGVO. Sofern Du in die Speicherung von Cookies
              oder in den Zugriff auf Informationen in Dein Endgerät (z. B. via
              Device-Fingerprinting) eingewilligt hast, erfolgt die Datenverarbeitung zusätzlich
              auf Grundlage von § 25 Abs. 1 TTDSG. Die Einwilligung ist jederzeit widerrufbar.
              Sind Deine Daten zur Vertragserfüllung oder zur Durchführung vorvertraglicher
              Maßnahmen erforderlich, verarbeiten wir Deine Daten auf Grundlage des Art. 6 Abs. 1
              lit. b DSGVO. Des Weiteren verarbeiten wir Deine Daten, sofern diese zur Erfüllung
              einer rechtlichen Verpflichtung erforderlich sind auf Grundlage von Art. 6 Abs. 1
              lit. c DSGVO. Die Datenverarbeitung kann ferner auf Grundlage unseres berechtigten
              Interesses nach Art. 6 Abs. 1 lit. fDSGVO erfolgen. Über die jeweils im Einzelfall
              einschlägigen Rechtsgrundlagen wird in den folgenden Absätzen dieser
              Datenschutzerklärung informiert.
            </p>

            <h3 className={h3Class}>Empfänger von personenbezogenen Daten</h3>
            <p className={pClass}>
              Im Rahmen unserer Geschäftstätigkeit arbeiten wir mit verschiedenen externen Stellen
              zusammen. Dabei ist teilweise auch eine Übermittlung von personenbezogenen Daten an
              diese externen Stellen erforderlich. Wir geben personenbezogene Daten nur dann an
              externe Stellen weiter, wenn dies im Rahmen einer Vertragserfüllung erforderlich
              ist, wenn wir gesetzlich hierzu verpflichtet sind (z. B. Weitergabe von Daten an
              Steuerbehörden), wenn wir ein berechtigtes Interesse nach Art. 6 Abs. 1 lit. f DSGVO
              an der Weitergabe haben oder wenn eine sonstige Rechtsgrundlage die Datenweitergabe
              erlaubt. Beim Einsatz von Auftragsverarbeitern geben wir personenbezogene Daten
              unserer Kunden nur auf Grundlage eines gültigen Vertrags über Auftragsverarbeitung
              weiter. Im Falle einer gemeinsamen Verarbeitung wird ein Vertrag über gemeinsame
              Verarbeitung geschlossen.
            </p>
            <p className={pClass}>
              Das Unternehmen verfügt über eine Zertifizierung nach dem „EU-US Data Privacy
              Framework“ (DPF). Der DPF ist ein Übereinkommen zwischen der Europäischen Union und
              den USA, der die Einhaltung europäischer Datenschutzstandards bei
              Datenverarbeitungen in den USA gewährleisten soll. Jedes nachdem DPF zertifizierte
              Unternehmen verpflichtet sich, diese Datenschutzstandards einzuhalten. Weitere
              Informationen hierzu erhalten Sie vom Anbieter unter folgendem Link:{' '}
              <a
                href="https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&id=a2zt0000000TT9jAAG&status=Active"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&amp;id=a2zt0000000TT9jAAG&amp;status=Active
              </a>
            </p>

            <h3 className={h3Class}>Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
            <p className={pClass}>
              Viele Datenverarbeitungsvorgänge sind nur mit Deiner ausdrücklichen Einwilligung
              möglich. Du kannst eine bereits erteilte Einwilligung jederzeit widerrufen. Die
              Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf
              unberührt.
            </p>

            <h3 className={h3Class}>
              Widerspruchsrecht gegen die Datenerhebung in besonderen Fällen sowie gegen
              Direktwerbung (Art. 21 DSGVO)
            </h3>
            <p className={pClass}>
              WENN DIE DATENVERARBEITUNG AUF GRUNDLAGE VON ART. 6 ABS. 1 LIT. E ODER F
              DSGVOERFOLGT, HABST DU JEDERZEIT DAS RECHT, AUS GRÜNDEN, DIE SICH AUS DEINER
              BESONDEREN SITUATION ERGEBEN, GEGEN DIE VERARBEITUNG DEINER PERSONENBEZOGENEN DATEN
              WIDERSPRUCH EINZULEGEN; DIES GILT AUCH FÜR EIN AUF DIESE BESTIMMUNGEN GESTÜTZTES
              PROFILING. DIE JEWEILIGE RECHTSGRUNDLAGE, AUF DENEN EINE VERARBEITUNG BERUHT, KANNST
              DU DIESER DATENSCHUTZERKLÄRUNG ENTNEHMEN. WENN DU WIDERSPRUCH EINLEGST, WERDEN WIR
              DEINE BETROFFENEN PERSONENBEZOGENEN DATEN NICHT MEHR VERARBEITEN, ES SEI DENN, WIR
              KÖNNEN ZWINGENDE SCHUTZWÜRDIGE GRÜNDE FÜR DIE VERARBEITUNGNACHWEISEN, DIE DEINE
              INTERESSEN, RECHTE UND FREIHEITEN ÜBERWIEGEN ODER DIE VERARBEITUNG DIENT DER
              GELTENDMACHUNG, AUSÜBUNG ODER VERTEIDIGUNG VONRECHTSANSPRÜCHEN (WIDERSPRUCH NACH
              ART. 21 ABS. 1 DSGVO). WERDEN DEINE PERSONENBEZOGENEN DATEN VERARBEITET, UM
              DIREKTWERBUNG ZU BETREIBEN, SO HAST DU DAS RECHT, JEDERZEIT WIDERSPRUCH GEGEN DIE
              VERARBEITUNG BETREFFENDER PERSONENBEZOGENER DATEN ZUM ZWECKE DERARTIGER WERBUNG
              EINZULEGEN; DIES GILT AUCH FÜR DAS PROFILING, SOWEIT ES MIT SOLCHER DIREKTWERBUNG IN
              VERBINDUNG STEHT. WENN DU WIDERSPRICHST, WERDEN DEINE PERSONENBEZOGENEN DATEN
              ANSCHLIESSEND NICHT MEHR ZUM ZWECKE DER DIREKTWERBUNG VERWENDET (WIDERSPRUCHNACH
              ART. 21 ABS. 2 DSGVO).
            </p>

            <h3 className={h3Class}>Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>
            <p className={pClass}>
              Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei
              einerAufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres gewöhnlichen
              Aufenthalts, ihres Arbeitsplatzesoder des Orts des mutmaßlichen Verstoßes zu. Das
              Beschwerderecht besteht unbeschadet anderweitigerverwaltungsrechtlicher oder
              gerichtlicher Rechtsbehelfe.
            </p>

            <h3 className={h3Class}>Recht auf Datenübertragbarkeit</h3>
            <p className={pClass}>
              Sie haben das Recht, Daten, die wir auf Grundlage Ihrer Einwilligung oder in
              Erfüllung eines Vertrags automatisiert verarbeiten, an sich oder an einen Dritten in
              einem gängigen, maschinenlesbaren Format aushändigen zu lassen. Sofern Sie die
              direkte Übertragung der Daten an einen anderen Verantwortlichen verlangen, erfolgt
              dies nur, soweit es technisch machbar ist.
            </p>

            <h3 className={h3Class}>Auskunft, Berichtigung und Löschung</h3>
            <p className={pClass}>
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf
              unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren
              Herkunft und Empfänger und denZweck der Datenverarbeitung und ggf. ein Recht auf
              Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema
              personenbezogene Daten können Sie sich jederzeit an uns wenden.
            </p>

            <h3 className={h3Class}>Recht auf Einschränkung der Verarbeitung</h3>
            <p className={pClass}>
              Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen
              Daten zu verlangen.Hierzu können Sie sich jederzeit an uns wenden. Das Recht auf
              Einschränkung der Verarbeitung besteht in folgenden Fällen:
            </p>
            <p className={pClass}>
              Wenn Sie die Richtigkeit Ihrer bei uns gespeicherten personenbezogenen Daten
              bestreiten, benötigen wir in der Regel Zeit, um dies zu überprüfen. Für die Dauer
              der Prüfung haben Sie das Recht, dieEinschränkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen.
            </p>
            <p className={pClass}>
              Wenn die Verarbeitung Ihrer personenbezogenen Daten unrechtmäßig geschah/geschieht,
              können Sie statt der Löschung die Einschränkung der Datenverarbeitung verlangen.
            </p>
            <p className={pClass}>
              Wenn wir Ihre personenbezogenen Daten nicht mehr benötigen, Sie sie jedoch zur
              Ausübung,Verteidigung oder Geltendmachung von Rechtsansprüchen benötigen, haben Sie
              das Recht, statt derLöschung die Einschränkung der Verarbeitung Ihrer
              personenbezogenen Daten zu verlangen.
            </p>
            <p className={pClass}>
              Wenn Sie einen Widerspruch nach Art. 21 Abs. 1 DSGVO eingelegt haben, muss eine
              Abwägung zwischenIhren und unseren Interessen vorgenommen werden. Solange noch nicht
              feststeht, wessen Interessen überwiegen, haben Sie das Recht, die Einschränkung der
              Verarbeitung Ihrer personenbezogenen Daten zu verlangen.
            </p>
            <p className={pClass}>
              Wenn Sie die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt haben, dürfen
              diese Daten – von ihrer Speicherung abgesehen – nur mit Ihrer Einwilligung oder zur
              Geltendmachung, Ausübung oderVerteidigung von Rechtsansprüchen oder zum Schutz der
              Rechte einer anderen natürlichen oderjuristischen Person oder aus Gründen eines
              wichtigen öffentlichen Interesses der Europäischen Union oder eines Mitgliedstaats
              verarbeitet werden.
            </p>

            <h3 className={h3Class}>SSL- bzw. TLS-Verschlüsselung</h3>
            <p className={pClass}>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
              vertraulicher Inhalte, wie zumBeispiel Bestellungen oder Anfragen, die Sie an uns
              als Seitenbetreiber senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte
              Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von„http://“ auf
              „https://“ wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
            </p>
            <p className={pClass}>
              Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an
              uns übermitteln, nicht von Dritten mitgelesen werden.
            </p>

            <h3 className={h3Class}>Widerspruch gegen Werbe-E-Mails</h3>
            <p className={pClass}>
              Der Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten zur
              Übersendung von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien
              wird hiermit widersprochen. DieBetreiber der Seiten behalten sich ausdrücklich
              rechtliche Schritte im Falle der unverlangten Zusendung von Werbeinformationen, etwa
              durch Spam-E-Mails, vor.
            </p>

            {/* 4. Datenerfassung auf dieser Website */}
            <h2 className={h2Class}>4. Datenerfassung auf dieser Website</h2>

            <h3 className={h3Class}>Cookies</h3>
            <p className={pClass}>
              Unsere Internetseiten verwenden so genannte „Cookies“. Cookies sind kleine
              Datenpakete und richten aufIhrem Endgerät keinen Schaden an. Sie werden entweder
              vorübergehend für die Dauer einer Sitzung(Session-Cookies) oder dauerhaft
              (permanente Cookies) auf Ihrem Endgerät gespeichert. Session-Cookieswerden nach Ende
              Ihres Besuchs automatisch gelöscht. Permanente Cookies bleiben auf Ihrem
              Endgerätgespeichert, bis Sie diese selbst löschen oder eine automatische Löschung
              durch Ihren Webbrowser erfolgt.Cookies können von uns (First-Party-Cookies) oder von
              Drittunternehmen stammen (sog. Third-Party-Cookies). Third-Party-Cookies ermöglichen
              die Einbindung bestimmter Dienstleistungen vonDrittunternehmen innerhalb von
              Webseiten (z. B. Cookies zur Abwicklung von
              Zahlungsdienstleistungen).Cookies haben verschiedene Funktionen. Zahlreiche Cookies
              sind technisch notwendig, da bestimmteWebseitenfunktionen ohne diese nicht
              funktionieren würden (z. B. die Warenkorbfunktion oder die Anzeige von Videos).
              Andere Cookies können zur Auswertung des Nutzerverhaltens oder zu Werbezwecken
              verwendet werden.
            </p>
            <p className={pClass}>
              Cookies, die zur Durchführung des elektronischen Kommunikationsvorgangs, zur
              Bereitstellung bestimmter, von Ihnen erwünschter Funktionen (z. B. für die
              Warenkorbfunktion) oder zur Optimierung derWebsite (z. B. Cookies zur Messung des
              Webpublikums) erforderlich sind (notwendige Cookies), werden aufGrundlage von Art. 6
              Abs. 1 lit. f DSGVO gespeichert, sofern keine andere Rechtsgrundlage angegeben
              wird.Der Websitebetreiber hat ein berechtigtes Interesse an der Speicherung von
              notwendigen Cookies zur technisch fehlerfreien und optimierten Bereitstellung seiner
              Dienste. Sofern eine Einwilligung zurSpeicherung von Cookies und vergleichbaren
              Wiedererkennungstechnologien abgefragt wurde, erfolgt dieVerarbeitung ausschließlich
              auf Grundlage dieser Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1TTDSG);
              die Einwilligung ist jederzeit widerrufbar.
            </p>
            <p className={pClass}>
              Sie können Ihren Browser so einstellen, dass Sie über das Setzen von Cookies
              informiert werden undCookies nur im Einzelfall erlauben, die Annahme von Cookies für
              bestimmte Fälle oder generell ausschließen sowie das automatische Löschen der
              Cookies beim Schließen des Browsers aktivieren. Bei derDeaktivierung von Cookies
              kann die Funktionalität dieser Website eingeschränkt sein. Welche Cookies und
              Dienste auf dieser Website eingesetzt werden, können Sie dieser Datenschutzerklärung
              entnehmen.
            </p>

            <h3 className={h3Class}>Server-Log-Dateien</h3>
            <p className={pClass}>
              Der Provider der Seiten erhebt und speichert automatisch Informationen in so
              genannten Server-Log-Dateien, die Ihr Browser automatisch an uns übermittelt. Dies
              sind:
            </p>
            <ul className={ulClass}>
              <li>Browsertyp und Browserversion</li>
              <li>verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>
            <p className={pClass}>
              Eine Zusammenführung dieser Daten mit anderen Datenquellen wird nicht vorgenommen.
            </p>
            <p className={pClass}>
              Die Erfassung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der
              Websitebetreiber hat ein berechtigtes Interesse an der technisch fehlerfreien
              Darstellung und der Optimierung seiner Website –hierzu müssen die Server-Log-Files
              erfasst werden.
            </p>

            <h3 className={h3Class}>Kontaktformular</h3>
            <p className={pClass}>
              Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus
              demAnfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks
              Bearbeitung der Anfrageund für den Fall von Anschlussfragen bei uns gespeichert.
              Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
            <p className={pClass}>
              Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO,
              sofern Ihre Anfrage mit der Erfüllung eines Vertrags zusammenhängt oder zur
              Durchführung vorvertraglicher Maßnahmenerforderlich ist. In allen übrigen Fällen
              beruht die Verarbeitung auf unserem berechtigten Interesse an der effektiven
              Bearbeitung der an uns gerichteten Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf
              IhrerEinwilligung (Art. 6 Abs. 1 lit. a DSGVO) sofern diese abgefragt wurde; die
              Einwilligung ist jederzeit widerrufbar.Die von Ihnen im Kontaktformular eingegebenen
              Daten verbleiben bei uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur
              Speicherung widerrufen oder der Zweck für die Datenspeicherung entfällt (z. B. nach
              abgeschlossener Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen
              –insbesondere Aufbewahrungsfristen – bleiben unberührt.
            </p>

            <h3 className={h3Class}>Anfrage per E-Mail, Telefon oder Telefax</h3>
            <p className={pClass}>
              Wenn Sie uns per E-Mail, Telefon oder Telefax kontaktieren, wird Ihre Anfrage
              inklusive aller daraushervorgehenden personenbezogenen Daten (Name, Anfrage) zum
              Zwecke der Bearbeitung Ihres Anliegens bei uns gespeichert und verarbeitet. Diese
              Daten geben wir nicht ohne Ihre Einwilligung weiter.Die Verarbeitung dieser Daten
              erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der
              Erfüllung eines Vertrags zusammenhängt oder zur Durchführung vorvertraglicher
              Maßnahmenerforderlich ist. In allen übrigen Fällen beruht die Verarbeitung auf
              unserem berechtigten Interesse an der effektiven Bearbeitung der an uns gerichteten
              Anfragen (Art. 6 Abs. 1 lit. f DSGVO) oder auf IhrerEinwilligung (Art. 6 Abs. 1 lit.
              a DSGVO) sofern diese abgefragt wurde; die Einwilligung ist jederzeitwiderrufbar.Die
              von Ihnen an uns per Kontaktanfragen übersandten Daten verbleiben bei uns, bis Sie
              uns zur Löschungauffordern, Ihre Einwilligung zur Speicherung widerrufen oder der
              Zweck für die Datenspeicherung entfällt(z. B. nach abgeschlossener Bearbeitung Ihres
              Anliegens). Zwingende gesetzliche Bestimmungen –insbesondere gesetzliche
              Aufbewahrungsfristen – bleiben unberührt.
            </p>

            <h3 className={h3Class}>Fathom Analytics</h3>
            <p className={pClass}>
              Fathom Analytics ist ein Webanalysedienst, der Nutzungsdaten aggregiert und zur
              Auswertung bereitstellt, ohne die Privatsphäre der Nutzer zu verletzen. Fathom
              stellt lediglich aggregierte Daten dar, sodass zu keinem Zeitpunkt erfasste
              Informationen einer/einem einzelnen NutzerIn zugeordnet werden können (Bsp.:{' '}
              <a
                href="https://app.usefathom.com/share/deasaicp/hilarious+platypus"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://app.usefathom.com/share/deasaicp/hilarious+platypus
              </a>
              ).
            </p>
            <p className={pClass}>
              Sie können das Tracking durch Fathom unterbinden (Opt-out) indem Sie die „Do not
              track“-Funktion in Ihrem Browser aktivieren.
            </p>

            {/* 5. Plugins und Tools */}
            <h2 className={h2Class}>5. Plugins und Tools</h2>

            <h3 className={h3Class}>YouTube mit erweitertem Datenschutz</h3>
            <p className={pClass}>
              Diese Website bindet Videos der Website YouTube ein. Betreiber der Seiten ist die
              Google Ireland Limited(„Google“), Gordon House, Barrow Street, Dublin 4, Irland.
            </p>
            <p className={pClass}>
              Wir nutzen YouTube im erweiterten Datenschutzmodus. Dieser Modus bewirkt laut
              YouTube, dass YouTube keine Informationen über die Besucher auf dieser Website
              speichert, bevor diese sich das Videoansehen. Die Weitergabe von Daten an
              YouTube-Partner wird durch den erweiterten Datenschutzmodus hingegen nicht zwingend
              ausgeschlossen. So stellt YouTube – unabhängig davon, ob Sie sich ein Videoansehen –
              eine Verbindung zum Google DoubleClick-Netzwerk her.
            </p>
            <p className={pClass}>
              Sobald Sie ein YouTube-Video auf dieser Website starten, wird eine Verbindung zu den
              Servern vonYouTube hergestellt. Dabei wird dem YouTube-Server mitgeteilt, welche
              unserer Seiten Sie besucht haben.Wenn Sie in Ihrem YouTube-Account eingeloggt sind,
              ermöglichen Sie YouTube, Ihr Surfverhalten direktIhrem persönlichen Profil
              zuzuordnen. Dies können Sie verhindern, indem Sie sich aus Ihrem YouTube-Account
              ausloggen.Des Weiteren kann YouTube nach Starten eines Videos verschiedene Cookies
              auf Ihrem Endgerät speichern oder vergleichbare Wiedererkennungstechnologien (z. B.
              Device-Fingerprinting) einsetzen. Auf diese Weise kann YouTube Informationen über
              Besucher dieser Website erhalten. Diese Informationen werden u. a. verwendet, um
              Videostatistiken zu erfassen, die Anwenderfreundlichkeit zu verbessern und
              Betrugsversuchen vorzubeugen. Gegebenenfalls können nach dem Start eines
              YouTube-Videos weitere Datenverarbeitungsvorgänge ausgelöst werden, auf die wir
              keinen Einfluss haben.
            </p>
            <p className={pClass}>
              Die Nutzung von YouTube erfolgt im Interesse einer ansprechenden Darstellung unserer
              Online-Angebote. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1
              lit. f DSGVO dar. Sofern eine entsprechendeEinwilligung abgefragt wurde, erfolgt die
              Verarbeitung ausschließlich auf Grundlage von Art. 6 Abs. 1 lit. aDSGVO und § 25
              Abs. 1 TTDSG, soweit die Einwilligung die Speicherung von Cookies oder den Zugriff
              aufInformationen im Endgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des
              TTDSG umfasst. DieEinwilligung ist jederzeit widerrufbar.Weitere Informationen über
              Datenschutz bei YouTube finden Sie in deren Datenschutzerklärung unter:{' '}
              <a
                href="https://policies.google.com/privacy?hl=de"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://policies.google.com/privacy?hl=de
              </a>
              .
            </p>
            <p className={pClass}>
              Das Unternehmen verfügt über eine Zertifizierung nach dem „EU-US Data Privacy
              Framework“ (DPF). DerDPF ist ein Übereinkommen zwischen der Europäischen Union und
              den USA, der die Einhaltungeuropäischer Datenschutzstandards bei
              Datenverarbeitungen in den USA gewährleisten soll. Jedes nachdem DPF zertifizierte
              Unternehmen verpflichtet sich, diese Datenschutzstandards einzuhalten.
              WeitereInformationen hierzu erhalten Sie vom Anbieter unter folgendem Link:{' '}
              <a
                href="https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&id=a2zt000000001L5AAI&status=Active"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&amp;id=a2zt000000001L5AAI&amp;status=Active
              </a>
            </p>

            <h3 className={h3Class}>Google reCAPTCHA</h3>
            <p className={pClass}>
              Wir nutzen „Google reCAPTCHA“ (im Folgenden „reCAPTCHA“) auf dieser Website.
              Anbieter ist die GoogleIreland Limited („Google“), Gordon House, Barrow Street,
              Dublin 4, Irland.Mit reCAPTCHA soll überprüft werden, ob die Dateneingabe auf dieser
              Website (z. B. in einemKontaktformular) durch einen Menschen oder durch ein
              automatisiertes Programm erfolgt. Hierzu analysiert reCAPTCHA das Verhalten des
              Websitebesuchers anhand verschiedener Merkmale. DieseAnalyse beginnt automatisch,
              sobald der Websitebesucher die Website betritt. Zur Analyse wertet reCAPTCHA
              verschiedene Informationen aus (z. B. IP-Adresse, Verweildauer des
              Websitebesuchers auf derWebsite oder vom Nutzer getätigte Mausbewegungen). Die bei
              der Analyse erfassten Daten werden anGoogle weitergeleitet.Die
              reCAPTCHA-Analysen laufen vollständig im Hintergrund. Websitebesucher werden nicht
              darauf hingewiesen, dass eine Analyse stattfindet.Die Speicherung und Analyse der
              Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der
              Websitebetreiber hat ein berechtigtes Interesse daran, seine Webangebote vor
              missbräuchlicherautomatisierter Ausspähung und vor SPAM zu schützen. Sofern eine
              entsprechende Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich
              auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1TTDSG, soweit die
              Einwilligung die Speicherung von Cookies oder den Zugriff auf Informationen
              imEndgerät des Nutzers (z. B. Device-Fingerprinting) im Sinne des TTDSG umfasst. Die
              Einwilligung ist jederzeit widerrufbar.Weitere Informationen zu Google reCAPTCHA
              entnehmen Sie den Google-Datenschutzbestimmungen und den Google
              Nutzungsbedingungen unter folgenden Links:{' '}
              <a
                href="https://policies.google.com/privacy?hl=de"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://policies.google.com/privacy?hl=de
              </a>{' '}
              und{' '}
              <a
                href="https://policies.google.com/terms?hl=de"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://policies.google.com/terms?hl=de
              </a>
              .Das Unternehmen verfügt über eine Zertifizierung nach dem „EU-US Data Privacy
              Framework“ (DPF). DerDPF ist ein Übereinkommen zwischen der Europäischen Union und
              den USA, der die Einhaltung europäischer Datenschutzstandards bei
              Datenverarbeitungen in den USA gewährleisten soll. Jedes nachdem DPF zertifizierte
              Unternehmen verpflichtet sich, diese Datenschutzstandards einzuhalten.
              WeitereInformationen hierzu erhalten Sie vom Anbieter unter folgendem Link:{' '}
              <a
                href="https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&id=a2zt000000001L5AAI&status=Active"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://www.dataprivacyframework.gov/s/participant-search/participant-detail?contact=true&amp;id=a2zt000000001L5AAI&amp;status=Active
              </a>
            </p>

            <h3 className={h3Class}>SoundCloud</h3>
            <p className={pClass}>
              Auf dieser Website können Plugins des sozialen Netzwerks SoundCloud (SoundCloud
              Limited, BernersHouse, 47-48 Berners Street, London W1T 3NF, Großbritannien.)
              integriert sein. Die SoundCloud-Plugins erkennen Sie an dem SoundCloud-Logo auf den
              betroffenen Seiten.
            </p>
            <p className={pClass}>
              Wenn Sie diese Website besuchen, wird nach Aktivierung des Plugins eine direkte
              Verbindung zwischenIhrem Browser und dem SoundCloud-Server hergestellt. SoundCloud
              erhält dadurch die Information, dass Sie mit Ihrer IP-Adresse diese Website besucht
              haben. Wenn Sie den „Like-Button“ oder „Share-Button“anklicken, während Sie in Ihrem
              SoundCloud- Benutzerkonto eingeloggt sind, können Sie die Inhalte dieserWebsite mit
              Ihrem SoundCloud-Profil verlinken und/oder teilen. Dadurch kann SoundCloud
              IhremBenutzerkonto den Besuch dieser Website zuordnen. Wir weisen darauf hin, dass
              wir als Anbieter der Seiten keine Kenntnis vom Inhalt der übermittelten Daten sowie
              deren Nutzung durch SoundCloud erhalten.
            </p>
            <p className={pClass}>
              Die Speicherung und Analyse der Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f
              DSGVO. Der Websitebetreiber hat ein berechtigtes Interesse an einer möglichst
              umfangreichen Sichtbarkeit in denSozialen Medien. Sofern eine entsprechende
              Einwilligung abgefragt wurde, erfolgt die Verarbeitung ausschließlich auf Grundlage
              von Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TTDSG, soweit die Einwilligung die
              Speicherung von Cookies oder den Zugriff auf Informationen im Endgerät des Nutzers
              (z. B. Device-Fingerprinting) im Sinne des TTDSG umfasst. Die Einwilligung ist
              jederzeit widerrufbar. Großbritannien gilt als datenschutzrechtlich sicherer
              Drittstaat. Das bedeutet, dass Großbritannien ein Datenschutzniveau aufweist, das
              dem Datenschutzniveau in der Europäischen Union entspricht.Weitere Informationen
              hierzu finden Sie in der Datenschutzerklärung von SoundCloud unter:{' '}
              <a
                href="https://soundcloud.com/pages/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://soundcloud.com/pages/privacy
              </a>
              .Wenn Sie nicht wünschen, dass SoundCloud den Besuch dieser Website Ihrem SoundCloud-
              Benutzerkonto zuordnet, loggen Sie sich bitte aus Ihrem SoundCloud-Benutzerkonto aus
              bevor Sie Inhalte des SoundCloud-Plugins aktivieren.
            </p>
            <p className={pClass}>
              Quelle:{' '}
              <a
                href="https://www.e-recht24.de"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://www.e-recht24.de
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
