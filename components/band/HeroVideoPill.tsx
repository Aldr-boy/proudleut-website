'use client';

import { useVideoModal } from './VideoModalProvider';

type Props = {
  // Fuer den zugaenglichen Namen (sr-only-Zusatz "– Video von {Bandname}").
  bandName: string;
  // 'image': auf dem Hero-Bild; 'light': im kurzen Kopf ohne Bandbild.
  tone: 'image' | 'light';
  className?: string;
};

// Video-Pille "Live ansehen · YouTube": oeffnet das Video-Modal
// (VideoModalProvider), fuehrt nicht mehr zu YouTube weg -- daher ein Button
// ohne Extern-Icon.
export function HeroVideoPill({ tone, bandName, className = '' }: Props) {
  const { openVideo } = useVideoModal();

  // Haptik: Glasflaeche (dunkler Grund mit heller Verlaufs-Kante, damit der
  // helle Text auch auf hellen Fotos >= 4.5:1 bleibt), Lichtkante oben (inset),
  // weicher Schlagschatten. Hover (nur Geraete mit Hover, Tailwind v4 kapselt
  // hover: in @media (hover: hover)): 1 px anheben, groesserer Schatten, Flaeche
  // heller, Play-Icon +5 %. Gedrueckt (active, auch bei Touch): zurueck auf 0,
  // scale 0.98, kleiner Schatten. Bewegung nur unter motion-safe; bei
  // prefers-reduced-motion bleiben Farb-/Schattenwechsel. Fokusring (nur per
  // Tastatur) 3 px hell mit dunklem Halo, auf hellem und dunklem Grund lesbar.
  const toneClasses =
    tone === 'image'
      ? `border border-white/30 text-pl-on-stage backdrop-blur-sm bg-pl-stage/60 bg-linear-to-b from-white/[0.18] to-white/[0.06]
         shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_8px_rgba(0,0,0,0.35)]
         hover:bg-pl-stage/45 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_4px_14px_rgba(0,0,0,0.45)]
         active:bg-pl-stage/60 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.35)]
         focus-visible:outline-pl-on-stage focus-visible:shadow-[0_0_0_2px_rgba(18,16,26,0.9),0_2px_8px_rgba(0,0,0,0.35)]`
      : `border-[1.5px] border-pl-text text-pl-text bg-pl-paper
         shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_2px_6px_rgba(42,34,38,0.14)]
         hover:bg-pl-canvas hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_rgba(42,34,38,0.2)]
         active:bg-pl-paper active:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(42,34,38,0.16)]
         focus-visible:outline-pl-accent`;
  const iconClasses = tone === 'image' ? 'bg-pl-paper text-pl-stage' : 'bg-pl-text text-pl-paper';
  const subClasses = tone === 'image' ? 'text-pl-on-stage/80' : 'text-pl-text-muted';

  return (
    <button
      type="button"
      onClick={(e) => openVideo(e.currentTarget)}
      aria-haspopup="dialog"
      className={`group inline-flex items-center gap-2.5 h-12 md:h-[52px] pl-2 pr-4 md:pr-5 rounded-full text-sm font-bold
                  motion-safe:transition-[translate,scale,box-shadow,background-color] motion-safe:duration-150
                  motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]
                  focus-visible:outline-[3px] focus-visible:outline-offset-2
                  ${toneClasses} ${className}`}
    >
      <span className={`flex items-center justify-center w-8 h-8 md:w-[34px] md:h-[34px] rounded-full motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:scale-105 ${iconClasses}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      Live ansehen
      <span className={`font-medium text-xs md:text-[13px] ${subClasses}`}>· YouTube</span>
      <span className="sr-only">– Video von {bandName}</span>
    </button>
  );
}
