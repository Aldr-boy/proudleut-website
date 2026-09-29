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

            <p className={pClass}>
              Alexander Dressler
              <br />
              Am Rohrfeld 24
              <br />
              92360 Mühlhausen
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

            <h2 className={h2Class}>Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
            <p className={pClass}>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>

            <p className={pClass}>
              Quelle:{' '}
              <a
                href="https://www.e-recht24.de/impressum-generator.html"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                https://www.e-recht24.de/impressum-generator.html
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
