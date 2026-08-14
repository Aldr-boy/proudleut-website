import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Für Bands – proudleut',
  description:
    'Ihr seid eine Liveband, ein Ensemble oder ein Solo-Act? proudleut zeigt euch mit echtem Profil, Live-Eindruck und direktem Kontakt für Veranstalter.',
  openGraph: {
    title: 'Für Bands – proudleut',
    description:
      'Ihr seid eine Liveband, ein Ensemble oder ein Solo-Act? proudleut zeigt euch mit echtem Profil, Live-Eindruck und direktem Kontakt für Veranstalter.',
    type: 'website',
  },
};

// San2-Beispielprofil (Profil-Demo, Sektion 02) -- reale, geprüfte Werte
// von /band/san2-and-his-soul-patrol, siehe vorherige Korrekturrunde.
const SAN2_KLINGT_NACH = ['Konzertant & hochwertig', 'Authentisch und handgemacht', 'Generationenverbindend'];
const SAN2_META = [
  { label: 'Besetzung', value: 'Liveband' },
  { label: 'Herkunft', value: 'München' },
  { label: 'Spielt bei', value: 'Konzert, Festival, Open Air' },
];

const PROFILE_POINTS = [
  {
    title: 'Atmosphäre statt Datenblatt',
    desc: 'Fotos, Video und Text zeigen, wer hinter der Band steckt.',
  },
  {
    title: 'Passend eingeordnet',
    desc: 'Anlass, Stil, Region und „Klingt nach" helfen bei der Einordnung.',
  },
  {
    title: 'Direkter Kontakt',
    desc: 'Eine Anfrage landet direkt bei der Band.',
  },
];

const BENEFITS = [
  {
    n: '01',
    title: 'Sichtbar werden',
    desc: 'Dein Profil erscheint in Kategorien und Regionen, die zu deiner Band passen — nicht versteckt in einer Datenbank, sondern als eigenständige Präsentation.',
  },
  {
    n: '02',
    title: 'Über die eigene Region hinaus',
    desc: 'Nicht nur dort gefunden werden, wo man deine Band ohnehin kennt. Eine Band aus Amberg taucht so plötzlich für Veranstalter in Neumarkt, Ingolstadt oder Kelheim auf.',
  },
  {
    n: '03',
    title: 'Als passender Act wahrgenommen werden',
    desc: 'Nicht möglichst viele Anfragen, sondern passendere. Dein Profil steht im Umfeld anderer starker Acts — nach Anlass, Stil und Region.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Bandseite anfragen',
    desc: 'Ein paar Eckdaten und Links reichen, damit ich mir einen ersten Eindruck von deiner Band machen kann.',
  },
  {
    n: '02',
    title: 'Kurz kennenlernen',
    desc: 'Bevor eine Band auf proudleut kommt, telefonieren wir einmal miteinander. Kein Bewerbungsgespräch — ich möchte einfach wissen, wer hinter der Band steckt.',
  },
  {
    n: '03',
    title: 'Profil gemeinsam aufbauen',
    desc: 'Wenn es für beide Seiten passt, entsteht daraus das proudleut-Profil.',
  },
];

// Real, aktive und veröffentlichte Bandseiten (read-only gegen die
// bestehende Datenbasis geprüft) -- keine geratenen Slugs.
const PROOF_ACTS = [
  { name: 'Donnaweda', slug: 'donnaweda' },
  { name: 'Tegernseer Tanzlmusi', slug: 'tegernseer-tanzlmusi' },
  { name: 'Harmonic Brass', slug: 'harmonic-brass' },
  { name: 'San2 and His Soul Patrol', slug: 'san2-and-his-soul-patrol' },
  { name: 'Donikkl Crew', slug: 'donikkl-crew' },
];

const FAQ_ITEMS = [
  {
    q: 'Kostet ein Profil bei proudleut etwas?',
    a: 'Aktuell kostet ein Profil auf proudleut nichts. Mir ist wichtiger, dass gute Bands und Live-Acts sichtbar werden und die Plattform sinnvoll wächst. Falls sich daran irgendwann etwas ändert, kommuniziere ich das offen und rechtzeitig.',
  },
  {
    q: 'Bekomme ich dadurch sicher mehr Anfragen?',
    a: 'Nein, versprechen kann ich das nicht. proudleut kann aber helfen, dass deine Band in neuen Zusammenhängen sichtbar wird — zum Beispiel bei Veranstaltern außerhalb deiner direkten Region.',
  },
  {
    q: 'Wer bekommt die Anfragen?',
    a: 'Die Anfragen gehen direkt an dich beziehungsweise an die von dir angegebene Kontaktadresse.',
  },
  {
    q: 'Kann jede Band mitmachen?',
    a: 'Grundsätzlich ja. proudleut soll offen für viele gute Livebands, Duos und Solo-Acts sein. Wichtig ist nur, dass genug Material für ein sinnvolles Profil vorhanden ist: gute Fotos, ein kurzer Text, idealerweise Video und klare Kontaktdaten.',
  },
  {
    q: 'Brauche ich einen eigenen Band-Account?',
    a: 'Nein. Einen eigenen Band-Account gibt es bei proudleut nicht. Ich lege und pflege die Bandseiten selbst. Wenn wir nach dem ersten Telefonat merken, dass es passt, bekommst du einen kurzen Fragebogen. So habe ich Texte, Fotos, Videos, Links und Kontaktdaten gesammelt an einem Ort und kann deine Bandseite sauber aufbauen.',
  },
];

// Kleine violette Nummerierung (ersetzt die frühere große Ghost-Ziffer aus
// dem F2-Layoutpass) -- gemeinsames Muster für Nutzen (03) und Ablauf (06).
function StepNumber({ n }: { n: string }) {
  return <p className="text-[15px] font-bold text-pl-accent tracking-[0.08em]">{n}</p>;
}

export default function FuerBandsPage() {
  return (
    <main>

      {/* 01 — Hero (Leitmoment, pl-display-1) */}
      <section className="bg-pl-stage pt-24 md:pt-40 pb-24 md:pb-40 px-4 sm:px-6">
        <div className="pl-container-shell">
          <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider">
            Für Livebands, Duos &amp; Solo-Acts
          </p>
          <h1 className="pl-display-1 mt-4 md:mt-7 text-pl-on-stage max-w-[1020px] text-balance">
            Deine Musik sichtbar machen — in einem Umfeld, das zu dir passt.
          </h1>
          <p className="mt-9 md:mt-14 text-[17px] md:text-xl leading-relaxed text-pl-on-stage-muted max-w-[560px]">
            Auf proudleut bekommt deine Band eine eigene Seite mit Bildern, Video, musikalischer
            Einordnung und direkter Anfrage.
          </p>
          <div className="mt-11 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <a
              href="#kontakt"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-base font-semibold
                         bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                         hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--pl-accent-on-stage)]"
            >
              Bandseite anfragen
            </a>
            <span className="text-[15px] text-pl-on-stage-muted">
              Direkter Kontakt&nbsp;&nbsp;·&nbsp;&nbsp;Keine Buchungsplattform
            </span>
          </div>
        </div>
      </section>

      {/* 02 — Profil-Demo */}
      <section className="bg-pl-paper pt-16 md:pt-28 pb-12 md:pb-20 px-4 sm:px-6">
        <div className="pl-container-shell">
          <p className="text-sm font-semibold text-pl-text-muted uppercase tracking-wider">
            Profil-Demo
          </p>
          <h2 className="mt-4 md:mt-7 text-2xl md:text-3xl font-bold text-pl-text max-w-[620px]">
            So kann deine Band auf proudleut aussehen.
          </h2>

          {/* pl-media-wide: San2-Beispielprofil als breiter Medienmoment.
              Mobile full-bleed (negative Section-Padding), Desktop innerhalb
              des Containers mit Radius. Regelt Format/Crop/Overlay -- nicht
              die Farbigkeit des Fotos (Original ist schwarzweiß). */}
          <div className="mt-9 md:mt-14 relative -mx-4 sm:-mx-6 md:mx-0 aspect-[4/3] md:aspect-[8/3] md:rounded-[20px] overflow-hidden">
            <Image
              src="/images/fuer-bands/profil-mockup-live.jpg"
              alt="San2 and His Soul Patrol live – Beispielprofil auf proudleut"
              fill
              className="object-cover"
              style={{ objectPosition: 'center 45%' }}
              sizes="(max-width: 768px) 100vw, 1140px"
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(20,14,29,0) 40%, rgba(20,14,29,0.85) 100%)',
              }}
            />
            <div className="absolute left-6 right-6 md:left-11 md:right-11 bottom-5 md:bottom-9 flex flex-col items-start gap-2 md:gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs md:text-sm font-semibold bg-pl-elevated text-pl-text">
                Blues
              </span>
              <p className="text-2xl md:text-4xl font-extrabold text-pl-on-stage leading-tight">
                San2 and His Soul Patrol
              </p>
              <p className="text-sm md:text-base text-pl-on-stage-muted">
                Bayern · München und Umgebung
              </p>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 lg:gap-[72px]">
            {/* Bandprofil-Inhalt */}
            <div>
              <p className="italic text-lg md:text-[22px] leading-relaxed text-pl-text max-w-[34ch]">
                „San2 zählt zu den markantesten Soul- und Bluessängern Deutschlands."
              </p>

              <p className="mt-8 md:mt-9 text-xs font-semibold text-pl-text-muted uppercase tracking-wider">
                Klingt nach
              </p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {SAN2_KLINGT_NACH.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border"
                    style={{
                      backgroundColor: 'rgba(233,196,106,0.14)',
                      borderColor: 'rgba(233,196,106,0.38)',
                      color: '#8a6200',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-9 md:mt-10 pt-6 border-t border-pl-soft grid grid-cols-1 sm:grid-cols-3 gap-x-8 divide-y divide-pl-soft sm:divide-y-0">
                {SAN2_META.map(({ label, value }) => (
                  <div key={label} className="flex items-baseline justify-between py-3 sm:block sm:py-0">
                    <p className="text-[10px] uppercase tracking-wider text-pl-text-muted sm:mb-1.5">
                      {label}
                    </p>
                    <p className="text-sm font-bold text-pl-text">{value}</p>
                  </div>
                ))}
              </div>

              {/* Demonstration -- keine echten Buttons, siehe aria-hidden */}
              <div className="mt-8 md:mt-9 flex flex-wrap gap-3.5">
                <div
                  className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                             bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]"
                  aria-hidden="true"
                >
                  Band über proudleut anfragen
                </div>
                <div
                  className="inline-flex items-center px-6 py-3 rounded-full text-sm font-medium
                             text-pl-text-muted border border-pl-medium"
                  aria-hidden="true"
                >
                  ♡ Band merken
                </div>
              </div>
            </div>

            {/* pl-aside: proudleut-Erklärung, bewusst getrennt vom Bandprofil */}
            <div className="bg-pl-canvas border-l border-pl-soft px-6 md:px-8 py-7 md:py-9 flex flex-col gap-6 md:gap-8">
              {PROFILE_POINTS.map(({ title, desc }) => (
                <div key={title}>
                  <p className="text-base font-bold text-pl-text">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-pl-text-muted">{desc}</p>
                </div>
              ))}
              <div className="pt-6 md:pt-7 border-t border-pl-soft">
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider">
                  Aus Musiker-Sicht
                </p>
                <p className="mt-3 text-sm md:text-base italic leading-relaxed text-pl-text">
                  „Mit Alex zu arbeiten ist angenehm — strukturiert, entspannt und zuverlässig.
                  Er behält den Überblick, reagiert schnell und bleibt menschlich."
                </p>
                <p className="mt-3 text-sm font-bold text-pl-text">Dominik Palmer</p>
                <p className="text-xs text-pl-text-muted mt-0.5">Bassist &amp; Bandleader, More Candy</p>
              </div>
            </div>
          </div>

          <p className="mt-9 md:mt-12 text-xs text-pl-text-muted">
            Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.
          </p>
        </div>
      </section>

      {/* 03 — Was bringt dir proudleut? */}
      <section className="bg-pl-canvas pt-16 md:pt-28 pb-16 md:pb-28 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text">
              Was bringt dir proudleut?
            </h2>
            <p className="mt-9 md:mt-14 text-xl md:text-[28px] font-semibold leading-snug text-pl-text max-w-[26ch]">
              Ein Profil bei proudleut ist kein Versprechen auf Buchungen.{' '}
              <span className="text-pl-text-muted">
                Aber es kann helfen, dass deine Band dort sichtbar wird, wo Veranstalter wirklich
                suchen.
              </span>
            </p>

            <div className="mt-16 md:mt-[72px] border-t border-pl-soft">
              <div className="divide-y divide-pl-soft">
                {BENEFITS.map(({ n, title, desc }) => (
                  <div key={n} className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-x-6 gap-y-2.5 py-7 md:py-11">
                    <StepNumber n={n} />
                    <div>
                      <p className="text-lg md:text-[22px] font-bold text-pl-text">{title}</p>
                      <p className="mt-2 md:mt-3 text-base md:text-[17px] leading-[1.65] text-pl-text-muted max-w-[58ch]">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — Was proudleut ist (Leitmoment, pl-display-2, hellste Fläche) */}
      <section className="bg-pl-elevated pt-24 md:pt-40 pb-24 md:pb-40 px-4 sm:px-6">
        <div className="pl-container-shell">
          <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider">
            Was proudleut ist — und was nicht
          </p>
          <h2 className="pl-display-2 mt-6 md:mt-8 text-pl-text max-w-[19ch] text-balance">
            proudleut ist kein Buchungsportal und kein Vergleichssystem.
          </h2>
          <p className="mt-9 text-lg md:text-[22px] leading-[1.55] text-pl-text-muted max-w-[33ch]">
            Es ist ein persönlich gepflegter Ort für Live-Acts, die in einem passenden Umfeld
            sichtbar sein möchten.
          </p>

          <div className="mt-16 md:mt-[88px] grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-14 lg:gap-[120px]">
            <div className="max-w-[56ch]">
              <p className="text-[18px] leading-[1.7] text-pl-text">
                Ich baue und pflege proudleut persönlich. Ich komme aus dem Livemusik-Geschäft und
                weiß, wie viel in einer guten Band steckt: Sound, Haltung, Erfahrung und
                Bühnenmomente. Genau das soll ein Profil sichtbar machen.
              </p>
              <p className="mt-7 text-[18px] leading-[1.7] text-pl-text">
                Ein Profil entsteht auf proudleut nicht per Formular und Klick auf
                „Veröffentlichen". Ich schaue mir die Band vorher an, und wir telefonieren einmal
                miteinander. Mir ist wichtig zu wissen, wer hinter einem Act steckt, bevor ich ihn
                auf proudleut vorstelle. Danach bauen wir gemeinsam ein Profil, das deine Band so
                zeigt, wie sie wirklich ist, und Veranstaltern hilft, sie richtig einzuordnen.
              </p>
            </div>

            {/* "Kurz gesagt" -- freie Hairline-Liste, bewusst kein Kasten/Schatten */}
            <div>
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider pb-5">
                Kurz gesagt
              </p>
              <div className="border-t border-pl-soft">
                {[
                  { nicht: 'Preisvergleich', sondern: 'ein echtes Profil mit Atmosphäre' },
                  { nicht: 'Bewertungssystem', sondern: 'wertschätzende Einordnung nach Stil, Anlass und Region' },
                  { nicht: 'anonymer Marktplatz', sondern: 'direkter Kontakt zwischen Veranstalter und Act' },
                ].map(({ nicht, sondern }) => (
                  <div key={nicht} className="border-b border-pl-soft py-4 md:py-5">
                    <p className="text-sm text-pl-text-hint">Nicht: {nicht}</p>
                    <p className="mt-1.5 text-base font-bold text-pl-text">{sondern}</p>
                  </div>
                ))}
                <div className="border-b border-pl-soft py-4 md:py-5">
                  <p className="text-sm text-pl-text-hint">Und was kostet das?</p>
                  <p className="mt-1.5 text-base font-bold text-pl-text">Aktuell kostet ein Profil nichts.</p>
                  <p className="mt-2 text-sm leading-relaxed text-pl-text-muted">
                    Falls sich das irgendwann ändert, kommuniziere ich das offen und rechtzeitig.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — Acts (dunkler Zwischenakkord, pl-display-2) */}
      <section className="bg-pl-stage pt-16 md:pt-28 pb-16 md:pb-28 px-4 sm:px-6 text-center">
        <div className="max-w-[900px] mx-auto">
          <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider">
            Acts auf proudleut
          </p>
          <h2 className="pl-display-2 mt-6 md:mt-7 text-pl-on-stage text-balance">
            Über 140 Live-Acts auf proudleut
          </h2>
          <p className="mt-8 text-lg leading-loose text-pl-accent-light">
            {PROOF_ACTS.map(({ name, slug }, i) => (
              <span key={slug}>
                {i > 0 && ' · '}
                <Link
                  href={`/band/${slug}`}
                  className="hover:text-pl-on-stage motion-safe:transition-colors font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
                >
                  {name}
                </Link>
              </span>
            ))}
            {' · '}…
          </p>
        </div>
      </section>

      {/* 06 — So läuft's */}
      <section className="bg-pl-canvas pt-16 md:pt-28 pb-8 md:pb-12 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text">
              So läuft&apos;s
            </h2>
            <p className="mt-4 md:mt-5 text-base md:text-lg text-pl-text-muted">
              Was passiert, wenn du deine Band vorstellst?
            </p>
          </div>

          <div className="mt-9 md:mt-14 flex flex-col md:grid md:grid-cols-3 gap-8 md:gap-14">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="border-t border-pl-soft pt-[18px] md:pt-6">
                <StepNumber n={n} />
                <p className="mt-2.5 text-lg md:text-[22px] font-bold text-pl-text">{title}</p>
                <p className="mt-2 text-[15px] md:text-base leading-[1.65] text-pl-text-muted">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 07 — FAQ (leise Phase, bewusst Unterabschnitt von "So läuft's": gleiche
          Fläche, kein neuer Hintergrund, kleinere Heading-Stufe, schmalerer
          Container) */}
      <section className="bg-pl-canvas pt-12 md:pt-20 pb-16 md:pb-28 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[760px]">
            <h2 className="text-[22px] md:text-[28px] font-extrabold leading-[1.25] text-pl-text">
              Häufige Fragen
            </h2>
            <div className="mt-6 divide-y divide-pl-soft border-t border-pl-soft">
              {FAQ_ITEMS.map(({ q, a }) => (
                <details key={q} className="group py-4 md:py-6">
                  <summary className="flex justify-between items-center gap-4 cursor-pointer list-none">
                    <span className="text-base font-semibold text-pl-text">{q}</span>
                    <span
                      className="shrink-0 text-xl leading-none text-pl-text-muted
                                 motion-safe:transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-sm md:text-base text-pl-text-muted leading-relaxed">
                    {a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 08 — Finale (Leitmoment, Spiegel des Heros: pl-display-1, zentriert) */}
      <section id="kontakt" className="bg-pl-stage pt-24 md:pt-40 pb-16 md:pb-24 px-4 sm:px-6 text-center">
        <div className="max-w-[900px] mx-auto">
          <h2 className="pl-display-1 text-pl-on-stage max-w-[16ch] mx-auto text-balance">
            Du möchtest deine Band auf proudleut zeigen?
          </h2>
          <p className="mt-9 text-[17px] md:text-xl leading-relaxed text-pl-on-stage-muted max-w-[46ch] mx-auto">
            Schick mir ein paar Infos und Links zu deiner Band. Ich schaue sie mir in Ruhe an und
            melde mich bei dir.
          </p>
          <div className="mt-12">
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full text-base font-semibold
                         bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                         hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--pl-accent)]"
            >
              Bandseite anfragen
            </a>
          </div>
          <p className="mt-9 text-sm text-pl-on-stage-muted">
            Wer dahintersteckt und warum es proudleut gibt{' '}
            <Link
              href="/ueber-mich"
              className="text-pl-accent-light font-medium hover:text-pl-on-stage motion-safe:transition-colors"
            >
              — Über proudleut
            </Link>
          </p>
        </div>
      </section>

    </main>
  );
}
