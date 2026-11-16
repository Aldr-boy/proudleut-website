import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { buildBandDocumentFilename } from '@/lib/bandDocuments/downloadFilename';

// Liefert ein oeffentliches Banddokument (PDF) unter einem lesbaren
// Dateinamen aus: Die Storage-URL traegt nur eine technische ID
// ("document-<uuid>.pdf"), die Browser sonst als Dateinamen uebernehmen.
// Die Datei wird inline ausgeliefert (Ansicht im Browser bleibt erhalten),
// nur der Name kommt aus Content-Disposition. Rein lesend.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('band_documents')
    .select('title, file_url, bands ( name )')
    .eq('id', id)
    .maybeSingle();
  if (error || !data?.file_url) return new NextResponse('Nicht gefunden', { status: 404 });

  const upstream = await fetch(data.file_url);
  if (!upstream.ok || !upstream.body) return new NextResponse('Nicht gefunden', { status: 404 });

  const band = Array.isArray(data.bands) ? data.bands[0] : data.bands;
  const filename = buildBandDocumentFilename(band?.name ?? '', data.title ?? '');

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
