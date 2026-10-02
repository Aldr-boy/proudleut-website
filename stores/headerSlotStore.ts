import { create } from 'zustand';

// Registry fuer den Slot im Header (components/Header.tsx, data-header-slot):
// der Header meldet das leere, absolut positionierte Slot-Element an, Seiten
// (kuenftig BandFloatingCta, per createPortal) lesen es ueber useHeaderSlot.
// Bewusst ohne persist/Storage: reiner Laufzeitzustand. Bleibt der Slot leer,
// aendert er weder Hoehe noch Landmarks noch Tab-Reihenfolge des Headers.
type HeaderSlotState = {
  slotEl: HTMLElement | null;
  setSlotEl: (el: HTMLElement | null) => void;
};

export const useHeaderSlotStore = create<HeaderSlotState>((set) => ({
  slotEl: null,
  setSlotEl: (el) => set({ slotEl: el }),
}));

export function useHeaderSlot(): HTMLElement | null {
  return useHeaderSlotStore((s) => s.slotEl);
}
