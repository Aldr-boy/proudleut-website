type Props = {
  embedUrl: string | null;
  bandName: string;
};

export function BandVideoSection({ embedUrl, bandName }: Props) {
  if (!embedUrl) return null;

  return (
    <section className="bg-pl-canvas py-8 md:py-10">
      <div className="max-w-[820px] mx-auto px-4 sm:px-6">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-pl-stage">
          <iframe
            src={embedUrl}
            title={`${bandName} Video`}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
