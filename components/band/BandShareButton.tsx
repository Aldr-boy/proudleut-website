'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from 'fathom-client';

type Props = {
  name: string;
  // Spruch der Band (Text im Teilen-Dialog); leer, wenn die Band keinen hat.
  tagline?: string;
  // Kanonische Bandadresse (absolut, SITE_URL) -- nie die Adresse der Vorschau.
  url: string;
};

// Teilen-Knopf im mobilen Bandprofil-Header (nur unter md): sitzt als Lasche
// rechts auf der Oberkante der Aubergine-Flaeche (BandHero.tsx), halb ueber dem
// Bild. Oeffnet den Teilen-Dialog des Geraets; Abbruch durch die Person tut
// nichts weiter. Ohne Teilen-Dialog oder bei einem anderen Fehler: Link in die
// Zwischenablage, Hinweis "Link kopiert" bzw. ehrlicher Hinweis bei Misserfolg.
// Messung: ein Fathom-Ereignis "share_click" pro Antippen (Fathom-Ereignisse
// tragen nur einen Namen, keine weiteren Angaben). Ein Messfehler darf Teilen
// und Kopieren nie verhindern.
export function BandShareButton({ name, tagline, url }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function showToast(message: string) {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2000);
  }

  async function handleShare() {
    try {
      trackEvent('share_click');
    } catch {
      // Messung ist optional
    }

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name} · proudleut`, ...(tagline ? { text: tagline } : {}), url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // anderer Fehler: weiter mit der Zwischenablage
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Link kopiert');
    } catch {
      showToast('Link konnte nicht kopiert werden');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label="Teilen"
        className="md:hidden absolute top-0 right-[22px] -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#f3eee6] text-[#231b21] ring-[3px] ring-pl-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pl-accent-light"
      >
        <svg width="17" height="19" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 14V2M5.5 6.5L10 2l4.5 4.5M4 10v9.5h12V10" />
        </svg>
      </button>

      {toast &&
        createPortal(
        <div
          role="status"
          className="md:hidden fixed left-1/2 bottom-[112px] z-50 -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-[#f3eee6] px-[18px] py-2.5 text-[15px] font-semibold text-[#231b21] shadow-[0_8px_24px_rgba(20,12,18,0.3)]"
        >
          {toast}
        </div>,
          document.body,
        )}
    </>
  );
}
