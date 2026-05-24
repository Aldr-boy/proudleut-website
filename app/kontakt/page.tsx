import { Metadata } from 'next'
import KontaktFormular from '@/components/kontakt/KontaktFormular'

export const metadata: Metadata = {
  title: 'Kontakt – proudleut',
  description:
    'Du suchst eine Liveband, möchtest deine Band vorstellen oder hast eine Idee? Schreib mir – ich lese jede Nachricht persönlich.',
}

export default function KontaktPage() {
  return (
    <main>
      <section className="bg-pl-stage py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-pl-on-stage mb-6">
            Kontakt zu proudleut
          </h1>
          <p className="text-pl-on-stage-muted text-lg leading-relaxed">
            Du suchst eine passende Liveband, möchtest Deine Band vorstellen oder hast eine Idee
            für proudleut? Schreib mir gerne. Ich lese jede Nachricht persönlich und melde mich
            so schnell wie möglich zurück.
          </p>
        </div>
      </section>

      <KontaktFormular />
    </main>
  )
}
