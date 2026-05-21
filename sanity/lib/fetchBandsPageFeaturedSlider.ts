import type { FeaturedSliderSlide } from '@/lib/types/featuredSlider'

import { client } from './client'
import {
  bandsPageFeaturedSliderQuery,
  type BandsPageFeaturedSliderQueryResult,
} from './queries'
import { isSanityConfigured } from '../env'

const DEFAULT_CTA_LABEL = 'Profil ansehen'

function normalizeSlide(
  raw: NonNullable<NonNullable<BandsPageFeaturedSliderQueryResult>['slides']>[number]
): FeaturedSliderSlide | null {
  const bandSlug = raw.bandSlug?.trim()
  const headline = raw.headline?.trim()
  const text = raw.text?.trim()

  if (!bandSlug || !headline || !text || !raw.image) {
    return null
  }

  const ctaHref = raw.ctaHref?.trim() || `/band/${bandSlug}`

  return {
    bandSlug,
    headline,
    text,
    image: raw.image,
    imageAlt: raw.imageAlt?.trim() || undefined,
    ctaLabel: raw.ctaLabel?.trim() || DEFAULT_CTA_LABEL,
    ctaHref,
  }
}

export async function fetchBandsPageFeaturedSlider(): Promise<
  FeaturedSliderSlide[] | null
> {
  if (!isSanityConfigured || !client) {
    return null
  }

  try {
    const doc = await client.fetch<BandsPageFeaturedSliderQueryResult>(
      bandsPageFeaturedSliderQuery,
      {},
      { next: { revalidate: 300 } }
    )

    if (!doc?.enabled || !doc.slides?.length) {
      return null
    }

    const slides = doc.slides
      .map(normalizeSlide)
      .filter((slide): slide is FeaturedSliderSlide => slide !== null)

    return slides.length > 0 ? slides : null
  } catch {
    return null
  }
}
