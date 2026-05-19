import type { Metadata } from 'next';
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

const FEATURES = [
  {
    title: 'Hero mit Bandfoto',
    desc: 'Der erste Eindruck: groß, atmosphärisch und passend zu eurer Band.',
  },
  {
    title: 'Video als Live-Beweis',
    desc: 'Veranstalter sehen sofort, wie ihr klingt, wirkt und auf der Bühne seid.',
  },
  {
    title: 'Redaktioneller Bandtext',
    desc: 'Nicht einfach Keywords, sondern ein Text, der erklärt, was euch ausmacht.',
  },
  {
    title: 'Referenz-Events',
    desc: 'Aus Auftritten werden Bühnenmomente: wo ihr gespielt habt und in welchem Rahmen.',
  },
  {
    title: 'Tags und Kategorien',
    desc: 'Damit ihr auf den passenden Veranstaltungsseiten gefunden werdet.',
  },
  {
    title: 'Direktanfrage',
    desc: 'Interessierte Veranstalter können euch direkt kontaktieren — ohne Umweg und ohne Provision.',
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Du schreibst mir kurz.',
    desc: 'Erzähl mir in ein paar Sätzen, wer ihr seid, was ihr spielt und wo ihr gerne auftreten möchtet.',
  },
  {
    n: '2',
    title: 'Wir sprechen kurz darüber.',
    desc: 'In einem Telefonat klären wir, was ihr schon habt: Fotos, Video, Website, Socials, Referenzen und den richtigen Kontaktweg.',
  },
  {
    n: '3',
    title: 'Ihr bekommt den Fragebogen.',
    desc: 'Der Fragebogen ist keine Bewerbung, sondern eine Arbeitsgrundlage. Er hilft, euer Profil sauber aufzubauen und nichts Wichtiges zu vergessen.',
  },
  {
    n: '4',
    title: 'Euer Profil entsteht.',
    desc: 'Aus euren Infos, Bildern und Videos baue ich ein Profil, das Veranstaltern einen echten Eindruck gibt — und euch direkt kontaktierbar macht.',
  },
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
    a: 'Die Anfragen gehen direkt an dich beziehungsweise an die von dir angegebene Kontaktadresse. proudleut ist kein Zwischenhändler und nimmt keine Provision.',
  },
  {
    q: 'Kann jede Band mitmachen?',
    a: 'Grundsätzlich ja. proudleut soll offen für viele gute Livebands, Duos und Solo-Acts sein. Wichtig ist nur, dass genug Material für ein sinnvolles Profil vorhanden ist: gute Fotos, ein kurzer Text, idealerweise Video und klare Kontaktdaten.',
  },
  {
    q: 'Gibt es einen Fragebogen?',
    a: 'Ja — aber nicht als Einstiegshürde. Schreib mir zuerst kurz per Mail. Wenn wir gemeinsam merken, dass ein proudleut-Profil Sinn ergibt, schicke ich dir einen kurzen Fragebogen. Der hilft uns, die wichtigsten Infos, Fotos, Videos und Kontakte sauber zu sammeln, ohne dass ich raten muss.',
  },
];

export default function FuerBandsPage() {
  return (
    <main>

      {/* 1 — Hero */}
      <section className="bg-pl-stage py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto text-center">
          <p className="text-xs font-semibold text-pl-on-stage-muted uppercase tracking-wider mb-5">
            Für Livebands, Duos &amp; Solo-Acts
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-pl-on-stage leading-tight mb-6">
            Deine Musik sichtbar machen — in einem Umfeld, das zu dir passt.
          </h1>
          <p className="text-base md:text-lg text-pl-on-stage-muted leading-relaxed mb-10 max-w-[600px] mx-auto">
            proudleut zeigt Live-Acts mit Profil, Atmosphäre, echten Eindrücken und direktem Kontakt
            zu Veranstaltern.
          </p>
          <a
            href="#kontakt"
            className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                       border border-[var(--pl-text-on-stage-muted)] text-[var(--pl-text-on-stage)]
                       hover:border-[var(--pl-text-on-stage)] motion-safe:transition-colors
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-[var(--pl-accent)]"
          >
            Kontakt aufnehmen
          </a>
        </div>
      </section>

      {/* 2 — Was proudleut ist */}
      <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-8">
            Was proudleut ist — und was nicht.
          </h2>
          <div className="space-y-5 text-base md:text-[1.05rem] text-pl-text leading-8">
            <p>
              proudleut ist ein Ort für Live-Acts, die in einem passenden Umfeld sichtbar sein
              möchten — ohne zwischen Preisvergleich, Bewertungssystem und Buchungsportal unterzugehen.
            </p>
            <p>
              Veranstalter finden auf proudleut ein echtes Bandprofil: mit Bildern, Video, Text,
              Referenzen und direktem Kontakt. Die Anfrage geht nicht über einen Marktplatz,
              sondern direkt an euch.
            </p>
            <p>
              Ich bin Alex. Ich baue und pflege proudleut persönlich, weil ich aus dem
              Livemusik-Geschäft komme und weiß, wie viel in einer guten Band steckt: Sound,
              Haltung, Erfahrung, Menschen, Bühnenmomente. Genau das soll ein Profil sichtbar
              machen.
            </p>
            <p>
              proudleut ist kein automatisches Selbsteintragssystem. Nicht, weil ich Bands
              aussortieren möchte — sondern weil ein gutes Profil ein bisschen Austausch braucht.
              Fast jede Band ist willkommen. Mir geht es darum, dass euer Auftritt auf proudleut
              gut aussieht, verständlich ist und Veranstaltern hilft, euch richtig einzuordnen.
            </p>
          </div>
        </div>
      </section>

      {/* 2.5 — Profil-Mockup */}
      <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Links: Einleitung + Nutzenpunkte */}
            <div>
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-4">
                So wirkt ein Profil auf proudleut
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-4">
                Mehr als nur ein Eintrag.
              </h2>
              <p className="text-base text-pl-text-muted leading-relaxed mb-8">
                Ein proudleut-Profil zeigt nicht nur Fakten, sondern Atmosphäre, Stil und den
                direkten Weg zur Anfrage.
              </p>
              <div className="space-y-6">
                {[
                  {
                    title: 'Atmosphäre statt Eintrag',
                    desc: 'Foto, Video und Text zeigen, wer ihr seid — bevor jemand fragt.',
                  },
                  {
                    title: 'Direkter Kontakt',
                    desc: 'Anfragen kommen direkt bei euch an — ohne Umweg über ein Buchungsportal.',
                  },
                  {
                    title: 'Passend gefunden',
                    desc: 'Euer Profil wird dort sichtbar, wo Veranstalter nach passenden Acts suchen.',
                  },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex gap-4">
                    <span className="shrink-0 mt-0.5 text-pl-text-muted select-none">—</span>
                    <div>
                      <p className="text-sm font-semibold text-pl-text mb-0.5">{title}</p>
                      <p className="text-sm text-pl-text-muted leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rechts: Mockup-Card */}
            <div>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--pl-bg-stage-elevated, #1e1a28)',
                  border: '1px solid rgba(196,168,216,0.12)',
                }}
              >
                {/* Bild-Placeholder */}
                <div
                  className="relative aspect-video"
                  style={{
                    background:
                      'radial-gradient(ellipse 70% 55% at 50% 15%, rgba(50,40,65,0.7) 0%, transparent 65%), linear-gradient(170deg, #211c2e 0%, #17131f 45%, #0e0c14 100%)',
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(18,16,26,0.92) 0%, rgba(18,16,26,0.3) 50%, transparent 100%)',
                    }}
                  />
                  <div className="absolute bottom-0 left-0 p-5 z-10">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                      style={{
                        background: 'var(--pl-accent-subtle)',
                        color: 'var(--pl-accent-deep)',
                      }}
                    >
                      Party &amp; Feier
                    </span>
                    <p className="text-xl font-bold text-pl-on-stage leading-tight">
                      Euer Auftritt auf proudleut
                    </p>
                    <p className="text-xs text-pl-on-stage-muted mt-0.5">
                      Bayern · München und Umgebung
                    </p>
                  </div>
                </div>

                {/* Profil-Body */}
                <div className="p-5">
                  <p className="text-sm text-pl-on-stage-muted italic leading-relaxed mb-4">
                    „Eine vielseitige Liveband für Hochzeiten, Stadtfeste und Firmenevents — mit
                    eigenem Programm und echtem Live-Feeling."
                  </p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {['Pop & Rock', 'Live-Programm', 'Atmosphäre'].map((tag) => (
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
                      { label: 'Bandart', value: 'Liveband (5 Pers.)' },
                      { label: 'Herkunft', value: 'München' },
                      { label: 'Spielt bei', value: 'Hochzeit, Stadtfest' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] uppercase tracking-wider text-pl-on-stage-muted mb-0.5">
                          {label}
                        </p>
                        <p className="text-sm font-medium text-pl-on-stage">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold
                               bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]"
                    aria-hidden="true"
                  >
                    Direkt anfragen →
                  </div>
                </div>
              </div>
              <p className="text-xs text-pl-text-muted text-center mt-4">
                Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3 — Was dein Profil kann */}
      <section className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[1140px] mx-auto">
          <div className="max-w-[820px] mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-4">
              Was dein Profil kann
            </h2>
            <p className="text-base text-pl-on-stage-muted leading-relaxed">
              Ein Profil bei proudleut ist keine Zeile in einem Verzeichnis. Es ist eine
              eigenständige, wertige Präsentation deiner Band — mit allem, was Veranstalter
              brauchen, um sich ein gutes Bild zu machen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {FEATURES.map(({ title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(196,168,216,0.12)',
                }}
              >
                <p className="text-sm font-semibold text-pl-on-stage mb-1">{title}</p>
                <p className="text-sm text-pl-on-stage-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-pl-on-stage-muted mb-8 max-w-[820px]">
            Veranstalter sehen euer Profil, bevor sie anfragen. Das erspart beiden Seiten
            Erklärungen und schafft von Anfang an mehr Klarheit.
          </p>

          <div>
            <p className="text-sm text-pl-on-stage-muted mb-4">
              So unterschiedlich können Bands auf proudleut aussehen:
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/band/donnaweda"
                className="group flex items-baseline gap-2 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
              >
                <span className="text-sm font-medium text-pl-accent-light group-hover:text-pl-on-stage motion-safe:transition-colors">
                  Donnaweda
                </span>
                <span className="text-xs text-pl-on-stage-muted">— bayerische Partyband</span>
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-pl-on-stage-muted">Harmonic Brass</span>
                <span className="text-xs text-pl-on-stage-muted">— Blechbläser / Konzert</span>
              </div>
              <Link
                href="/band/tegernseer-tanzlmusi"
                className="group flex items-baseline gap-2 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
              >
                <span className="text-sm font-medium text-pl-accent-light group-hover:text-pl-on-stage motion-safe:transition-colors">
                  Tegernseer Tanzlmusi
                </span>
                <span className="text-xs text-pl-on-stage-muted">— traditionelle Musik</span>
              </Link>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-pl-on-stage-muted">Donikkl Crew</span>
                <span className="text-xs text-pl-on-stage-muted">— Familien- und Kinderkonzerte</span>
              </div>
              <Link
                href="/band/san2-and-his-soul-patrol"
                className="group flex items-baseline gap-2 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-[var(--pl-accent)]"
              >
                <span className="text-sm font-medium text-pl-accent-light group-hover:text-pl-on-stage motion-safe:transition-colors">
                  San2
                </span>
                <span className="text-xs text-pl-on-stage-muted">— Blues, Soul &amp; Rhythm&apos;n&apos;Blues</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — Was nutzt dir proudleut wirklich? */}
      <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-text mb-8">
            Was nutzt dir proudleut wirklich?
          </h2>
          <div className="space-y-5 text-base md:text-[1.05rem] text-pl-text leading-8">
            <p>
              Ein Profil bei proudleut ist kein Versprechen auf Buchungen. Aber es kann helfen,
              dass deine Band an Stellen sichtbar wird, an denen Veranstalter sonst vielleicht
              nicht nach euch gesucht hätten.
            </p>
            <p>
              Viele Bands sind in ihrer eigenen Region gut bekannt. proudleut kann den Blick etwas
              öffnen: Eine Band aus Amberg taucht plötzlich auch für Veranstalter in Neumarkt,
              Ingolstadt oder Kelheim auf. Nicht als Werbeanzeige, sondern als Teil eines
              passenden Band-Kontexts.
            </p>
            <p>
              Dazu kommt: Jedes gute Profil stärkt das Netzwerk. Wenn Bands, Kategorien,
              Veranstaltungsarten und Regionen sinnvoll miteinander verlinkt sind, entsteht über
              die Zeit mehr Sichtbarkeit für alle. Vielleicht merkt man das nicht von heute auf
              morgen — aber genau solche sauberen Verbindungen bauen langfristig Autorität auf.
            </p>
            <p className="text-pl-text-muted">
              Kurz gesagt: proudleut kann dir helfen, sichtbarer zu werden, anders gefunden zu
              werden und deine Band professionell einzuordnen.
            </p>
          </div>
        </div>
      </section>

      {/* 5 — Wie es läuft */}
      <section className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-10">
            Wie es läuft
          </h2>
          <div className="space-y-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-5">
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                             text-sm font-bold"
                  style={{
                    background: 'rgba(196,168,216,0.12)',
                    color: 'var(--pl-accent-on-stage)',
                  }}
                >
                  {n}
                </div>
                <div>
                  <p className="text-base font-semibold text-pl-on-stage mb-1">{title}</p>
                  <p className="text-sm text-pl-on-stage-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — FAQ */}
      <section className="bg-pl-canvas py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto">
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
      </section>

      {/* 7 — Kontakt */}
      <section id="kontakt" className="bg-pl-stage py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-[820px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-pl-on-stage mb-6">
            Klingt das interessant?
          </h2>
          <div className="space-y-5 text-base md:text-[1.05rem] text-pl-on-stage-muted leading-8 mb-10">
            <p>
              Wenn du glaubst, dass deine Band auf proudleut gut aufgehoben wäre, schreib mir kurz.
            </p>
            <p>
              Ich bin Alex und mache Booking und Management für Bands wie Donnaweda, San2, Freunde
              des Brautpaares, Smooth&apos;n&apos;Groove und Silk &amp; Sound. Ich kenne also beide
              Seiten: die Fragen der Veranstalter — und den Alltag von Bands, die gut dargestellt
              und passend gefunden werden wollen.
            </p>
          </div>
          <a
            href="mailto:alexander.dressler@proudleut.com"
            className="inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold
                       bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                       hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                       focus-visible:outline-[var(--pl-accent-on-stage)]"
          >
            alexander.dressler@proudleut.com
          </a>
          <p className="mt-5 text-sm text-pl-on-stage-muted">
            Ich melde mich meistens innerhalb weniger Tage.
          </p>
        </div>
      </section>

    </main>
  );
}
