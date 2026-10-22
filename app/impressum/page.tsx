import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum – proudleut',
  description: 'Impressum und Anbieterkennzeichnung von proudleut.com.',
  alternates: {
    canonical: '/impressum',
  },
};

const h2Class = 'text-xl md:text-2xl font-bold text-pl-text mt-10 mb-3 first:mt-0 break-words';
const pClass = 'text-pl-text-muted leading-relaxed';
const linkClass = 'text-pl-accent underline hover:text-pl-accent-link-hover break-words';

export default function ImpressumPage() {
  return (
    <main>
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[720px]">
            <h1 className="text-3xl md:text-4xl font-bold text-pl-text mb-10">Impressum</h1>

            <p className={pClass}>
              Alexander Dressler
              <br />
              Am Rohrfeld 24
              <br />
              92360 Mühlhausen
              <br />
              Deutschland
            </p>

            <h2 className={h2Class}>Kontakt</h2>
            <p className={pClass}>
              Telefon:{' '}
              <a href="tel:+4991852529881" className={linkClass}>
                +49 9185 2529881
              </a>
              <br />
              E-Mail:{' '}
              <a href="mailto:alexander@proudleut.com" className={linkClass}>
                alexander@proudleut.com
              </a>
            </p>

            {/* Weiche Trennstellen (echte U+00AD) an den Wortfugen, wie im
                eRecht24-Generator-Text vorgesehen -- verhindert das
                Abschneiden auf schmalen Displays (~360px), sichtbarer Text
                bleibt unveraendert. break-words auf h2Class als Absicherung. */}
            <h2 className={h2Class}>
              {'Verbraucher\u00ADstreit\u00ADbeilegung/Universal\u00ADschlichtungs\u00ADstelle'}
            </h2>
            <p className={pClass}>
              Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle weder verpflichtet noch bereit.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
