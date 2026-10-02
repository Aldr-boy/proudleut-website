import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';
import { BandIntroTrigger } from '@/components/bandIntro/BandIntroTrigger';
import { getBandFromSupabase } from '@/lib/supabase/queries';
import { normalizeBandFromSupabase } from '@/lib/supabase/normalizeBand';
import { formatLocation } from '@/lib/utils/formatLocation';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import { BandEventTypesPills } from '@/components/band/BandEventTypesPills';

// Profil-Demo (Sektion 02) laedt das echte San2-Profil ueber denselben Weg
// wie /band/[slug] -- ISR wie bei der Homepage-Section "Eine Band
// einschaetzen" (app/page.tsx), da die Seite dadurch einen echten DB-Read
// bekommt statt komplett statisch zu sein.
export const revalidate = 300;

const DEMO_BAND_SLUG = 'san2-and-his-soul-patrol';

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

const BENEFITS = [
  {
    n: '01',
    title: 'Sichtbar werden',
    desc: 'Dein Profil erscheint in Kategorien und Regionen, die zu deiner Band passen, nicht versteckt in einer Datenbank, sondern als eigenständige Präsentation.',
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
    desc: 'Bevor eine Band auf proudleut kommt, telefonieren wir einmal miteinander. Ein Kennenlernen, um einfach zu wissen, wer hinter der Band steckt.',
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

// "Klingt nach" / "Stil & Einflüsse" / "Spielt bei" der Profil-Demo-Karte --
// identischer Inhalt und identische Reihenfolge in beiden Kartenlayouts
// (Bild-Hintergrund ab xl, gestapelt darunter), nur die Textgroessen
// unterscheiden sich (Entwurf "1b — Bild als Hintergrund": Desktop 1440 vs.
// Mobile 390). Kein eigener Breakpoint-Wechsel innerhalb dieser Komponente,
// weil beide Elternlayouts bereits per xl:hidden / hidden xl:block exklusiv
// sind (siehe FuerBandsPage).
function DemoSoundInfo({ band, size }: { band: Band; size: 'mobile' | 'desktop' }) {
  const isDesktop = size === 'desktop';
  const labelClass = `font-semibold uppercase tracking-wider text-pl-on-stage-muted mb-2.5 ${
    isDesktop ? 'text-[11.5px]' : 'text-[11px]'
  }`;

  return (
    <>
      {band.klingtNach.length > 0 && (
        <div>
          <p className={labelClass}>Klingt nach</p>
          <ul className="flex flex-col gap-2">
            {band.klingtNach.map((tag) => (
              <li
                key={tag}
                className={`flex items-center gap-3 text-pl-on-stage ${isDesktop ? 'text-base' : 'text-[15px]'}`}
              >
                <span className="w-[3px] h-4 rounded-sm bg-pl-accent-light shrink-0" aria-hidden="true" />
                {tag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {band.musikalischVerortet.length > 0 && (
        <div>
          <p className={labelClass}>Stil &amp; Einflüsse</p>
          <div className="flex flex-wrap gap-2">
            {band.musikalischVerortet.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center rounded-full bg-white/10 font-semibold text-pl-on-stage px-3 py-1.5 ${
                  isDesktop ? 'text-[13px]' : 'text-xs'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {band.eventTypes.length > 0 && (
        <div>
          <p className={labelClass}>Spielt bei</p>
          <BandEventTypesPills eventTypes={band.eventTypes} categorySlugs={band.categorySlugs} variant="dark" />
        </div>
      )}
    </>
  );
}

// "Live-Video"-Pill auf dem Kartenbild (Entwurf 1b) -- rechts unten im
// Bild-Hintergrund-Layout (ab xl), rechts oben im gestapelten Layout
// (darunter). Rendert nur, wenn die Band ein Video hat (siehe Aufrufer);
// verlinkt auf die echte Bandseite (ohne Sprungmarke); das Video oeffnet
// dort ueber die Hero-Pille.
function LiveVideoPill({ href, position, size }: { href: string; position: string; size: 'sm' | 'md' }) {
  const isSmall = size === 'sm';
  return (
    <Link
      href={href}
      className={`absolute ${position} inline-flex items-center rounded-full bg-[rgba(18,16,26,0.72)] border border-white/20 font-semibold text-pl-on-stage motion-safe:transition-colors hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light ${
        isSmall ? 'gap-2 pl-1.5 pr-3.5 py-1.5 text-[13px]' : 'gap-2.5 pl-2 pr-4 py-2 text-sm'
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-pl-on-stage text-pl-stage ${
          isSmall ? 'w-7 h-7' : 'w-[30px] h-[30px]'
        }`}
      >
        <svg width={isSmall ? 12 : 14} height={isSmall ? 12 : 14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      Live-Video
    </Link>
  );
}

export default async function FuerBandsPage() {
  // Nicht gefunden / nicht aktiv (getBandFromSupabase filtert bereits auf
  // status='active') -> demoBand bleibt null, die Profil-Demo-Section
  // entfaellt weiter unten sauber, keine Fehlerseite (Auftrag "Profil-Demo
  // an neues Bandprofil angleichen").
  const { data: demoBandData } = await getBandFromSupabase(DEMO_BAND_SLUG);
  const demoBand = demoBandData ? normalizeBandFromSupabase(demoBandData) : null;
  const demoEmbedUrl = demoBand ? getYouTubeEmbedUrl(demoBand.youtubeVideoUrl) : null;
  const demoHasVideo = demoEmbedUrl !== null;
  const demoVideoHref = demoBand ? `/band/${demoBand.slug}` : '';
  const demoLocationLabel = demoBand
    ? [demoBand.category, formatLocation(demoBand.location)].filter(Boolean).join(' · ')
    : '';

  return (
    <main>

      {/* 01 — Hero (Leitmoment, pl-display-1) */}
      <section className="bg-pl-stage pt-24 md:pt-40 pb-24 md:pb-40 px-4 sm:px-6">
        <div className="pl-container-shell">
          <p className="text-xs font-semibold text-pl-accent-light uppercase tracking-wider">
            Für Livebands, Duos &amp; Solo-Acts
          </p>
          <h1 className="pl-display-1 mt-4 md:mt-7 max-w-[1020px] text-balance">
            <span className="block text-pl-on-stage">Deine Musik sichtbar machen.</span>
            <span className="block text-pl-on-stage-muted">
              In einem Umfeld,
              <br />
              das zu dir passt.
            </span>
          </h1>
          <p className="mt-9 md:mt-11 text-[17px] md:text-xl leading-relaxed text-pl-on-stage-muted max-w-[560px]">
            Eine eigene Bandseite, gute Bilder und Videos und eine Einordnung, die Veranstaltern
            zeigt, wofür ihr steht und ob ihr zu ihrem Event passt.
          </p>
          <div className="mt-11 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <BandIntroTrigger
              className="items-center justify-center px-7 py-3.5 rounded-full text-base font-semibold
                         bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                         hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors"
            >
              Bandseite anfragen
            </BandIntroTrigger>
            <span className="text-[15px] text-pl-on-stage-muted">
              Direkter Kontakt zum Veranstalter&nbsp;&nbsp;·&nbsp;&nbsp;Keine Buchungsplattform
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

          {/* Profilkarte "1b — Bild als Hintergrund" -- echtes San2-Profil
              ueber denselben Datenpfad wie /band/[slug] geladen (kein
              eigenes Profil-Datenmodell, keine Anfrage-/Merklisten-Logik,
              kein H1). Wird die Band nicht gefunden oder ist sie nicht
              aktiv (getBandFromSupabase filtert bereits auf
              status='active'), entfaellt die gesamte Demo sauber.

              Ab xl liegt das Bandbild rechtsbuendig als Hintergrund in der
              vollen Kartenhoehe (620px), mit einem Verlauf ins Dunkle, auf
              dem links die Infospalte sitzt (Entwurfsmasse: 470px Spalte,
              Verlauf 0/33/40/48/58%). Darunter (inkl. dem ~1024px-Bereich,
              wo Infospalte + Bild nicht mehr nebeneinander passen, siehe
              pl-container-shell = 1140px vs. benoetigte ~1300px) greift
              stattdessen die gestapelte Mobile-Anordnung aus dem Entwurf:
              Bild oben in voller Breite, Infos darunter auf dunklem Grund.
              Der Wechsel erfolgt deshalb bewusst erst bei xl (1280px) statt
              bei lg (1024px) -- bei lg waere die Infospalte noch zu breit
              fuer den verbleibenden Platz neben dem Bild. */}
          {demoBand && (
            <>
              <div className="mt-9 md:mt-14 rounded-3xl overflow-hidden bg-pl-stage">
                <div className="hidden xl:block relative h-[620px]">
                  {demoBand.heroImage && (
                    <div className="absolute right-0 top-0 h-full aspect-[4/3]">
                      <Image
                        src={demoBand.heroImage.url}
                        alt={demoBand.heroImage.alt}
                        fill
                        className="object-cover"
                        sizes="827px"
                      />
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(90deg, #12101a 0%, #12101a 33%, rgba(18,16,26,0.88) 40%, rgba(18,16,26,0.45) 48%, rgba(18,16,26,0) 58%)',
                    }}
                  />
                  <div className="absolute inset-y-0 left-0 w-[470px] max-w-full flex flex-col justify-center gap-6 px-14">
                    <div>
                      <p className="text-[40px] font-extrabold tracking-tight leading-[1.02] text-pl-on-stage">
                        {demoBand.name}
                      </p>
                      {demoLocationLabel && (
                        <p className="mt-2.5 text-[15px] font-medium text-pl-accent-light">{demoLocationLabel}</p>
                      )}
                    </div>
                    <DemoSoundInfo band={demoBand} size="desktop" />
                  </div>
                  {demoHasVideo && <LiveVideoPill href={demoVideoHref} position="right-6 bottom-6" size="md" />}
                </div>

                <div className="xl:hidden">
                  <div className="relative">
                    {demoBand.heroImage && (
                      <div className="relative w-full aspect-[4/3]">
                        <Image
                          src={demoBand.heroImage.url}
                          alt={demoBand.heroImage.alt}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1279px) 100vw, 1140px"
                        />
                      </div>
                    )}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(18,16,26,0) 45%, rgba(18,16,26,0.75) 78%, #12101a 100%)',
                      }}
                    />
                    {demoHasVideo && <LiveVideoPill href={demoVideoHref} position="right-3 top-3" size="sm" />}
                    <div className="absolute left-[22px] right-[22px] bottom-1">
                      <p className="text-[28px] font-extrabold tracking-tight leading-[1.05] text-pl-on-stage">
                        {demoBand.name}
                      </p>
                    </div>
                  </div>
                  <div className="px-[22px] pt-2 pb-[26px] flex flex-col gap-[22px]">
                    {demoLocationLabel && (
                      <p className="text-sm font-medium text-pl-accent-light">{demoLocationLabel}</p>
                    )}
                    <DemoSoundInfo band={demoBand} size="mobile" />
                  </div>
                </div>
              </div>

              {/* Zeile direkt unter der Karte: ab md Link und Fussnote auf
                  einer Grundlinie nebeneinander, darunter (unter md
                  gestapelt: Link, dann Fussnote). */}
              <div className="mt-8 md:mt-10 flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 md:gap-8">
                <Link
                  href={`/band/${demoBand.slug}`}
                  className="inline-block rounded-sm text-sm font-semibold text-pl-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent"
                >
                  Ganzes Profil von {demoBand.name} ansehen →
                </Link>
                <p className="text-xs text-pl-text-muted">
                  Beispielprofil — jedes Profil auf proudleut wird individuell aufgebaut.
                </p>
              </div>

              {/* "Aus Musiker-Sicht" (Entwurf 1b): heller Kasten mit feinem
                  umlaufenden Rahmen, ab lg zweispaltig (links Label+Zitat,
                  rechts Name/Rolle/Link), vertikal zentriert. */}
              <div className="mt-6 md:mt-8 bg-pl-canvas border border-pl-soft rounded-[20px] px-5 py-[22px] md:px-9 md:py-7">
                <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:gap-14 lg:items-center">
                  <div>
                    <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider">
                      Aus Musiker-Sicht
                    </p>
                    <p className="mt-2.5 text-sm md:text-base italic leading-relaxed text-pl-text max-w-[70ch]">
                      „Mit Alex zu arbeiten ist angenehm, strukturiert, entspannt und zuverlässig.
                      Er behält den Überblick, reagiert schnell und bleibt menschlich.“
                    </p>
                  </div>
                  <div className="mt-4 lg:mt-0">
                    <p className="text-[15px] md:text-base font-semibold text-pl-text">Dominik Palmer</p>
                    <p className="text-[13px] md:text-sm text-pl-text-muted mt-0.5">
                      Bassist · u. a. mit Claudia Koreck, David Garrett, Mel C &amp; Max Mutzke
                    </p>
                    <Link
                      href="/musiker/dominik-palmer"
                      className="mt-2 md:mt-3 inline-block rounded-sm text-sm font-medium text-pl-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent focus-visible:ring-offset-2"
                    >
                      Musikerprofil ansehen →
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
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
                „Veröffentlichen“. Ich schaue mir die Band vorher an, und wir telefonieren
                miteinander. Mir ist wichtig zu wissen, wer hinter einem Act steckt, bevor ich ihn
                auf proudleut vorstelle. Danach bauen wir gemeinsam ein Profil, das deine Band so
                zeigt, wie sie wirklich ist und Veranstaltern hilft, sie richtig einzuordnen.
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

      {/* 08 — Finale (Leitmoment, Spiegel des Heros: pl-display-1, zentriert).
          Hundskrippln-Livefoto als Hintergrund, gleiches Prinzip wie der
          Abschluss auf /ueber-mich (San2-Foto) und components/homepage/
          CTASection.tsx: volles Bild + radialer Dunkel-Verlauf + Text darueber.
          Datei ist vorab auf die oberen 1020 Zeilen zugeschnitten, damit das
          Bassdrum-Logo nie im Bild erscheint. objectPosition: der x-Wert wirkt
          nur mobil (hochkantes Feld, Bild wird auf die Hoehe skaliert), der
          y-Wert nur auf dem Desktop (Bild wird auf die Breite skaliert). */}
      <section id="kontakt" className="relative overflow-hidden bg-pl-stage pt-24 md:pt-36 pb-16 md:pb-24 px-4 sm:px-6 text-center">
        <Image
          src="/images/fuer-bands/fuer-bands-hundskrippl-tuba.jpg"
          alt=""
          fill
          className="object-cover pointer-events-none"
          style={{ objectPosition: '38% 40%' }}
          sizes="100vw"
          quality={80}
        />
        {/* Verlauf mobil staerker als auf /ueber-mich (dort identischer
            Ausgangswert): das Hundskrippln/Tuba-Foto wirkt auf dem
            Ausschnitt, den Mobilgeraete zeigen (objectPosition 38% 40%,
            Bild wird auf die Hoehe skaliert), greller/unruhiger als das
            dunklere, waermere San2-Foto auf /ueber-mich -- dort reicht
            derselbe Verlauf. +12 Prozentpunkte auf jeden Stop, nur unter
            md; ab md exakt der bisherige, mit /ueber-mich weiterhin
            identische Wert (Desktop unveraendert). */}
        <div
          className="absolute inset-0 pointer-events-none md:hidden"
          style={{
            background:
              'radial-gradient(ellipse 62% 78% at 50% 42%, rgba(18,16,26,0.84) 0%, rgba(18,16,26,0.58) 55%, rgba(18,16,26,0.30) 100%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none hidden md:block"
          style={{
            background:
              'radial-gradient(ellipse 62% 78% at 50% 42%, rgba(18,16,26,0.72) 0%, rgba(18,16,26,0.46) 55%, rgba(18,16,26,0.18) 100%)',
          }}
        />
        <div className="relative z-10 max-w-[900px] mx-auto">
          <h2
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-pl-on-stage max-w-[16ch] mx-auto text-balance"
            style={{ textShadow: '0 2px 24px rgba(18,16,26,0.6)' }}
          >
            Deine Band bei proudleut?
          </h2>
          <p className="pl-photo-copy mt-8 text-[17px] md:text-xl leading-relaxed max-w-[46ch] mx-auto">
            Ich bin gespannt, wie ihr klingt.
          </p>
          <div className="mt-11">
            <BandIntroTrigger
              className="items-center justify-center px-7 py-3.5 rounded-full text-base font-semibold
                         bg-[var(--pl-accent)] text-[var(--pl-text-on-accent)]
                         hover:bg-[var(--pl-accent-hover)] motion-safe:transition-colors
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-[var(--pl-accent)]"
            >
              Band vorstellen
            </BandIntroTrigger>
          </div>
          <p className="pl-photo-copy mt-9 text-sm">
            Wer steckt hinter proudleut?{' '}
            <Link
              href="/ueber-mich"
              className="text-pl-accent-light font-medium hover:text-pl-on-stage motion-safe:transition-colors"
            >
              Mehr über mich →
            </Link>
          </p>
        </div>
        <p
          className="absolute left-4 sm:left-6 bottom-3 z-10 font-mono text-[11px] font-normal text-pl-on-stage/70"
          style={{ textShadow: '0 1px 8px rgba(18,16,26,0.6)' }}
        >
          D&apos;Hundskrippln — live.
        </p>
      </section>

    </main>
  );
}
