'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { ImageAsset } from '@/lib/types/image';

type Props = {
  images: ImageAsset[];
  openIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

// Vergrößerungsfunktion für die Bühnengalerie (Auftrag "Bandseiten-
// Finalisierung": "bestehende Vergrößerungsfunktion" -- im Codebestand gab
// es keine wiederverwendbare Lightbox, deshalb neu gebaut, aber mit der
// bereits etablierten Modal-Konvention (natives <dialog>, showModal/close
// per Effekt, siehe AnfrageModal.tsx) statt eines neuen Overlay-Musters.
// Native <dialog> liefert Fokus-Trap und Escape-Handling ohne Zusatzcode.
export function GalleryLightbox({ images, openIndex, onClose, onNavigate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = openIndex !== null;
  const total = images.length;
  const current = isOpen ? images[openIndex] : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function goPrev() {
    if (openIndex === null) return;
    onNavigate((openIndex - 1 + total) % total);
  }

  function goNext() {
    if (openIndex === null) return;
    onNavigate((openIndex + 1) % total);
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      aria-label="Bildergalerie"
      className="fixed inset-0 m-auto w-screen h-screen max-w-none max-h-none p-0 border-0 bg-transparent backdrop:bg-black/90"
    >
      {current && (
        <div className="flex flex-col items-center justify-center w-full h-full p-4 sm:p-8 gap-4">
          <div className="relative w-full flex-1 min-h-0">
            <Image
              src={current.url}
              alt={current.alt}
              fill
              className="object-contain"
              sizes="94vw"
            />
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Vorheriges Bild"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-pl-on-stage hover:bg-white/20 motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
            >
              ←
            </button>
            <span className="text-sm text-pl-on-stage-muted tabular-nums">
              {openIndex! + 1} / {total}
            </span>
            <button
              type="button"
              onClick={goNext}
              aria-label="Nächstes Bild"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-pl-on-stage hover:bg-white/20 motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
            >
              →
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2.5 rounded-full text-sm font-semibold bg-pl-paper text-pl-text hover:bg-white motion-safe:transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
            >
              Schließen ✕
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
