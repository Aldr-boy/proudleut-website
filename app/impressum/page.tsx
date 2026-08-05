import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum – proudleut',
  description: 'Impressum und Anbieterkennzeichnung von proudleut.com.',
  alternates: {
    canonical: '/impressum',
  },
};

const h2Class = 'text-xl md:text-2xl font-bold text-pl-text mt-10 mb-3 first:mt-0';
const pClass = 'text-pl-text-muted leading-relaxed';
const linkClass = 'text-pl-accent underline hover:text-pl-accent-link-hover break-words';

export default function ImpressumPage() {
  return (
    <main>
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[720px]">
            <h1 className="text-3xl md:text-4xl font-bold text-pl-text mb-10">Impressum</h1>

            <h2 className={h2Class}>Angaben gemäß § 5 TMG</h2>
            <p className={pClass}>
              Alexander Dressler
              <br />
              Am Rohrfeld 24
              <br />
              92360 Mühlhausen
            </p>

            <h2 className={h2Class}>Kontakt</h2>
            <p className={pClass}>
              <a href="mailto:alexander@proudleut.com" className={linkClass}>
                alexander@proudleut.com
              </a>
              <br />
              <a href="tel:+4991859237060" className={linkClass}>
                +49 (0) 9185 2529881
              </a>
              <br />
              <a
                href="https://www.alexanderdressler.de/"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                www.alexanderdressler.de
              </a>
            </p>

            <h2 className={h2Class}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p className={pClass}>
              Alexander Dressler
              <br />
              Am Rohrfeld 24
              <br />
              92360 Mühlhausen
            </p>

            <h2 className={h2Class}>Haftung für Inhalte</h2>
            <p className={pClass}>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
              Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
              als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
              rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
              Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
              Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer
              konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden
              Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </p>

            <h2 className={h2Class}>Haftung für Links</h2>
            <p className={pClass}>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
              Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
              Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum
              Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige
              Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente
              inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte
              einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
              werden wir derartige Links umgehend entfernen.
            </p>

            <h2 className={h2Class}>Urheberrecht</h2>
            <p className={pClass}>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
              bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
              Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen
              Gebrauch gestattet.
            </p>
            <p className={`${pClass} mt-4`}>
              Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die
              Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche
              gekennzeichnet. Solltest Du trotzdem auf eine Urheberrechtsverletzung aufmerksam
              werden, bitten wir Dich um einen entsprechenden Hinweis. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
