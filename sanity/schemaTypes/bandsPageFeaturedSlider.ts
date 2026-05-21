import { defineArrayMember, defineField, defineType } from 'sanity'

export const featuredSliderSlide = defineType({
  name: 'featuredSliderSlide',
  title: 'Slide',
  type: 'object',
  fields: [
    defineField({
      name: 'bandSlug',
      title: 'Band-Slug',
      type: 'string',
      description: 'Slug der Airtable-Band, z. B. soiznpepper',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'headline',
      title: 'Überschrift',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Teaser',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Sliderbild',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'imageAlt',
      title: 'Alt-Text',
      type: 'string',
    }),
    defineField({
      name: 'ctaLabel',
      title: 'CTA-Label',
      type: 'string',
      initialValue: 'Profil ansehen',
    }),
    defineField({
      name: 'ctaHref',
      title: 'CTA-Link',
      type: 'string',
      description: 'Optional. Leer lassen für /band/[bandSlug]',
    }),
  ],
  preview: {
    select: { title: 'headline', subtitle: 'bandSlug', media: 'image' },
  },
})

export const bandsPageFeaturedSlider = defineType({
  name: 'bandsPageFeaturedSlider',
  title: 'Bands-Seite: Featured-Slider',
  type: 'document',
  fields: [
    defineField({
      name: 'enabled',
      title: 'Slider aktiv',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'slides',
      title: 'Slides',
      type: 'array',
      of: [defineArrayMember({ type: 'featuredSliderSlide' })],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Bands-Seite: Featured-Slider',
        subtitle: 'Redaktioneller Slider für /bands',
      }
    },
  },
})
