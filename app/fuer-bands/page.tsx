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
    a: 'Nein. Einen eigenen Band-Account gibt es bei proudleut nicht. Ich lege und pflege die Bandseiten selbst im Backend. Wenn wir nach dem ersten Telefonat merken, dass es passt, bekommst du einen kurzen Fragebogen. So habe ich Texte, Fotos, Videos, Links und Kontaktdaten gesammelt an einem Ort und kann deine Bandseite sauber aufbauen.',
  },
];

function GhostNumber({ n }: { n: string }) {
  return (
    <p className="text-pl-text text-[44px] md:text-[72px] font-bold leading-[0.9] opacity-[0.14]">
      {n}
    </p>
  );
}

export default function FuerBandsPage() {
  return (
    <main>

      {/* 01 — Hero */}
      <section className="bg-pl-stage pt-24 md:pt-40 pb-16 md:pb-24 px-4 sm:px-6">
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-5">
            Für Livebands, Duos &amp; Solo-Acts
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-pl-on-stage leading-tight mb-6 text-pretty">
            Deine Musik sichtbar machen — in einem Umfeld, das zu dir passt.
          </h1>
          <p className="text-base md:text-lg text-pl-on-stage-muted leading-relaxed mb-10 max-w-[560px] mx-auto">
            Auf proudleut bekommt deine Band eine eigene Seite mit Bildern, Video, musikalischer
            Einordnung und direkter Anfrage.
          </p>
          <a
            href="#kontakt"
            className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                       bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                       hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-[var(--pl-accent-on-stage)]"
          >
            Bandseite anfragen
          </a>
          <p className="mt-7 text-[13px] text-pl-on-stage-muted">
            Direkter Kontakt&nbsp;&nbsp;·&nbsp;&nbsp;Keine Buchungsplattform
          </p>
        </div>
      </section>

      {/* 02 — Profil-Demo */}
      <section className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[640px] mb-12 md:mb-14">
            <p className="text-sm font-semibold text-pl-text-muted uppercase tracking-wider mb-4">
              Profil-Demo
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text text-pretty">
              So kann deine Band auf proudleut aussehen.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[600px_1fr] gap-10 lg:gap-16 items-start">

            {/* Mockup-Card */}
            <div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--pl-bg-stage-elevated, #1e1a28)',
                  border: '1px solid rgba(196,168,216,0.12)',
                }}
              >
                <div
                  className="relative aspect-video overflow-hidden"
                  style={{
                    background:
                      'radial-gradient(ellipse 70% 55% at 50% 15%, rgba(50,40,65,0.7) 0%, transparent 65%), linear-gradient(170deg, #211c2e 0%, #17131f 45%, #0e0c14 100%)',
                  }}
                >
                  <Image
                    src="/images/fuer-bands/profil-mockup-live.jpg"
                    alt="Liveband auf der Bühne – Beispielprofil auf proudleut"
                    fill
                    className="object-cover"
                    style={{ objectPosition: 'center 45%' }}
                    sizes="(max-width: 1024px) 100vw, 600px"
                  />
                  <div
                    className="absolute inset-0 z-10"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(18,16,26,0.97) 0%, rgba(18,16,26,0.55) 45%, rgba(18,16,26,0.08) 100%)',
                    }}
                  />
                  <div className="absolute bottom-0 left-0 p-5 z-20">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                      style={{
                        background: 'var(--pl-accent-subtle)',
                        color: 'var(--pl-accent-deep)',
                      }}
                    >
                      Blues
                    </span>
                    <p className="text-xl font-bold text-pl-on-stage leading-tight">
                      San2 and His Soul Patrol
                    </p>
                    <p className="text-xs text-pl-on-stage-muted mt-0.5">
                      Bayern · München und Umgebung
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-sm text-pl-on-stage-muted italic leading-relaxed mb-4">
                    „San2 zählt zu den markantesten Soul- und Bluessängern Deutschlands."
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-pl-on-stage-muted mb-2">
                    Klingt nach
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {['Konzertant & hochwertig', 'Authentisch und handgemacht', 'Generationenverbindend'].map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: 'var(--pl-accent-subtle)',
                          color: 'var(--pl-accent-deep)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    {[
                      { label: 'Besetzung', value: 'Liveband' },
                      { label: 'Herkunft', value: 'München' },
                      { label: 'Spielt bei', value: 'Konzert, Festival, Open Air' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] uppercase tracking-wider text-pl-on-stage-muted mb-0.5">
                          {label}
                        </p>
                        <p className="text-sm font-medium text-pl-on-stage">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div
                      className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold text-center
                                 bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]"
                      aria-hidden="true"
                    >
                      Band über proudleut anfragen
                    </div>
                    <div
                      className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-medium
                                 text-pl-on-stage-muted"
                      style={{ border: '1px solid rgba(196,168,216,0.25)' }}
                      aria-hidden="true"
                    >
                      ♡ Band merken
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-pl-text-muted text-center mt-4">
                Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.
              </p>
            </div>

            {/* Nutzenpunkte + Musiker-O-Ton */}
            <div className="pt-1 lg:pt-2">
              <div className="space-y-6">
                {PROFILE_POINTS.map(({ title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <span className="shrink-0 mt-0.5 text-pl-text-muted select-none">—</span>
                    <div>
                      <p className="text-sm font-semibold text-pl-text mb-0.5">{title}</p>
                      <p className="text-sm text-pl-text-muted leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-pl-soft">
                <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-3">
                  Aus Musiker-Sicht
                </p>
                <div
                  className="pl-4 border-l-2"
                  style={{ borderColor: 'rgba(117,81,139,0.20)' }}
                >
                  <p className="text-sm md:text-base text-pl-text italic leading-relaxed mb-2">
                    „Mit Alex zu arbeiten ist angenehm — strukturiert, entspannt und zuverlässig.
                    Er behält den Überblick, reagiert schnell und bleibt menschlich."
                  </p>
                  <p className="text-xs font-medium text-pl-text">Dominik Palmer</p>
                  <p className="text-xs text-pl-text-muted mt-0.5">Bassist &amp; Bandleader, More Candy</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 03 — Was bringt dir proudleut? */}
      <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6">
              Was bringt dir proudleut?
            </h2>
            <p className="text-base text-pl-text-muted leading-relaxed mb-10">
              Ein Profil bei proudleut ist kein Versprechen auf Buchungen. Aber es kann helfen,
              dass deine Band dort sichtbar wird, wo Veranstalter wirklich suchen.
            </p>

            <div className="border-t border-pl-soft">
              <div className="divide-y divide-pl-soft">
                {BENEFITS.map(({ n, title, desc }) => (
                  <div key={n} className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-x-10 py-10">
                    <GhostNumber n={n} />
                    <div>
                      <p className="text-lg font-semibold text-pl-text mb-1.5">{title}</p>
                      <p className="text-sm leading-relaxed text-pl-text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 — Was proudleut ist — und was nicht */}
      <section className="bg-pl-paper py-16 md:py-20 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] gap-10 lg:gap-16 items-start">

            <div className="max-w-[680px]">
              <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-6">
                Was proudleut ist — und was nicht.
              </h2>
              <div className="space-y-5 text-base md:text-[1.05rem] leading-8">
                <p className="text-pl-text-muted">
                  proudleut ist kein Buchungsportal und kein Vergleichssystem. Es ist ein persönlich
                  gepflegter Ort für Live-Acts, die in einem passenden Umfeld sichtbar sein möchten.
                </p>
                <p className="text-pl-text">
                  Ich baue und pflege proudleut persönlich. Ich komme aus dem Livemusik-Geschäft und
                  weiß, wie viel in einer guten Band steckt: Sound, Haltung, Erfahrung und
                  Bühnenmomente. Genau das soll ein Profil sichtbar machen.
                </p>
                <p className="text-pl-text-muted">
                  Ein Profil entsteht auf proudleut nicht per Formular und Klick auf
                  „Veröffentlichen". Ich schaue mir die Band vorher an, und wir telefonieren einmal
                  miteinander. Mir ist wichtig zu wissen, wer hinter einem Act steckt, bevor ich ihn
                  auf proudleut vorstelle. Danach bauen wir gemeinsam ein Profil, das deine Band so
                  zeigt, wie sie wirklich ist, und Veranstaltern hilft, sie richtig einzuordnen.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-pl-soft bg-pl-elevated p-8">
              <p className="text-sm font-semibold text-pl-text-muted uppercase tracking-wider mb-6">
                Kurz gesagt
              </p>
              <div className="divide-y divide-pl-soft">
                {[
                  {
                    nicht: 'Preisvergleich',
                    sondern: 'ein echtes Profil mit Atmosphäre',
                  },
                  {
                    nicht: 'Bewertungssystem',
                    sondern: 'wertschätzende Einordnung nach Stil, Anlass und Region',
                  },
                  {
                    nicht: 'anonymer Marktplatz',
                    sondern: 'direkter Kontakt zwischen Veranstalter und Act',
                  },
                ].map(({ nicht, sondern }) => (
                  <div key={nicht} className="py-5 first:pt-0">
                    <p className="text-xs text-pl-text-hint mb-1.5">Nicht: {nicht}</p>
                    <p className="text-sm font-semibold text-pl-text leading-snug">{sondern}</p>
                  </div>
                ))}
                <div className="py-5 last:pb-0">
                  <p className="text-xs text-pl-text-hint mb-1.5">Und was kostet das?</p>
                  <p className="text-sm font-semibold text-pl-text leading-snug mb-1">
                    Aktuell kostet ein Profil nichts.
                  </p>
                  <p className="text-xs text-pl-text-muted leading-relaxed">
                    Falls sich das irgendwann ändert, kommuniziere ich das offen und rechtzeitig.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 05 — Acts auf proudleut */}
      <section className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6 text-center">
        <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-6">
          Acts auf proudleut
        </p>
        <p className="text-2xl md:text-4xl font-bold text-pl-on-stage leading-snug mb-5 text-pretty">
          Über 140 Live-Acts auf proudleut
        </p>
        <p className="text-sm md:text-base leading-loose text-pl-on-stage-muted max-w-[720px] mx-auto">
          {PROOF_ACTS.map(({ name, slug }, i) => (
            <span key={slug}>
              {i > 0 && ' · '}
              <Link
                href={`/band/${slug}`}
                className="text-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
              >
                {name}
              </Link>
            </span>
          ))}
          {' · '}…
        </p>
      </section>

      {/* 06 — So läuft's */}
      <section className="bg-pl-canvas pt-16 md:pt-20 pb-0 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
              So läuft&apos;s
            </h2>
            <p className="text-base text-pl-text-muted leading-relaxed mb-10">
              Was passiert, wenn du deine Band vorstellst?
            </p>

            <div className="border-t border-pl-soft">
              <div className="divide-y divide-pl-soft">
                {STEPS.map(({ n, title, desc }) => (
                  <div key={n} className="grid grid-cols-1 md:grid-cols-[130px_1fr] gap-x-10 py-10">
                    <GhostNumber n={n} />
                    <div>
                      <p className="text-lg font-semibold text-pl-text mb-1.5">{title}</p>
                      <p className="text-sm leading-relaxed text-pl-text-muted">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 07 — FAQ (bewusst Unterabschnitt von "So läuft's": gleiche Fläche, kein neuer Hintergrund) */}
      <section className="bg-pl-canvas pt-10 md:pt-16 pb-16 md:pb-20 px-4 sm:px-6">
        <div className="pl-container-shell">
          <div className="max-w-[820px]">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-8">
              Häufige Fragen
            </h2>
            <div className="divide-y divide-pl-soft">
              {FAQ_ITEMS.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex justify-between items-center gap-4 cursor-pointer list-none">
                    <span className="text-base font-medium text-pl-text">{q}</span>
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

      {/* 08 — Abschluss */}
      <section id="kontakt" className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6 text-center">
        <div className="pl-container-shell">
          <div className="max-w-[640px] mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-3 text-pretty">
              Du möchtest deine Band auf proudleut zeigen?
            </h2>
            <p className="text-lg text-pl-text-muted mb-9">
              Schick mir ein paar Infos und Links zu deiner Band. Ich schaue sie mir in Ruhe an
              und melde mich bei dir.
            </p>
            <a
              href="mailto:alexander.dressler@proudleut.com"
              className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                         bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                         hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--pl-accent)]"
            >
              Bandseite anfragen
            </a>
            <p className="mt-11 text-sm text-pl-text-muted">
              Wer dahintersteckt und warum es proudleut gibt{' '}
              <Link
                href="/ueber-mich"
                className="text-pl-accent font-medium hover:text-pl-accent-hover motion-safe:transition-colors"
              >
                — Über proudleut
              </Link>
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
