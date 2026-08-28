// Ein einzelner, echter Veranstalter-Moment direkt nach dem persoenlichen
// Hilfe-Block (CuratorBlock) und vor dem FAQ -- bewusst KEINE Bewertungs-/
// Testimonial-Card (siehe components/homepage/Testimonials.tsx, dort
// mehrere Karten mit dekorativem Anfuehrungszeichen, hier nicht
// wiederverwendet, da das eine andere Aussage transportiert). Reiner
// ruhiger Pullquote-Moment, das Zitat selbst ist der visuelle Schwerpunkt.
export default function VeranstalterStatement() {
  return (
    <section className="bg-pl-paper py-16 md:py-24 px-4 sm:px-6">
      <div className="pl-container-shell">
        <div className="max-w-[640px] mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-pl-text leading-snug">
            Manchmal braucht es einfach jemanden, der mitdenkt.
          </h2>

          <figure className="mt-8">
            <blockquote className="text-2xl md:text-3xl leading-relaxed font-medium text-pl-text">
              <p>
                „Bei Alex steht nicht der persönliche Profit im Vordergrund, sondern der
                individuelle Kundenwunsch. Durch seine Empfehlungen konnte ich für unsere
                Firmenweihnachtsfeier eine tolle Band finden und für uns gewinnen. Meine
                uneingeschränkte Weiterempfehlung für Proudleut.“
              </p>
            </blockquote>
            <figcaption className="mt-6 border-t border-pl-soft pt-4 inline-block">
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
