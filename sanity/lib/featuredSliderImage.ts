import type { SanityImageSource } from '@sanity/image-url'

import { urlFor } from './image'

export function featuredSliderImageUrl(
  source: SanityImageSource,
  width: number,
  height: number
): string {
  return urlFor(source)
    .width(width)
    .height(height)
    .fit('crop')
    .auto('format')
    .quality(80)
    .url()
}
