import { createHmac } from 'node:crypto';

// IP wird ausschliesslich serverseitig mit einem Secret gehasht -- roh
// wird sie nie gespeichert, ein vom Client mitgelieferter Hash wird nie
// uebernommen (Produktentscheidungen 17/18). Reine Funktion (kein
// DB-/Cookie-Zugriff), deshalb bewusst in einer eigenen, ohne
// Next.js-Request-Kontext testbaren Datei statt in rateLimit.ts.
export function hashClientIp(ip: string): string {
  const salt = process.env.ANFRAGE_RATE_LIMIT_SALT;
  if (!salt) {
    throw new Error('ANFRAGE_RATE_LIMIT_SALT ist nicht gesetzt');
  }
  return createHmac('sha256', salt).update(ip).digest('hex');
}
