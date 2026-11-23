import { create } from 'zustand';
import type { BandAnfrageEventType } from '@/lib/types/band';
import { trackWishlistEvent, WISHLIST_BAND_ADDED } from '@/lib/analytics/wishlistEvents';

export interface MerkBand {
  slug: string;
  name: string;
  anfrageEventTypes: BandAnfrageEventType[];
}

interface AnfrageStore {
  bands: MerkBand[];
  // Einmaliger Hinweis nach dem ersten Merken der Sitzung. Nur Arbeitsspeicher
  // (kein Cookie, kein Storage): nach einem Neuladen darf er erneut erscheinen.
  firstAddHintVisible: boolean;
  dismissFirstAddHint: () => void;
  addBand: (band: MerkBand) => void;
  removeBand: (slug: string) => void;
  clearBands: () => void;
  isSelected: (slug: string) => boolean;
}

let firstAddHintShown = false;

export const useAnfrageStore = create<AnfrageStore>((set, get) => ({
  bands: [],
  firstAddHintVisible: false,
  dismissFirstAddHint: () => set({ firstAddHintVisible: false }),

  // Merken ist bewusst unbegrenzt (Produktentscheidung Nachgang
  // "Merkliste-Mengenbegrenzung"): die Acht-Grenze gilt ausschliesslich fuer
  // die Auswahl innerhalb einer einzelnen Anfrage (siehe MerklisteFlow.tsx),
  // nicht fuer die Merkliste selbst. Weiterhin nur Duplikate verhindern.
  addBand: (band) => {
    if (get().bands.some((b) => b.slug === band.slug)) return;
    set((state) => ({ bands: [...state.bands, band] }));
    // Nur bei tatsaechlich neu hinzugefuegter Band (nicht beim Entfernen, nicht
    // beim Laden der Seite).
    trackWishlistEvent(WISHLIST_BAND_ADDED);
    if (!firstAddHintShown) {
      firstAddHintShown = true;
      set({ firstAddHintVisible: true });
    }
  },

  removeBand: (slug) =>
    set((state) => ({ bands: state.bands.filter((b) => b.slug !== slug) })),

  clearBands: () => set({ bands: [] }),

  isSelected: (slug) => get().bands.some((b) => b.slug === slug),
}));
