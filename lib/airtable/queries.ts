import { airtableFetch } from './client';
import type { AirtableListResponse } from './client';
import { normalizeBand } from './normalizeBand';
import type { RawAirtableBandRecord } from './normalizeBand';
import type { Band } from '../types/band';

const TABLE = process.env.AIRTABLE_BANDS_TABLE_NAME ?? 'Bands';

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-_]+$/i.test(slug);
}

export async function getBandBySlug(slug: string): Promise<Band | null> {
  if (!isValidSlug(slug)) return null;

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

  return normalizeBand(record);
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
