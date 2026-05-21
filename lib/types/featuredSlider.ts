import type { SanityImageSource } from '@sanity/image-url'

export type FeaturedSliderSlide = {
  bandSlug: string
  headline: string
  text: string
  image: SanityImageSource
  imageAlt?: string
  ctaLabel: string
  ctaHref: string
}
