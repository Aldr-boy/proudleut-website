import { Fragment } from 'react';
import type { Band } from '@/lib/types/band';
import { hasWeddingContent } from '@/lib/bands/bandWeddingContent';
import { getSoloFirstName } from '@/lib/bands/solo';
import { weddingReferenceVenues } from '@/lib/bands/weddingReferenceVenues';
import { BandRow } from './BandRow';

type Props = { band: Band };

// Zeile "Hochzeit" im Zeilenraster von BandTagsSection.tsx (Prototyp E):
// Karte mit Titel und kurzer Stimmungszeile links, den Entscheidungswerten
// rechts (ab md zweispaltig). weddingDescription ist eine kurze, bestehende
// Stimmungszeile der Band (z. B. "aufregend - pfundig - bewegend") --
// servergerendert, keine erfundene Ergaenzung. Nur das vorhandene
// Hochzeitsmodell, keine generischen Anlass-Karten.
export function BandWeddingModule({ band }: Props) {
  if (!hasWeddingContent(band)) return null;

  const info = band.weddingInfo;
  const venues = weddingReferenceVenues(band.referenceEvents);

  const decisionCards = [
    info?.kidnappingBride != null
      ? { label: 'Brautentführung', value: info.kidnappingBride ? 'Ja' : 'Nein' }
      : null,
    info?.moderation != null
      ? { label: 'Moderation', value: info.moderation ? 'Ja' : 'Nein' }
      : null,
    info?.possiblePlaytimes
      ? { label: 'Mögliche Spieldauer', value: info.possiblePlaytimes }
      : null,
  ].filter((c): c is { label: string; value: string } => c !== null);

  return (
    <BandRow label="Hochzeit" tone="accent">
      {/* Mobil untereinander: Stimmung, Locations, Tabelle (order). Ab md zwei
          Spalten (Text | Tabelle) und darunter die Locations ueber die ganze
          Breite. */}
      <div className="bg-pl-elevated border border-pl-soft rounded-2xl p-5 sm:p-7 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start gap-5 md:gap-x-10">
        <div className={`min-w-0 order-1 md:order-none ${decisionCards.length > 0 ? '' : 'md:col-span-2'}`}>
          <h3 className="text-xl md:text-2xl font-extrabold leading-tight text-pl-text mb-2">
            Wenn {getSoloFirstName(band) ?? 'diese Band'} eure Hochzeit begleitet
          </h3>
          {info?.weddingDescription && (
            <p className="font-serif italic text-base text-pl-text-muted">
              {info.weddingDescription}
            </p>
          )}
        </div>

        {decisionCards.length > 0 && (
          <div className="order-3 md:order-none">
            {decisionCards.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 py-2.5 text-sm border-b border-pl-soft first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="text-pl-text-muted">{label}</span>
                <strong className="text-pl-text">{value}</strong>
              </div>
            ))}
          </div>
        )}

          {venues.length > 0 && (
            <div className="order-2 md:order-none md:col-span-2 md:border-t md:border-pl-soft md:mt-2 md:pt-6">
              <p className="text-xs font-semibold text-pl-text-muted uppercase tracking-wider mb-2">
                Hier feiern wir gerne
              </p>
              {/* Jeder Eintrag bleibt als Ganzes zusammen (inline-block); der
                  Mittelpunkt haengt am vorangehenden Eintrag, damit er nie am
                  Zeilenanfang steht. */}
              <p className="text-sm font-medium text-pl-text leading-relaxed">
                {venues.map((v, i) => (
                  <Fragment key={i}>
                    <span className="inline-block max-w-full break-words">
                      {v}
                      {i < venues.length - 1 && <span aria-hidden="true"> ·</span>}
                    </span>
                    {i < venues.length - 1 && ' '}
                  </Fragment>
                ))}
              </p>
            </div>
          )}
      </div>
    </BandRow>
  );
}
