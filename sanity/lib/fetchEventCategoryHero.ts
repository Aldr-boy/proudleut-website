import type { SanityImageSource } from '@sanity/image-url'

import { isSanityConfigured } from '../env'
import { client } from './client'
import { eventCategoryHeroQuery, type EventCategoryHeroQueryResult } from './queries'

export type EventCategoryHeroData = {
  heroImage: SanityImageSource
  heroImageAlt?: string
  subtitle?: string
}

export async function fetchEventCategoryHero(
  slug: string
): Promise<EventCategoryHeroData | null> {
  if (!isSanityConfigured || !client) return null

  try {
    const doc = await client.fetch<EventCategoryHeroQueryResult>(
      eventCategoryHeroQuery,
      { slug },
      { next: { revalidate: 300 } }
    )
    if (!doc?.heroImage) return null
    return {
      heroImage: doc.heroImage,
      heroImageAlt: doc.heroImageAlt?.trim() || undefined,
      subtitle: doc.subtitle?.trim() || undefined,
    }
  } catch {
    return null
  }
}
