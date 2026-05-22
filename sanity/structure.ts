import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Redaktion')
    .items([
      S.listItem()
        .title('Bands-Seite: Featured-Slider')
        .child(
          S.document()
            .schemaType('bandsPageFeaturedSlider')
            .documentId('bandsPageFeaturedSlider')
        ),
      S.listItem()
        .title('Kategorie-Heroes')
        .child(
          S.documentTypeList('eventCategoryHero').title('Kategorie-Heroes')
        ),
    ])
