export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  band?: string;
  bandLink?: string;
};

export const testimonials: Testimonial[] = [
  {
    quote: "Alex ist super freundlich und höchst professionell. Wir arbeiten extrem gerne mit ihm zusammen. 100% Daumen hoch!",
    author: "Andreas Dombert",
    role: "Bandleader",
    band: "May Vibes",
    bandLink: "/band/may-vibes",
  },
  {
    quote: "Mit Alex zu arbeiten ist einfach angenehm – alles läuft strukturiert, entspannt und zuverlässig. Er behält stets den Überblick, reagiert schnell und bleibt dabei immer menschlich.",
    author: "Dominik Palmer",
    role: "Bassist & Bandleader",
    band: "More Candy",
    bandLink: "/band/more-candy",
  },
  {
    quote: "Vielen, vielen Dank für eure Hilfe. Das ist nicht selbstverständlich — ihr werdet sehr positiv in unserer Erinnerung bleiben.",
    author: "Marie & Patric",
    role: "Brautpaar",
  },
  {
    quote: "Ein riesengroßes Dankeschön für deine Hilfe. Das ist mehr, als ich erwartet habe. Mit dieser Auswahl finden wir sicher eine Band, die zu uns passt.",
    author: "Daniela & Johannes",
    role: "Brautpaar",
  },
];
