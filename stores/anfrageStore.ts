import { create } from 'zustand';
import type { BandAnfrageEventType } from '@/lib/types/band';

export interface MerkBand {
  slug: string;
  name: string;
  anfrageEventTypes: BandAnfrageEventType[];
}

interface AnfrageStore {
  bands: MerkBand[];
  addBand: (band: MerkBand) => void;
  removeBand: (slug: string) => void;
  clearBands: () => void;
  isSelected: (slug: string) => boolean;
}

export const useAnfrageStore = create<AnfrageStore>((set, get) => ({
  bands: [],

  addBand: (band) =>
    set((state) => {
      if (state.bands.length >= 8) return state;
      if (state.bands.some((b) => b.slug === band.slug)) return state;
      return { bands: [...state.bands, band] };
    }),

  removeBand: (slug) =>
    set((state) => ({ bands: state.bands.filter((b) => b.slug !== slug) })),

  clearBands: () => set({ bands: [] }),

  isSelected: (slug) => get().bands.some((b) => b.slug === slug),
}));
