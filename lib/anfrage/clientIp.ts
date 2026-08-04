// Ermittelt die Client-IP aus Proxy-Headern (Vercel setzt x-forwarded-for).
// Reine Funktion (kein I/O), damit sie ohne echten Request testbar ist.
export function extractClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  return 'unknown';
}
