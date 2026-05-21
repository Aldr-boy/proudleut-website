import type { SanityImageSource } from '@sanity/image-url'

export const bandsPageFeaturedSliderQuery = `*[_type == "bandsPageFeaturedSlider" && _id == "bandsPageFeaturedSlider"][0]{
  enabled,
  slides[]{
    bandSlug,
    headline,
    text,
    image,
    imageAlt,
    ctaLabel,
    ctaHref
  }
}`

export type BandsPageFeaturedSliderQueryResult = {
  enabled?: boolean
  slides?: Array<{
    bandSlug?: string
    headline?: string
    text?: string
    image?: SanityImageSource
    imageAlt?: string
    ctaLabel?: string
    ctaHref?: string
  }>
} | null
