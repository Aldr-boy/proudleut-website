import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getBands } from '@/lib/airtable/queries';
import type { Band } from '@/lib/types/band';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Über mich – proudleut',
  description:
    'Alexander Dressler über proudleut, Livebands und die Idee, Veranstalter und Bands persönlich zusammenzubringen.',
  openGraph: {
    title: 'Über mich – proudleut',
    description:
      'Alexander Dressler über proudleut, Livebands und die Idee, Veranstalter und Bands persönlich zusammenzubringen.',
    type: 'website',
  },
};

const MGMT_BANDS = [
  { name: 'San2 & His Soul Patrol', sub: 'Blues, Soul & Rhythm’n’Blues' },
  { name: 'Donnaweda', sub: 'Bayerische Partyband' },
  { name: 'Freunde des Brautpaares', sub: 'Akustische Hochzeitsmusik' },
  { name: 'Silk & Sound', sub: 'Eventband für besondere Feiern' },
];

function findBand(bands: Band[], name: string): Band | undefined {
  return bands.find((b) => b.name.toLowerCase() === name.toLowerCase());
}

export default async function UeberMichPage() {
  const allBands = await getBands();

  return (
    <main>
      {/* Hero */}
      <section className="bg-pl-stage py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="order-2 md:order-1">
              <p className="text-pl-accent-light text-sm font-medium tracking-wider uppercase mb-5">
                Persönlich hinter proudleut
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-pl-on-stage mb-6 leading-tight">
                Servus, ich bin Alex.
              </h1>
              <p className="text-base md:text-lg text-pl-on-stage-muted leading-relaxed">
                Ich arbeite seit vielen Jahren mit Livebands und Veranstaltern – als Musikmanager
                im Livebereich, Organisator und persönlicher Ansprechpartner. Mit proudleut bringe
                ich Menschen zusammen, die für besondere Momente die passende Musik suchen.
              </p>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative w-full max-w-sm mx-auto md:max-w-none aspect-[4/5] rounded-2xl overflow-hidden">
                <Image
                  src="/images/alexander-dressler-about.webp"
                  alt="Alexander Dressler – Gründer von proudleut"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 50vw, 384px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Warum proudleut? */}
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="max-w-[900px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-10">Warum proudleut?</h2>
            <div className="divide-y divide-pl-soft">
              <div className="py-6 sm:grid sm:grid-cols-[220px_1fr] sm:gap-10 sm:items-start">
                <p className="text-pl-text-hint text-sm font-semibold mb-2 sm:mb-0">Direkte Verbindung</p>
                <p className="text-pl-text-muted leading-relaxed">
                  Ich bringe Bands und Veranstalter zusammen – persönlich, nicht anonym.
                  Kein anonymes Formular, kein Buchungsportal.
                </p>
              </div>
              <div className="py-6 sm:grid sm:grid-cols-[220px_1fr] sm:gap-10 sm:items-start">
                <p className="text-pl-text-hint text-sm font-semibold mb-2 sm:mb-0">Orientierung statt Auswahl</p>
                <p className="text-pl-text-muted leading-relaxed">
                  Gute Bands gibt es viele – aber die passende für ein Event zu finden, ist oft
                  mühsam. Gleichzeitig ist es für Bands schwer, sichtbar zu werden, ohne in einer
                  anonymen Datenbank unterzugehen.
                </p>
              </div>
              <div className="py-6 sm:grid sm:grid-cols-[220px_1fr] sm:gap-10 sm:items-start">
                <p className="text-pl-text-hint text-sm font-semibold mb-2 sm:mb-0">Persönlich. Ehrlich.</p>
                <p className="text-pl-text-muted leading-relaxed">
                  Bei proudleut geht es nicht darum, möglichst viele Bands aufzulisten. Es geht
                  darum, Menschen miteinander zu verbinden – übersichtlich und mit direktem Kontakt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Was ich mache */}
      <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-8">Was ich mache</h2>
            <div className="space-y-5">
              <p className="text-lg md:text-xl font-medium text-pl-text leading-snug">
                Ich verbinde Bands und Veranstalter – persönlich, nicht anonym.
              </p>
              <p className="text-base md:text-lg text-pl-text-muted leading-relaxed">
                Ich kenne viele Bands direkt, weiß, wie sie live funktionieren und zu welchem
                Anlass sie passen. Wenn du eine Empfehlung von mir bekommst, kommt sie nicht aus
                einer automatischen Auswahl, sondern aus Erfahrung, Bauchgefühl und vielen echten
                Begegnungen mit Musikerinnen, Musikern und Veranstaltern.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wie ich arbeite */}
      <section className="bg-pl-canvas py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-12">Wie ich arbeite</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <p className="text-pl-accent text-sm font-mono tracking-widest mb-2">01</p>
              <h3 className="text-pl-text font-bold text-xl mb-4">Zuhören</h3>
              <p className="text-pl-text-muted leading-relaxed">
                Was ist geplant, welche Stimmung soll entstehen, welche Band könnte wirklich passen?
                Ich fange mit Fragen an, nicht mit Empfehlungen.
              </p>
            </div>
            <div>
              <p className="text-pl-accent text-sm font-mono tracking-widest mb-2">02</p>
              <h3 className="text-pl-text font-bold text-xl mb-4">Einordnen</h3>
              <p className="text-pl-text-muted leading-relaxed">
                Manchmal muss es schnell gehen – manchmal liegt die Lösung näher als gedacht.
                Ich kenne viele Bands direkt und weiß, wie sie live funktionieren.
              </p>
            </div>
            <div>
              <p className="text-pl-accent text-sm font-mono tracking-widest mb-2">03</p>
              <h3 className="text-pl-text font-bold text-xl mb-4">Verbinden</h3>
              <p className="text-pl-text-muted leading-relaxed">
                Wenn eine Band nicht passt, sag ich das. Lieber eine klare Einschätzung als
                irgendeine Empfehlung – dann klappt's beim nächsten Termin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bands, die ich aktiv betreue */}
      <section className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="max-w-[960px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-4">
              Bands, die ich aktiv betreue
            </h2>
            <p className="text-pl-on-stage-muted leading-relaxed mb-10">
              Neben proudleut bin ich selbst im Booking und Management aktiv. Dadurch kenne ich
              beide Seiten: was Veranstalter brauchen – und wie es auf Bandseite wirklich läuft.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MGMT_BANDS.map(({ name, sub }) => {
                const band = findBand(allBands, name);
                if (band) {
                  return (
                    <Link
                      key={name}
                      href={`/band/${band.slug}`}
                      className="rounded-xl bg-pl-stage-elevated border border-pl-stage px-5 py-4 hover:border-pl-accent-light motion-safe:transition-colors group"
                    >
                      <p className="text-pl-on-stage font-semibold group-hover:text-pl-accent-light motion-safe:transition-colors">
                        {name}
                      </p>
                      <p className="text-pl-on-stage-muted text-sm mt-1">{sub}</p>
                    </Link>
                  );
                }
                return (
                  <div key={name} className="rounded-xl bg-pl-stage-elevated border border-pl-stage px-5 py-4">
                    <p className="text-pl-on-stage font-semibold">{name}</p>
                    <p className="text-pl-on-stage-muted text-sm mt-1">{sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pl-stage py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="max-w-[760px] mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-4">
              Klingt das interessant?
            </h2>
            <p className="text-pl-on-stage-muted text-lg mb-10 leading-relaxed">
              Erzähl mir kurz, was du planst — ich melde mich persönlich bei dir.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/bands"
                className="inline-flex items-center px-6 py-3 rounded-full bg-pl-accent text-pl-on-accent font-semibold hover:opacity-90 motion-safe:transition-opacity"
              >
                Bands entdecken
              </Link>
              <a
                href="mailto:alexander.dressler@proudleut.com"
                className="inline-flex items-center px-6 py-3 rounded-full border border-pl-stage text-pl-on-stage-muted hover:border-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
              >
                Kontakt aufnehmen
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
