// Kompakter redaktioneller Vertrauensbeleg direkt nach dem persoenlichen
// Hilfe-Block (CuratorBlock) -- bewusst kein eigenes grosses Kapitel mehr,
// sondern eine schmale Bestaetigung (Headline links, Zitat rechts,
// Raster/Gap wie CuratorBlock und FAQ bereits verwenden). Weiterhin KEINE
// Bewertungs-/Testimonial-Card (siehe components/homepage/Testimonials.tsx,
// dort mehrere Karten mit dekorativem Anfuehrungszeichen -- hier nicht
// wiederverwendet, da das eine andere Aussage transportiert).
export default function VeranstalterStatement() {
  return (
    <section className="bg-pl-paper py-10 md:py-12 px-4 sm:px-6">
      <div className="pl-container-shell border-t border-pl-soft pt-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 md:gap-16 items-start">
          <h2 className="text-xl md:text-2xl font-semibold text-pl-text leading-snug">
            Manchmal braucht es einfach jemanden, der mitdenkt.
          </h2>

          <figure>
            <blockquote className="text-xl md:text-2xl leading-relaxed font-medium text-pl-text">
              <p>
                „Bei Alex steht nicht der persönliche Profit im Vordergrund, sondern der
                individuelle Kundenwunsch. Durch seine Empfehlungen konnte ich für unsere
                Firmenweihnachtsfeier eine tolle Band finden und für uns gewinnen. Meine
                uneingeschränkte Weiterempfehlung für Proudleut.“
              </p>
            </blockquote>
            <figcaption className="mt-4">
              <span className="block font-semibold text-pl-text">Dagmar</span>
              <span className="block text-sm text-pl-text-muted mt-0.5">
                Assistenz Geschäftsführung · Eiffage Infra-Süd GmbH
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
