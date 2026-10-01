'use client';

import { useVideoModal } from './VideoModalProvider';

type Props = {
  // 'image': auf dem Hero-Bild; 'light': im kurzen Kopf ohne Bandbild.
  tone: 'image' | 'light';
  className?: string;
};

// Video-Pille "Live ansehen · YouTube": oeffnet das Video-Modal
// (VideoModalProvider), fuehrt nicht mehr zu YouTube weg -- daher ein Button
// ohne Extern-Icon.
export function HeroVideoPill({ tone, className = '' }: Props) {
  const { openVideo } = useVideoModal();

  const toneClasses =
    tone === 'image'
      ? 'bg-pl-stage/70 border border-white/40 text-pl-on-stage hover:bg-pl-stage/85 focus-visible:outline-pl-accent-light'
      : 'border-[1.5px] border-pl-text text-pl-text hover:bg-pl-text/5 focus-visible:outline-pl-accent';
  const iconClasses = tone === 'image' ? 'bg-pl-paper text-pl-stage' : 'bg-pl-text text-pl-paper';
  const subClasses = tone === 'image' ? 'text-pl-on-stage/80' : 'text-pl-text-muted';

  return (
    <button
      type="button"
      onClick={(e) => openVideo(e.currentTarget)}
      aria-haspopup="dialog"
      className={`inline-flex items-center gap-2.5 h-12 md:h-[52px] pl-2 pr-4 md:pr-5 rounded-full text-sm font-bold
                  motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2
                  ${toneClasses} ${className}`}
    >
      <span className={`flex items-center justify-center w-8 h-8 md:w-[34px] md:h-[34px] rounded-full ${iconClasses}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      Live ansehen
      <span className={`font-medium text-xs md:text-[13px] ${subClasses}`}>· YouTube</span>
    </button>
  );
}
