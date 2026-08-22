import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Über proudleut – proudleut',
  description:
    'Warum es proudleut gibt, wer dahintersteht und wie proudleut Veranstaltern und Bands hilft, zueinander zu finden.',
  openGraph: {
    title: 'Über proudleut – proudleut',
    description:
      'Warum es proudleut gibt, wer dahintersteht und wie proudleut Veranstaltern und Bands hilft, zueinander zu finden.',
    type: 'website',
  },
};

const CHAPTERS = [
  { n: '01', label: 'Warum es proudleut gibt' },
  { n: '02', label: 'Wer dahintersteht' },
  { n: '03', label: 'Was proudleut ist' },
  { n: '04', label: 'Beide Seiten' },
  { n: '05', label: 'Wie proudleut gedacht ist' },
];

// Bands, die Alex selbst im Booking betreut -- reale, aktive und
// veröffentlichte Bandseiten, read-only gegen die Datenbasis geprüft
// (Supabase, derselbe Stand, den /band/[slug] tatsächlich rendert).
const MANAGED_BANDS = [
  { name: 'Donnaweda', slug: 'donnaweda', genre: 'Bayerische Partyband' },
  { name: 'San2 and His Soul Patrol', slug: 'san2-and-his-soul-patrol', genre: 'Blues, Soul & Rhythm’n’Blues' },
  { name: 'Freunde des Brautpaares', slug: 'freunde-des-brautpaares', genre: 'Akustische Hochzeitsmusik' },
  { name: 'Silk and Sound', slug: 'silk-and-sound', genre: 'Eventband für besondere Feiern' },
];

const PRINZIPIEN = [
  {
    n: '01',
    title: 'Zeigen statt verkaufen',
    desc: 'Kein Profil muss behaupten, eine Band sei „einzigartig" und „unvergesslich". Die Bandprofile sind bewusst auf den Kern reduziert. Die wichtigsten Infos sollen zeigen, was eine Band ausmacht und wofür sie steht.',
  },
  {
    n: '02',
    title: 'Einordnen statt bewerten',
    desc: 'proudleut baut keine Rangliste der besten Bands. Eine hervorragende Band kann für einen Abend genau richtig sein und für den nächsten komplett falsch.',
  },
  {
    n: '03',
    title: 'Offen wachsen',
    desc: 'proudleut ist im Aufbau und soll um weitere Bands wachsen. Übersichtlich, verständlich und persönlich soll es dabei bleiben.',
  },
];

function ChapterEyebrow({ n, label }: { n: string; label: string }) {
  return (
    <>
      <p className="font-mono text-[13px] text-pl-text-hint mb-3">{n}</p>
      <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider">{label}</p>
    </>
  );
}

function ChapterEyebrowOnStage({ n, label }: { n: string; label: string }) {
  return (
    <>
      <p className="font-mono text-[13px] text-pl-accent-light mb-3">{n}</p>
      <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider">{label}</p>
    </>
  );
}

export default function UeberProudleutPage() {
  return (
    <main>

      {/* Hero */}
      <section className="bg-pl-stage pt-24 md:pt-40 pb-16 md:pb-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <p className="text-xs font-semibold text-pl-accent-light uppercase tracking-wider">
            Über proudleut
          </p>
          <h1 className="pl-display-1 mt-5 md:mt-7 text-pl-on-stage max-w-[980px] text-balance">
            Es gibt wahnsinnig viele gute Bands.
            <br />
            <span className="text-pl-on-stage-muted">Das ist nicht das Problem.</span>
          </h1>
          <p className="mt-9 md:mt-11 text-[17px] md:text-xl leading-relaxed text-pl-on-stage-muted max-w-[540px]">
            Das Problem ist herauszufinden, welche davon zu deinem Event passt — und welche eher
            nicht. Genau dafür gibt es proudleut.
          </p>

          <div className="mt-14 md:mt-20 pt-6 border-t border-pl-stage flex flex-wrap gap-x-9 gap-y-2">
            {CHAPTERS.map(({ n, label }) => (
              <span key={n} className="font-mono text-xs text-pl-on-stage-muted">
                <span className="text-pl-accent-light">{n}</span>&nbsp;&nbsp;{label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 01 — Warum es proudleut gibt */}
      <section className="bg-pl-paper pt-16 md:pt-28 pb-16 md:pb-24 px-4 sm:px-6">
        <div className="pl-container-shell grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-20">
          <div>
            <ChapterEyebrow n="01" label="Warum es proudleut gibt" />
          </div>
          <div>
            <h2 className="text-3xl md:text-[40px] leading-[1.15] font-extrabold tracking-tight text-pl-text max-w-[16ch]">
              Eine gute Band ist nicht automatisch die richtige Band.
            </h2>
            <div className="mt-9 md:mt-11 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-[820px]">
              <p className="text-base md:text-[17px] leading-[1.7] text-pl-text-muted">
                Ein Sommerfest im Biergarten, eine Hochzeit mit sechzig Gästen und
                Brautentführung, ein Stadtplatz mit großer Bühne — jeder dieser Abende braucht
                etwas anderes. Eine Band, die den einen Abend trägt, kann am anderen verloren
                wirken.
              </p>
              <p className="text-base md:text-[17px] leading-[1.7] text-pl-text-muted">
                proudleut nimmt dir die Bandentscheidung nicht ab. Aber es hilft beim Einordnen:
                Wie klingt eine Band? Wie tritt sie auf? Für welche Abende passt sie? Und was
                unterscheidet sie von anderen? Damit du selbst gut entscheiden kannst.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — Wer dahintersteht (Alex, Portrait überlappt in die nächste Fläche) */}
      <section className="bg-pl-stage pt-16 md:pt-28 md:pb-12 px-4 sm:px-6 relative">
        <div className="pl-container-shell grid grid-cols-1 md:grid-cols-[1fr_400px] gap-10 md:gap-16 items-start">
          <div className="pb-16 md:pb-28">
            <ChapterEyebrowOnStage n="02" label="Wer dahintersteht" />
            <h2 className="mt-7 text-4xl md:text-5xl font-extrabold tracking-tight text-pl-on-stage">
              Servus, ich bin Alex.
            </h2>
            <p className="mt-8 text-base md:text-[17px] leading-[1.7] text-pl-on-stage-muted max-w-[480px]">
              Ich arbeite seit vielen Jahren mit Livebands und Veranstaltern. Bandmanagement und
              Booking sind mein tägliches Geschäft: Anfragen, Gagen, Termine, Technik und alles,
              was zwischen Zusage und Auftritt passiert.
            </p>
            <p className="mt-5 text-base md:text-[17px] leading-[1.7] text-pl-on-stage-muted max-w-[480px]">
              proudleut ist aus dieser Arbeit entstanden. Nicht aus der Idee, noch ein weiteres
              Musikportal zu bauen, sondern aus einer Frage, die in diesem Geschäft ständig
              auftaucht: <strong className="text-pl-on-stage font-semibold">Passt diese Band wirklich zu diesem Abend?</strong>
            </p>
          </div>
          <div className="relative z-10 mb-[-56px] md:mb-[-90px] pb-8 md:pb-0">
            <div className="relative w-full max-w-[320px] md:max-w-none mx-auto aspect-[4/5] rounded-2xl overflow-hidden shadow-pl-photo">
              <Image
                src="/images/alexander-dressler-about.webp"
                alt="Alex, Booking und Bandmanagement bei proudleut"
                fill
                className="object-cover object-[90%_20%]"
                sizes="(min-width: 768px) 400px, 320px"
                priority
              />
            </div>
            <p className="hidden md:block mt-3.5 font-mono text-xs text-pl-on-stage-muted">
              Alex — Booking, Bandmanagement, proudleut.
            </p>
          </div>
        </div>
      </section>

      {/* 03 — Was proudleut ist — und was nicht */}
      <section className="bg-pl-paper pt-20 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6">
        <div className="pl-container-shell grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-20">
          <div>
            <ChapterEyebrow n="03" label="Was proudleut ist — und was nicht" />
          </div>
          <div>
            <h2 className="text-3xl md:text-[40px] leading-[1.15] font-extrabold tracking-tight text-pl-text max-w-[15ch]">
              proudleut ist keine Agentur.
            </h2>
            <p className="mt-9 text-base md:text-[17px] leading-[1.7] text-pl-text-muted max-w-[62ch]">
              Als Band auf proudleut präsent zu sein heißt nicht, von mir vertreten zu werden.
              Die meisten Bands kümmern sich unabhängig von mir um ihr Booking. Bei einigen bin
              ich selbst im Booking tätig, das kennzeichne ich offen. proudleut ist eine
              Plattform für Livemusik: Bands können zeigen, was sie im Kern ausmacht.
              Veranstalter können sich schnell ein Bild machen, Bands einordnen und direkt
              anfragen.
            </p>

            <div className="mt-14 md:mt-16 pt-10 md:pt-14 border-t border-pl-soft max-w-[680px]">
              <h3 className="text-xl md:text-[26px] leading-[1.2] font-extrabold tracking-tight text-pl-text">
                Noch lange nicht fertig.
              </h3>
              <p className="mt-5 text-base md:text-[17px] leading-[1.7] text-pl-text-muted">
                Heute zeigt proudleut einen Ausschnitt dessen, was an guten Bands in und um
                Bayern unterwegs ist. Dieser Ausschnitt soll wachsen — mit neuen Bands, neuen
                Stilrichtungen und neuen Regionen. Das Ziel ist nicht, irgendwann möglichst
                viele Namen auf einer Seite zu haben.
              </p>
              <p className="mt-6 text-lg md:text-xl leading-[1.4] font-extrabold tracking-tight text-pl-accent">
                Sondern einen Ort zu bauen, an dem man Livemusik wirklich entdecken, verstehen
                und einordnen kann.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — Beide Seiten + Offen gesagt */}
      <section className="bg-pl-paper pt-16 md:pt-28 border-t border-pl-soft">
        <div className="px-4 sm:px-6">
          <div className="pl-container-shell">
            <div className="max-w-[620px]">
              <ChapterEyebrow n="04" label="Beide Seiten" />
              <h2 className="mt-7 text-3xl md:text-[40px] leading-[1.15] font-extrabold tracking-tight text-pl-text">
                Ich sitze auf beiden Seiten des Tisches.
              </h2>
            </div>

            <div className="mt-12 md:mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-0">
              <div className="md:pr-14 md:border-r border-pl-soft">
                <p className="text-lg font-bold text-pl-text mb-3.5">Veranstalterseite</p>
                <p className="text-base md:text-[17px] leading-[1.7] text-pl-text-muted">
                  Was kostet eine Band? Passt sie zum Anlass? Wie läuft so eine Anfrage überhaupt
                  ab? Diese Fragen höre ich oft. proudleut soll möglichst viel davon schon klären,
                  bevor überhaupt eine Anfrage rausgeht.
                </p>
              </div>
              <div className="md:pl-14">
                <p className="text-lg font-bold text-pl-text mb-3.5">Bandseite</p>
                <p className="text-base md:text-[17px] leading-[1.7] text-pl-text-muted">
                  Und ich weiß, was auf der anderen Seite passiert: wie eine gute Anfrage aussieht,
                  was ein Termin organisatorisch bedeutet, was technisch und wirtschaftlich
                  funktionieren muss. Diese Erfahrung steckt im Aufbau von proudleut.
                </p>
              </div>
            </div>

            {/* Offen gesagt */}
            <div className="mt-20 md:mt-28 pt-12 md:pt-16 border-t border-pl-soft grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 md:gap-20 pb-16 md:pb-24">
              <div>
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider">
                  Offen gesagt
                </p>
              </div>
              <div>
                <p className="text-xl md:text-[28px] leading-[1.3] font-extrabold tracking-tight text-pl-text max-w-[560px]">
                  Vier der Bands auf proudleut betreue ich selbst im Booking.
                  <span className="text-pl-accent">*</span>
                </p>

                <div className="mt-9 border-t border-pl-soft max-w-[760px]">
                  {MANAGED_BANDS.map(({ name, slug, genre }) => (
                    <div
                      key={slug}
                      className="border-b border-pl-soft py-4 flex flex-col gap-1 md:flex-row md:items-baseline md:gap-6"
                    >
                      <Link
                        href={`/band/${slug}`}
                        className="shrink-0 md:w-[280px] font-bold text-pl-text border-b border-pl-accent/40 hover:text-pl-accent hover:border-pl-accent motion-safe:transition-colors self-start"
                      >
                        {name}
                      </Link>
                      <p className="flex-1 text-sm md:text-[15px] text-pl-text-muted">{genre}</p>
                      <p className="font-mono text-xs text-pl-accent shrink-0">Booking: Alex</p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-sm leading-relaxed text-pl-text-muted max-w-[560px]">
                  <span className="text-pl-accent">*</span>&nbsp;Das ist auch auf den jeweiligen
                  Profilen offen gekennzeichnet. Über die Bandnamen kommst du direkt dorthin — und
                  kannst dir selbst ein Bild davon machen, wie die Bands auf proudleut vorgestellt
                  werden.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — Wie proudleut gedacht ist */}
      <section className="bg-pl-canvas pt-20 md:pt-32 pb-20 md:pb-28 px-4 sm:px-6">
        <div className="pl-container-shell grid grid-cols-1 md:grid-cols-[400px_1fr] gap-8 md:gap-20">
          <div>
            <ChapterEyebrow n="05" label="Wie proudleut gedacht ist" />
            <h2 className="mt-7 text-3xl md:text-[38px] leading-[1.15] font-extrabold tracking-tight text-pl-text">
              Was mir bei Proudleut wichtig ist.
            </h2>
          </div>
          <div>
            <div className="border-t border-pl-soft">
              {PRINZIPIEN.map(({ n, title, desc }) => (
                <div key={n} className="border-b border-pl-soft py-8 flex gap-8">
                  <p className="font-mono text-[13px] text-pl-accent shrink-0 w-6 pt-1">{n}</p>
                  <div>
                    <p className="text-lg md:text-xl font-bold text-pl-text mb-2.5">{title}</p>
                    <p className="text-[15px] md:text-base leading-[1.65] text-pl-text-muted max-w-[480px]">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-[15px] leading-[1.65] text-pl-text-muted max-w-[520px]">
              Du spielst selbst in einer Band? Auf „Für Bands" erzähle ich genauer, wie proudleut
              mit Bands arbeitet — und wie der Weg hierher aussieht.{' '}
              <Link
                href="/fuer-bands"
                className="font-semibold text-pl-accent border-b border-pl-accent/40 hover:border-pl-accent motion-safe:transition-colors whitespace-nowrap"
              >
                Für Bands →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Abschluss -- San2-Livefoto als Hintergrund statt eines eigenen
          alleinstehenden Fotoblocks (siehe components/homepage/CTASection.tsx
          fuer dasselbe Prinzip: volles Bild + radialer Dunkel-Verlauf +
          Text/CTAs darueber). Nicht 1:1 uebernommen: Overlay bewusst
          schwaecher, da das San2-Foto selbst schon eine dunkle, warme
          Lichtstimmung hat -- staerkeres Abdunkeln haette sie zunichte
          gemacht. Hoehe bleibt inhaltsgetrieben (bestehendes Padding), nicht
          die feste, deutlich groessere Aspect-Ratio des frueheren
          Fotoblocks. */}
      <section className="relative overflow-hidden pt-24 md:pt-36 pb-16 md:pb-24 px-4 sm:px-6 text-center">
        <Image
          src="/images/ueber-proudleut/san2-live.jpg"
          alt=""
          fill
          className="object-cover pointer-events-none"
          style={{ objectPosition: 'center 62%' }}
          sizes="100vw"
          quality={80}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 62% 78% at 50% 42%, rgba(18,16,26,0.72) 0%, rgba(18,16,26,0.46) 55%, rgba(18,16,26,0.18) 100%)',
          }}
        />
        <div className="relative z-10 max-w-[620px] mx-auto">
          <h2
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-pl-on-stage"
            style={{ textShadow: '0 2px 24px rgba(18,16,26,0.6)' }}
          >
            Schau dich in Ruhe um.
          </h2>
          <p
            className="mt-8 text-lg leading-relaxed text-pl-on-stage-muted max-w-[480px] mx-auto"
            style={{ textShadow: '0 1px 16px rgba(18,16,26,0.6)' }}
          >
            Und wenn du bei der Auswahl nicht weiterkommst: Erzähl mir kurz, was du planst. Ich
            melde mich persönlich.
          </p>
          <div className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-7">
            <Link
              href="/bands"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-base font-semibold
                         bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                         hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--pl-accent-on-stage)]"
            >
              Bands entdecken
            </Link>
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="text-base font-semibold text-pl-on-stage-muted border-b border-transparent hover:text-pl-on-stage hover:border-pl-on-stage-muted motion-safe:transition-colors"
              style={{ textShadow: '0 1px 16px rgba(18,16,26,0.6)' }}
            >
              Kontakt aufnehmen
            </a>
          </div>
        </div>
        <p
          className="absolute left-4 sm:left-6 bottom-3 z-10 font-mono text-[11px] font-normal text-pl-on-stage/70"
          style={{ textShadow: '0 1px 8px rgba(18,16,26,0.6)' }}
        >
          San2 and His Soul Patrol — live.
        </p>
      </section>

    </main>
  );
}
