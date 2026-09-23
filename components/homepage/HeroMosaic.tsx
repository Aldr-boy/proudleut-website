import Link from 'next/link';
import Image from 'next/image';

// Bilderwand-Prinzip aus dem frueheren Webflow-Hero, aber NICHT 1:1
// zurueckgebaut (Auftrag "Webflow-Prinzip + aktueller Next.js-Einstieg"):
// gleich breite vertikale Flex-Spalten statt festes Zellenraster, Bilder
// behalten ihre natuerliche Seitenproportion (width/height der Originaldatei
// statt object-fit:cover in eine feste Zelle), unterschiedliche Bildhoehen
// innerhalb der Spalten ausdruecklich gewollt, keine 2x2-Feature-Kacheln
// mehr. Bildquellen weiterhin ausschliesslich die zwoelf vorhandenen
// hero-mosaic-01..12.webp -- kein neues, kein externes, kein generiertes
// Bild. Bewusst rein statisch (Phase A): keine Bewegung, keine Keyframes.
//
// Bildmasse per sharp ausgelesen (siehe Abschlussbericht) -- keine Datei
// selbst veraendert, nur die vorhandene Original-Proportion referenziert.
type HeroImg = { id: string; src: string; width: number; height: number; priority?: boolean };

const IMG: Record<string, { src: string; width: number; height: number }> = {
  '01': { src: '/images/hero/hero-mosaic-01.webp', width: 800, height: 615 },
  '02': { src: '/images/hero/hero-mosaic-02.webp', width: 1000, height: 1000 },
  '03': { src: '/images/hero/hero-mosaic-03.webp', width: 2600, height: 1858 },
  '04': { src: '/images/hero/hero-mosaic-04.webp', width: 600, height: 400 },
  '05': { src: '/images/hero/hero-mosaic-05.webp', width: 1000, height: 1000 },
  '06': { src: '/images/hero/hero-mosaic-06.webp', width: 1000, height: 1000 },
  '07': { src: '/images/hero/hero-mosaic-07.webp', width: 800, height: 615 },
  '08': { src: '/images/hero/hero-mosaic-08.webp', width: 600, height: 400 },
  '09': { src: '/images/hero/hero-mosaic-09.webp', width: 600, height: 400 },
  '10': { src: '/images/hero/hero-mosaic-10.webp', width: 600, height: 400 },
  '11': { src: '/images/hero/hero-mosaic-11.webp', width: 1000, height: 1000 },
  '12': { src: '/images/hero/hero-mosaic-12.webp', width: 1000, height: 1000 },
};

function img(id: string, priority?: boolean): HeroImg {
  return { id, ...IMG[id], priority };
}

// Desktop (ab lg/1024px): 3 gleich breite Spalten (bewusst nicht 4 oder 5 --
// bei 4 Spalten reicht die Bildhoehe an der schmalsten lg-Breite (1024px)
// rechnerisch NICHT zuverlaessig bis zur sichtbaren Hero-Hoehe: real per
// DOM-Messung gefunden, dass dort ein Hoehen-Puffer-Bild noch innerhalb
// des sichtbaren Bereichs landete und gleichzeitig mit seinem Original
// sichtbar war (Verstoss gegen Auftrag 5A) -- siehe Abschlussbericht.
// Bei 3 Spalten (breiter, daher pro Bild hoeher) reichen bereits die vier
// EINMALIGEN Bilder pro Spalte je Spalte komfortabel ueber die sichtbare
// Hoehe hinaus, auch bei 1024px -- keine Wiederholung noetig, jedes der
// zwoelf Bilder erscheint auf Desktop genau einmal. Ruhigere/dunklere
// Motive (09, 04, 06, 03) in der mittleren Spalte (unter Headline/
// Subline/Pills), hellere/unruhigere Motive in den beiden aeusseren
// Spalten -- keine neue Bildauswahl, nur eine andere Anordnung derselben
// zwoelf Bilder.
const DESKTOP_COLUMNS: HeroImg[][] = [
  [img('07', true), img('05'), img('08'), img('10')],
  [img('09'), img('04'), img('03'), img('06')],
  [img('01'), img('12'), img('02'), img('11')],
];

// Mobil (< lg): 3 eigene, schmalere Spalten -- kein verkleinertes
// Desktop-Layout. Alle zwoelf Bilder je genau einmal in der ersten
// "Sichtbereich"-Reihe pro Spalte (vier Bilder tief), keine Wiederholung
// noetig, um den sichtbaren Bereich zu fuellen (siehe Abschlussbericht:
// Hoehen-Messung). Ruhigeres Motiv (09, 04, 06) in der mittleren Spalte
// unter dem Content.
const MOBILE_COLUMNS: HeroImg[][] = [
  [img('07'), img('05'), img('08'), img('02')],
  [img('09'), img('04'), img('03'), img('06')],
  [img('01'), img('10'), img('12'), img('11')],
];

const ANLASS_PILLS: { label: string; href: string }[] = [
  { label: 'Hochzeit', href: '/veranstaltung/hochzeit' },
  { label: 'Firmenfeier & Business Event', href: '/veranstaltung/firmenfeier' },
  { label: 'Festzelt', href: '/veranstaltung/festzelt' },
];

// Masonry-aehnliche Spalten ueber bewusst aufgebaute Flex-Columns (kein
// experimentelles grid-template-rows: masonry). Jede Spalte ist eine
// eigene Flex-Column gleicher Breite; jedes Bild bekommt width/height der
// Originaldatei mit, className steuert nur noch "volle Spaltenbreite,
// Hoehe folgt der Proportion" (w-full h-auto) -- kein object-fit:cover,
// kein erzwungenes Zellformat. Eckig (kein rounded/border-radius mehr).
function MosaicColumns({ columns, className, sizes }: { columns: HeroImg[][]; className: string; sizes: string }) {
  return (
    <div className={className}>
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 min-w-0 flex flex-col gap-2">
          {col.map((image, imgIdx) => (
            <Image
              key={`${image.id}-${colIdx}-${imgIdx}`}
              src={image.src}
              alt=""
              width={image.width}
              height={image.height}
              sizes={sizes}
              quality={70}
              priority={image.priority}
              className="w-full h-auto block"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HeroMosaic() {
  return (
    <section className="relative isolate overflow-hidden bg-pl-stage min-h-[600px] md:min-h-[640px] lg:min-h-[680px]">
      {/* Bilderwand -- durchgehende, gleich breite Spalten ueber die
          gesamte Hero-Flaeche, laeuft hinter dem Content weiter (kein
          ausgespartes Mittelfeld). -inset-x sorgt dafuer, dass die
          aeusseren Spalten am Hero-Rand angeschnitten werden (Section hat
          overflow-hidden), statt hart an der Kante abzuschliessen. Spalten
          sind bewusst hoeher als der sichtbare Bereich (Wiederholungs-
          Puffer je Spalte, siehe DESKTOP_COLUMNS/MOBILE_COLUMNS) -- der
          Ueberstand wird vom overflow-hidden der Section gekappt. */}
      <MosaicColumns
        columns={DESKTOP_COLUMNS}
        className="hidden lg:flex absolute -inset-x-8 top-0 gap-2"
        sizes="33vw"
      />
      <MosaicColumns
        columns={MOBILE_COLUMNS}
        className="flex lg:hidden absolute -inset-x-4 top-0 gap-1.5"
        sizes="33vw"
      />

      {/* Scrim -- getrennte Geometrie pro Breakpoint (Auftrag 8): Desktop
          kompakter (~100% Ellipsenhoehe statt der vorherigen 200%, die zu
          viel Bildflaeche ausserhalb des Contentbereichs gedaempft hat),
          Mobile eigene, schmalere/hoehere Ellipse fuer die kuerzere
          Section. Weich, elliptisch/radial, kein Rechteck, keine
          ausgesparte Flaeche. Farbe = bestehendes Buehnen-Token
          --pl-bg-stage (#12101a). Maximalwert 0.75 (harte Obergrenze,
          Auftrag 8), reale Werte per Screenshot/Pixelprobe verifiziert. */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 92% 118% at 50% 50%, rgba(18,16,26,0.75) 0%, rgba(18,16,26,0.72) 18%, rgba(18,16,26,0.66) 36%, rgba(18,16,26,0.57) 52%, rgba(18,16,26,0.44) 68%, rgba(18,16,26,0.28) 82%, rgba(18,16,26,0.12) 93%, rgba(18,16,26,0) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="lg:hidden absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 190% at 50% 50%, rgba(18,16,26,0.75) 0%, rgba(18,16,26,0.73) 20%, rgba(18,16,26,0.69) 40%, rgba(18,16,26,0.61) 55%, rgba(18,16,26,0.47) 70%, rgba(18,16,26,0.26) 85%, rgba(18,16,26,0) 100%)',
        }}
      />

      {/* Content -- bewusst im normalen Fluss (nicht absolute positioniert),
          damit er auf schmalen Breiten bei umbrechenden Anlass-Buttons
          nie vom overflow-hidden der Section abgeschnitten werden kann
          (Codex-P1/PR #24 -- weiterhin gueltiger Grundsatz, siehe
          lib/homepage/heroMosaicMobileHeight.test.ts). Die Section hat
          dadurch keine feste Hoehe: sie richtet sich nach diesem Content
          (mit min-h-Bodensatz oben), die Bilderwand darunter deckt exakt
          dieselbe Flaeche ab (absolute inset-0/-x). pt groesser als pb
          (statt symmetrischem py) -- Auftrag 10: mehr Luft zwischen der
          schwebenden Nav-Pill und der Eyebrow.
      */}
      <div className="relative z-10 flex items-center justify-center px-4 pt-28 pb-16 md:pt-32 md:pb-20 lg:pt-36 lg:pb-24">
        <div className="text-center max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-pl-accent-light">
            In und um Bayern
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-pl-on-stage">
            Livebands für dein Event.
          </h1>
          <p className="mt-4 text-base md:text-lg leading-relaxed text-pl-on-stage/80 max-w-md mx-auto">
            Echte Bands, echte Abende.
            <br />
            Von der Trauung bis zum vollen Festzelt.
          </p>

          <p className="mt-9 text-sm font-medium text-pl-on-stage/70">
            Was hast du vor?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3.5">
            {ANLASS_PILLS.map((pill) => (
              <Link
                key={pill.href}
                href={pill.href}
                className="inline-flex items-center px-6 py-3 rounded-full border border-pl-accent-light/30 bg-pl-stage-elevated/60 text-pl-on-stage text-[15px] font-semibold whitespace-nowrap
                           hover:border-pl-accent-light hover:bg-pl-accent-on-stage/15 hover:text-pl-elevated motion-safe:transition-colors
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pl-accent-light/70 focus-visible:ring-offset-2 focus-visible:ring-offset-pl-stage"
              >
                {pill.label}
              </Link>
            ))}
          </div>

          <Link
            href="/bands"
            className="inline-block mt-6 text-sm text-pl-on-stage/70 hover:text-pl-on-stage motion-safe:transition-colors"
          >
            Alle Bands ansehen →
          </Link>
        </div>
      </div>
    </section>
  );
}
