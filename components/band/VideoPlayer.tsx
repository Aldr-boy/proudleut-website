'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ImageAsset } from '@/lib/types/image';

type Props = {
  embedUrl: string;
  bandName: string;
  poster?: ImageAsset;
};

// Video-Trigger + Modal (natives <dialog>). Datenschutz-Prinzip: der
// youtube-nocookie.com-Embed (und damit jede YouTube-Ressource) wird erst nach
// ZWEI bewussten Nutzeraktionen angefordert -- Trigger oeffnet das Modal,
// "Video laden" erzeugt erst dann das iframe. Vorher steht nur ein Hinweis im
// Eigendesign im DOM: kein iframe, kein YouTube-Vorschaubild von i.ytimg.com,
// kein Preconnect. Der Trigger zeigt weiter ein lokales Bandbild.
// Bewusst kein localStorage/sessionStorage/Cookie: jedes Oeffnen beginnt neu
// bei Zustand 1.
export function VideoPlayer({ embedUrl, bandName, poster }: Props) {
  const [loaded, setLoaded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    setLoaded(false);
    dialogRef.current?.showModal();
  };

  // Laeuft bei jedem Schliessen (ESC, Hintergrund, Schliessen-Button): iframe
  // wird aus dem DOM entfernt (stoppt die Wiedergabe), Fokus zurueck zum Trigger.
  const handleClose = () => {
    setLoaded(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`${bandName} Video ansehen`}
        className="group absolute inset-0 w-full h-full focus:outline-none"
      >
        {poster && (
          <Image
            src={poster.url}
            alt=""
            aria-hidden="true"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 700px, 100vw"
          />
        )}
        <span className="absolute inset-0 bg-black/25 group-hover:bg-black/35 motion-safe:transition-colors" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 text-pl-stage
                       shadow-lg group-hover:scale-105 motion-safe:transition-transform
                       group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-white"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>

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
    </>
  );
}
