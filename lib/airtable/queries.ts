import { airtableFetch } from './client';
import type { AirtableListResponse } from './client';
import { normalizeBand } from './normalizeBand';
import type { RawAirtableBandRecord, EventTypeEntry } from './normalizeBand';
import type { Band } from '../types/band';

const TABLE = process.env.AIRTABLE_BANDS_TABLE_NAME ?? 'Bands';
const VERANSTALTUNGEN_TABLE = 'Veranstaltungen';

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-_]+$/i.test(slug);
}

async function getEventTypeMap(): Promise<Map<string, EventTypeEntry>> {
  const map = new Map<string, EventTypeEntry>();
  let offset: string | undefined;

  do {
    // Kein fields[]-Filter: airtableFetch unterstützt keine wiederholten Keys.
    // Alle Felder laden und nur event_canon + Slug auswerten.
    const params: Record<string, string> = {};
    if (offset) params['offset'] = offset;

    const data = (await airtableFetch(VERANSTALTUNGEN_TABLE, params)) as AirtableListResponse<{
      event_canon?: string;
      Slug?: string;
    }>;

    for (const record of data.records) {
      const displayName = record.fields['event_canon']?.trim();
      const slug = record.fields['Slug']?.trim();
      if (displayName && slug) {
        map.set(record.id, { displayName, slug });
      }
    }

    offset = data.offset;
  } while (offset);

  return map;
}

export async function getBandBySlug(slug: string): Promise<Band | null> {
  if (!isValidSlug(slug)) return null;

  const eventTypeMap = await getEventTypeMap();

  const formula = `AND({Slug}='${slug}',{Webflow Status}='Active')`;
  const data = (await airtableFetch(TABLE, {
    filterByFormula: formula,
  })) as AirtableListResponse<RawAirtableBandRecord['fields']>;

  if (!data.records.length) return null;

  const record: RawAirtableBandRecord = {
    id: data.records[0].id,
    createdTime: data.records[0].createdTime,
    fields: data.records[0].fields,
  };

  return normalizeBand(record, eventTypeMap);
}

export async function getBands(): Promise<Band[]> {
  const eventTypeMap = await getEventTypeMap();
  const bands: Band[] = [];
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      filterByFormula: `{Webflow Status}='Active'`,
      'sort[0][field]': 'Bandname',
      'sort[0][direction]': 'asc',
    };
    if (offset) params['offset'] = offset;

    const data = (await airtableFetch(TABLE, params)) as AirtableListResponse<
      RawAirtableBandRecord['fields']
    >;

    for (const record of data.records) {
      bands.push(
        normalizeBand(
          { id: record.id, createdTime: record.createdTime, fields: record.fields },
          eventTypeMap
        )
      );
    }

    offset = data.offset;
  } while (offset);

  return bands;
}

export async function getBandsByCategory(categorySlug: string): Promise<Band[]> {
  const allBands = await getBands();
  return allBands.filter((band) => band.categorySlugs?.includes(categorySlug) ?? false);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const allBands = await getBands();
  const seen = new Set<string>();
  for (const band of allBands) {
    for (const slug of band.categorySlugs ?? []) {
      seen.add(slug);
    }
  }
  return Array.from(seen).sort();
}

export async function getAllActiveBandSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      filterByFormula: `{Webflow Status}='Active'`,
      'fields[]': 'Slug',
    };
    if (offset) params['offset'] = offset;

    const data = (await airtableFetch(TABLE, params)) as AirtableListResponse<{
      Slug?: string;
    }>;

    for (const record of data.records) {
      const slug = record.fields['Slug'];
      if (typeof slug === 'string' && slug.length > 0) {
        slugs.push(slug);
      }
    }

    offset = data.offset;
  } while (offset);

  return slugs;
}
