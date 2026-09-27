// Reine Zeilenaufbau-Logik fuer components/homepage/BandEinschaetzen.tsx
// (Section 03 "Eine Band einschaetzen", Auftrag "Section 03 erweitern"),
// bewusst ausgelagert fuer deterministische Tests -- identisches Prinzip
// wie lib/homepage/allBandsSelection.ts. Bewusst ohne "@/"-Importe
// (relative Importe mit .ts-Endung), damit diese Datei direkt per
// `node --test` importierbar bleibt.
import type { Band, BandDocument } from '../types/band';
import { isFollowerCountVisible, resolveFollowerStandDisplay } from '../socialLinks/followerCountVisibility.ts';
import { shouldShowOwnListenersStand } from '../socialLinks/listenersStandDisplay.ts';
import { formatFollowerCount, formatStandDate, formatStandMonthYear } from '../socialLinks/formatFollowerMetrics.ts';

export type TextRow = { kind: 'text'; label: string; value: string };

export type SocialMetricDisplay = {
  key: string;
  label: string;
  formattedCount: string;
  unit: string;
  // Nur gesetzt, wenn dieses Datum NICHT bereits im gemeinsamen Stand der
  // Zeile steckt (sharedStandText) -- siehe buildSocialRow.
  standText?: string;
};

export type SocialRow = {
  kind: 'social';
  label: string;
  metrics: SocialMetricDisplay[];
  // Nur gesetzt, wenn alle sichtbaren Follower-Metriken denselben
  // Kalendertag als Pruefstand haben (siehe resolveFollowerStandDisplay).
  sharedStandText?: string;
};

export type DocumentRow = { kind: 'document'; label: string; href: string };

export type EinschaetzenRow = TextRow | SocialRow | DocumentRow;

// "Social & Streaming" (Auftrag Abschnitt 2): Reihenfolge Spotify,
// Instagram, Facebook, YouTube. Sichtbarkeit und Stand-Logik sind exakt
// dieselben wie auf der Bandseite (BandContactSection.tsx) -- keine
// eigene 12-Monats- oder Gruppierungsregel. Kennzahlen werden NIE addiert
// oder zu einer Gesamtsumme zusammengefasst.
export function buildSocialRow(band: Band): SocialRow | null {
  const spotify = band.spotifyMonthlyListeners;
  const spotifyVisible = isFollowerCountVisible(spotify?.count, spotify?.asOf);

  const instagram = band.socialProfileMetrics?.instagram;
  const instagramVisible = isFollowerCountVisible(instagram?.count, instagram?.checkedAt);

  const facebook = band.socialProfileMetrics?.facebook;
  const facebookVisible = isFollowerCountVisible(facebook?.count, facebook?.checkedAt);

  const youtube = band.socialProfileMetrics?.youtube;
  const youtubeVisible = isFollowerCountVisible(youtube?.count, youtube?.checkedAt);

  if (!spotifyVisible && !instagramVisible && !facebookVisible && !youtubeVisible) {
    return null;
  }

  // Gemeinsamer vs. plattformweiser Pruefstand wird -- wie auf der
  // Bandseite -- ausschliesslich aus den sichtbaren Follower-Metriken
  // abgeleitet (Instagram/Facebook/YouTube), nicht aus Spotify.
  const followerChecks = (
    [
      instagramVisible ? { checkedAt: instagram!.checkedAt as string } : null,
      facebookVisible ? { checkedAt: facebook!.checkedAt as string } : null,
      youtubeVisible ? { checkedAt: youtube!.checkedAt as string } : null,
    ] as ({ checkedAt: string } | null)[]
  ).filter((c): c is { checkedAt: string } => c !== null);

  const standDisplay = resolveFollowerStandDisplay(followerChecks);
  const showOwnStandPerPlatform = standDisplay.kind === 'per_platform';

  const metrics: SocialMetricDisplay[] = [];

  if (spotifyVisible) {
    const asOf = spotify!.asOf as string;
    metrics.push({
      key: 'spotify',
      label: 'Spotify',
      formattedCount: formatFollowerCount(spotify!.count as number),
      unit: 'Monatliche Hörer*innen',
      standText: shouldShowOwnListenersStand(asOf, standDisplay) ? `Stand: ${formatStandDate(asOf)}` : undefined,
    });
  }
  if (instagramVisible) {
    metrics.push({
      key: 'instagram',
      label: 'Instagram',
      formattedCount: formatFollowerCount(instagram!.count as number),
      unit: 'Follower',
      standText: showOwnStandPerPlatform ? `Stand: ${formatStandDate(instagram!.checkedAt as string)}` : undefined,
    });
  }
  if (facebookVisible) {
    metrics.push({
      key: 'facebook',
      label: 'Facebook',
      formattedCount: formatFollowerCount(facebook!.count as number),
      unit: 'Follower',
      standText: showOwnStandPerPlatform ? `Stand: ${formatStandDate(facebook!.checkedAt as string)}` : undefined,
    });
  }
  if (youtubeVisible) {
    metrics.push({
      key: 'youtube',
      label: 'YouTube',
      formattedCount: formatFollowerCount(youtube!.count as number),
      unit: 'Abonnenten',
      standText: showOwnStandPerPlatform ? `Stand: ${formatStandDate(youtube!.checkedAt as string)}` : undefined,
    });
  }

  return {
    kind: 'social',
    label: 'Social & Streaming',
    metrics,
    sharedStandText: standDisplay.kind === 'shared' ? `Stand: ${formatStandMonthYear(standDisplay.checkedAt)}` : undefined,
  };
}

// band_documents hat kein Typfeld -- title/audience_label sind Freitext
// (siehe lib/types/band.ts BandDocument, admin-editierbar). Ein Dokument
// gilt nur dann eindeutig als Presse-/Booking-Info, wenn Titel oder
// Zielgruppen-Label sowohl "presse" als auch "booking" enthalten. Gibt es
// keinen oder mehr als einen Treffer, entfaellt die Zeile -- kein
// blindes documents[0] (Auftrag: "Verwende nicht blind band.documents[0]").
export function isPressBookingDocument(doc: BandDocument): boolean {
  const haystack = `${doc.title} ${doc.audienceLabel}`.toLowerCase();
  return haystack.includes('presse') && haystack.includes('booking');
}

export function buildDocumentRow(band: Band): DocumentRow | null {
  const matches = band.documents.filter(isPressBookingDocument);
  if (matches.length !== 1) return null;
  return { kind: 'document', label: 'Für Veranstalter', href: matches[0].fileUrl };
}

// Zeilenreihenfolge (Auftrag Abschnitt 2): Klingt nach, Stil & Einfluesse,
// Spielt bei, Herkunft, Social & Streaming, Fuer Veranstalter,
// Fotos & Video. "Besetzung" wird in dieser Homepage-Demo bewusst nicht
// gezeigt (Bandprofil-Seite bleibt unveraendert). Jede Zeile ist optional
// -- fehlt der Wert, entfaellt die Zeile. "Fotos & Video" bleibt immer
// die letzte Zeile.
export function buildEinschaetzenRows(band: Band): EinschaetzenRow[] {
  const rows: EinschaetzenRow[] = [];

  if (band.klingtNach.length > 0) {
    rows.push({ kind: 'text', label: 'Klingt nach', value: band.klingtNach.slice(0, 3).join(', ') });
  }
  if (band.musikalischVerortet.length > 0) {
    rows.push({ kind: 'text', label: 'Stil & Einflüsse', value: band.musikalischVerortet.join(', ') });
  }
  if (band.eventTypes.length > 0) {
    rows.push({ kind: 'text', label: 'Spielt bei', value: band.eventTypes.slice(0, 3).join(', ') });
  }

  const herkunft = [band.location.city, band.location.administrativeRegion]
    .filter((v): v is string => Boolean(v))
    .join(' — ');
  if (herkunft) {
    rows.push({ kind: 'text', label: 'Herkunft', value: herkunft });
  }

  const socialRow = buildSocialRow(band);
  if (socialRow) rows.push(socialRow);

  const documentRow = buildDocumentRow(band);
  if (documentRow) rows.push(documentRow);

  const hasPhotos = Boolean(band.heroImage) || band.gallery.length > 0;
  const hasVideo = Boolean(band.youtubeVideoUrl);
  if (hasPhotos || hasVideo) {
    rows.push({ kind: 'text', label: 'Fotos & Video', value: 'Direkt im Profil' });
  }

  return rows;
}
