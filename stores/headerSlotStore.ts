import { create } from 'zustand';

// Registry fuer den Slot im Header (components/Header.tsx, data-header-slot):
// der Header meldet das leere, absolut positionierte Slot-Element an, Seiten
// (BandFloatingCta, per createPortal) lesen es ueber useHeaderSlot.
// Bewusst ohne persist/Storage: reiner Laufzeitzustand. Bleibt der Slot leer,
// aendert er weder Hoehe noch Landmarks noch Tab-Reihenfolge des Headers.
// compact: Die kompakte Pille (components/band/CompactPill.tsx) ist aktiv; der
// Header macht dann seine normale Pille inert und aria-hidden (sie bleibt
// sichtbar darunter und im Fluss). Wird von BandFloatingCta gesetzt und beim
// Verlassen der Bandseite zurueckgesetzt.
type HeaderSlotState = {
  slotEl: HTMLElement | null;
  setSlotEl: (el: HTMLElement | null) => void;
  compact: boolean;
  setCompact: (compact: boolean) => void;
};

export const useHeaderSlotStore = create<HeaderSlotState>((set) => ({
  slotEl: null,
  setSlotEl: (el) => set({ slotEl: el }),
  compact: false,
  setCompact: (compact) => set({ compact }),
}));

export function useHeaderSlot(): HTMLElement | null {
  return useHeaderSlotStore((s) => s.slotEl);
}
