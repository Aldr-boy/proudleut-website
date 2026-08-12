type Props = {
  embedUrl: string | null;
  bandName: string;
};

export function BandVideoSection({ embedUrl, bandName }: Props) {
  if (!embedUrl) return null;

  // Spacing-Rhythmus "small": Video und Ueber-Text (BandDescription) bleiben
  // dramaturgisch ein Block ("erst erleben, dann kennenlernen") -- generoeser
  // Einstieg von oben, knapper Abstand nach unten zum direkt folgenden Text.
  return (
    <section className="bg-pl-canvas pt-16 md:pt-20 pb-6 md:pb-8 px-4 sm:px-6">
      <div className="max-w-[820px] mx-auto">
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
