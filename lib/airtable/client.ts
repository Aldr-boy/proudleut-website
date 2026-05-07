export type AirtableListResponse<T = Record<string, unknown>> = {
  records: Array<{
    id: string;
    createdTime: string;
    fields: T;
  }>;
  offset?: string;
};

export async function airtableFetch(
  tableName: string,
  params?: Record<string, string>
): Promise<unknown> {
  const token = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token) throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN is not configured');
  if (!baseId) throw new Error('AIRTABLE_BASE_ID is not configured');

  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Airtable API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
