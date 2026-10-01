'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';

type VideoModalContextValue = {
  // trigger: das ausloesende Element -- ihm gibt das Modal beim Schliessen
  // den Fokus zurueck.
  openVideo: (trigger: HTMLElement | null) => void;
};

const VideoModalContext = createContext<VideoModalContextValue | null>(null);

export function useVideoModal(): VideoModalContextValue {
  const ctx = useContext(VideoModalContext);
  if (!ctx) throw new Error('useVideoModal braucht einen VideoModalProvider');
  return ctx;
}

type Props = {
  embedUrl: string | null;
  bandName: string;
  children: ReactNode;
};

// Genau EIN Video-Modal (natives <dialog>) pro Bandseite, das von mehreren
// Triggern geoeffnet wird (Poster-Tile in "02", Video-Pille im Hero).
// Datenschutz-Prinzip: der youtube-nocookie.com-Embed (und damit jede
// YouTube-Ressource) wird erst nach ZWEI bewussten Nutzeraktionen angefordert
// -- Trigger oeffnet das Modal, "Video laden" erzeugt erst dann das iframe.
// Vorher steht nur ein Hinweis im Eigendesign im DOM: kein iframe, kein
// YouTube-Vorschaubild von i.ytimg.com, kein Preconnect.
// Bewusst kein localStorage/sessionStorage/Cookie: jedes Oeffnen beginnt neu
// bei Zustand 1.
export function VideoModalProvider({ embedUrl, bandName, children }: Props) {
  const [loaded, setLoaded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const openVideo = useCallback((trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    setLoaded(false);
    dialogRef.current?.showModal();
  }, []);

  // Laeuft bei jedem Schliessen (ESC, Hintergrund, Schliessen-Button): iframe
  // wird aus dem DOM entfernt (stoppt die Wiedergabe), Fokus zurueck zum
  // ausloesenden Element.
  const handleClose = () => {
    setLoaded(false);
    triggerRef.current?.focus();
  };

  const value = useMemo(() => ({ openVideo }), [openVideo]);

  return (
    <VideoModalContext.Provider value={value}>
      {children}

      {embedUrl && (
        <dialog
          ref={dialogRef}
          onClose={handleClose}
          onClick={(e) => {
            // Klick auf den Hintergrund trifft das <dialog> selbst (Inhalt fuellt
            // es vollstaendig aus), Klicks im Inhalt nicht.
            if (e.target === e.currentTarget) e.currentTarget.close();
          }}
          aria-label={`${bandName} Video`}
          className="m-auto p-0 bg-transparent text-pl-on-stage w-screen max-w-none sm:w-[min(92vw,960px)] backdrop:bg-black/70"
        >
          <div className="flex justify-end pb-2 px-4 sm:px-0">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/10 text-pl-on-stage
                         border border-white/25 hover:bg-white/15 motion-safe:transition-colors
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
            >
              Schließen
            </button>
          </div>

          <div className="relative w-full aspect-video sm:rounded-xl overflow-hidden bg-pl-stage-elevated">
            {loaded ? (
              <iframe
                src={`${embedUrl}?autoplay=1`}
                title={`${bandName} Video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 sm:p-8 text-center">
                <p className="max-w-prose text-sm md:text-base text-pl-on-stage">
                  Beim Abspielen wird das Video von YouTube (Google) geladen. Dabei werden u.&nbsp;a.
                  deine IP-Adresse und die besuchte Seite an YouTube übermittelt. Mehr in der{' '}
                  <Link href="/datenschutz" className="underline underline-offset-2 hover:text-pl-accent-light">
                    Datenschutzerklärung
                  </Link>
                  .
                </p>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setLoaded(true)}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold
                             bg-pl-accent text-pl-on-accent hover:bg-pl-accent-hover motion-safe:transition-colors
                             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-accent-light"
                >
                  Video laden
                </button>
              </div>
            )}
          </div>
        </dialog>
      )}
    </VideoModalContext.Provider>
  );
}
