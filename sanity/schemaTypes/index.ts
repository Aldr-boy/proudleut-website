import { type SchemaTypeDefinition } from 'sanity'

import {
  bandsPageFeaturedSlider,
  featuredSliderSlide,
} from './bandsPageFeaturedSlider'
import { eventCategoryHero } from './eventCategoryHero'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [featuredSliderSlide, bandsPageFeaturedSlider, eventCategoryHero],
}
