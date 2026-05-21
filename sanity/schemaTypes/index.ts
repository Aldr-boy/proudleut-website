import { type SchemaTypeDefinition } from 'sanity'

import {
  bandsPageFeaturedSlider,
  featuredSliderSlide,
} from './bandsPageFeaturedSlider'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [featuredSliderSlide, bandsPageFeaturedSlider],
}
