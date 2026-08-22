import Image from 'next/image';
import Link from 'next/link';
import type { Band } from '@/lib/types/band';

type Row = { label: string; value: string };

// Baut die Detailzeilen ausschliesslich aus tatsaechlich vorhandenen Feldern
// des uebergebenen (echten) Bandprofils -- kein Wert wird erfunden oder aus
// dem Claude-Design uebernommen. Ein Feld ohne belastbaren Wert erzeugt
// keine Zeile.
function buildRows(band: Band): Row[] {
  const rows: Row[] = [];

  if (band.klingtNach.length > 0) {
    rows.push({ label: 'Klingt nach', value: band.klingtNach.slice(0, 3).join(', ') });
  }
  if (band.musikalischVerortet.length > 0) {
    rows.push({ label: 'Stil & Einflüsse', value: band.musikalischVerortet.join(', ') });
  }
  if (band.eventTypes.length > 0) {
    rows.push({ label: 'Spielt bei', value: band.eventTypes.slice(0, 3).join(', ') });
  }
  const herkunft = [band.location.city, band.location.administrativeRegion]
    .filter((v): v is string => Boolean(v))
    .join(' — ');
  if (herkunft) {
    rows.push({ label: 'Herkunft', value: herkunft });
  }
  if (band.weddingInfo?.bandSize) {
    rows.push({ label: 'Besetzung', value: band.weddingInfo.bandSize });
  }
  const hasPhotos = Boolean(band.heroImage) || band.gallery.length > 0;
  const hasVideo = Boolean(band.youtubeVideoUrl);
  if (hasPhotos || hasVideo) {
    rows.push({ label: 'Fotos & Video', value: 'Direkt im Profil' });
  }

  return rows;
}

export default function BandEinschaetzen({ band }: { band: Band }) {
  const rows = buildRows(band);
  const image = band.heroImage ?? band.thumbnailImage;

  return (
    <section className="bg-pl-stage px-4 sm:px-6 py-16 md:py-24">
      <div className="pl-container-shell">
        <p className="text-xs font-semibold text-pl-accent-light uppercase tracking-wider">
          03 — Eine Band einschätzen
        </p>
        <h2 className="mt-4 md:mt-5 text-3xl md:text-[40px] leading-[1.15] font-extrabold tracking-tight text-pl-on-stage max-w-[16ch]">
          Welche Band passt wirklich zu uns?
        </h2>
        <p className="mt-4 text-base md:text-lg leading-relaxed text-pl-on-stage-muted max-w-[560px]">
          Ein Foto allein beantwortet das nicht. Deshalb ordnet jede Bandseite auf proudleut ein:
          wie eine Band klingt, wofür sie spielt und wie sie live aussieht.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 mt-11 items-start">
          <div>
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-pl-stage-elevated">
              {image && (
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              )}
            </div>
            <p className="mt-2.5 font-mono text-xs text-pl-on-stage-muted">
              {band.name} — live. Ein Bandprofil auf proudleut.
            </p>
          </div>

          <div>
            <div className="flex flex-col">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:gap-6 py-3.5 border-t border-pl-border-stage first:border-t-0 sm:first:border-t"
                >
                  <div className="font-mono text-xs uppercase tracking-wider text-pl-on-stage-muted sm:w-40 sm:shrink-0">
                    {row.label}
                  </div>
                  <div className="text-[15px] font-semibold text-pl-on-stage">{row.value}</div>
                </div>
              ))}
            </div>
            <Link
              href={`/band/${band.slug}`}
              className="inline-block mt-6 text-sm font-semibold text-pl-accent-light hover:text-pl-on-stage motion-safe:transition-colors"
            >
              Bandseite ansehen →
            </Link>
            <p className="mt-5 font-mono text-xs leading-relaxed text-pl-on-stage-muted">
              Ein Beispiel, keine Empfehlung — jede Band auf proudleut ist so eingeordnet.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
