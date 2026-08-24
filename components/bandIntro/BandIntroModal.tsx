'use client';

import { useEffect, useRef, useState } from 'react';
import { BandIntroFormCore } from './BandIntroFormCore';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// Gleiches Dialog-Muster wie components/band/AnfrageModal.tsx: natives
// <dialog> uebernimmt Fokus-Trap, Top-Layer-Stacking und Ruecksprung des
// Fokus zum ausloesenden Element beim Schliessen von selbst -- kein
// hand-gerolltes Fokus-Management noetig. ESC ueber das native onCancel-
// Event, Backdrop-Klick ueber Vergleich von e.target mit dem Dialog selbst.
export function BandIntroModal({ isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // BandIntroFormCore wird bewusst per key neu instanziiert, sobald der
  // Dialog erneut geoeffnet wird -- sonst wuerde ein zweites Oeffnen nach
  // einem erfolgreichen Absenden den Success-State/die alten Formulardaten
  // der vorherigen Sitzung zeigen statt eines leeren Formulars (die
  // Formularkomponente selbst kennt "isOpen" nicht, da sie unveraendert
  // auch von app/fuer-bands/band-vorstellen/page.tsx wiederverwendet wird).
  // State-Anpassung waehrend des Renderns (offizielles React-Muster
  // "Adjusting state when a prop changes" -- Vergleich gegen den vorherigen
  // Wert in einem weiteren useState, bewusst KEIN Ref, da Refs waehrend des
  // Renderns weder gelesen noch geschrieben werden duerfen) statt in einem
  // Effect -- vermeidet einen zusaetzlichen Render-Umlauf und den
  // "setState in useEffect"-Lint-Befund.
  const [openCount, setOpenCount] = useState(0);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setOpenCount((c) => c + 1);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  // Schliesst den Dialog kurz nach erfolgreichem Absenden von selbst --
  // identisches, bereits etabliertes UX-Muster wie AnfrageModal (kein neues
  // Verhalten). Betrifft ausschliesslich das Zuruecknavigieren zur Seite,
  // von der aus der Dialog geoeffnet wurde -- keine Weiterleitung zu einem
  // externen Terminplaner o. Ae.
  function handleSuccess() {
    setTimeout(() => onClose(), 2500);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      className="fixed inset-0 m-auto
                 w-[min(92vw,640px)]
                 max-sm:w-full max-sm:max-w-full
                 max-sm:top-auto max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:m-0
                 p-0 border-0 bg-transparent
                 backdrop:bg-black/70"
    >
      <div
        className="flex flex-col overflow-hidden
                   max-h-[90dvh] max-sm:max-h-[92dvh]
                   rounded-2xl max-sm:rounded-t-2xl max-sm:rounded-b-none
                   shadow-2xl"
        style={{ background: '#1a1818', color: 'var(--pl-text-on-stage)' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[rgba(196,168,216,0.12)] shrink-0">
          <h2 className="text-base font-bold text-[#ede8e3]">Bandseite anfragen</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-[#8a7e84] hover:text-[#ede8e3] transition-colors rounded-md p-1 -mr-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <BandIntroFormCore key={openCount} onSuccess={handleSuccess} />
        </div>
      </div>
    </dialog>
  );
}
