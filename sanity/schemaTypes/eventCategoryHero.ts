import { defineField, defineType } from 'sanity'

export const eventCategoryHero = defineType({
  name: 'eventCategoryHero',
  title: 'Kategorie-Hero',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'Kategorie-Slug',
      type: 'string',
      description:
        'Muss exakt mit dem Slug in lib/categories.ts übereinstimmen, z. B. "hochzeit", "festzelt", "firmenfeier", "geburtstag", "gala"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero-Bild',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'heroImageAlt',
      title: 'Alt-Text (Bild)',
      type: 'string',
      description: 'Kurze Bildbeschreibung für Barrierefreiheit und SEO',
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'string',
      description:
        'Kurze emotionale Hero-Zeile unter dem Titel, z. B. „Vom Sektempfang bis zur letzten Runde"',
    }),
  ],
  preview: {
    select: { title: 'slug', subtitle: 'subtitle', media: 'heroImage' },
    prepare({ title, subtitle, media }) {
      return {
        title: `Kategorie: ${title ?? '–'}`,
        subtitle: subtitle ?? 'Kein Subtitle',
        media,
      }
    },
  },
})
