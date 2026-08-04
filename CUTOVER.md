# CUTOVER.md — L-A1 natives Anfragesystem

Dieses Dokument enthält ausschließlich die **noch nicht ausgeführten**
Schritte, die vor und während der Umstellung vom alten Weg
(Webflow → Make → Airtable → Gmail) auf den neuen nativen Weg
(Next.js → Supabase → Resend → Admin-Nachweis) nötig sind.

Keiner dieser Schritte wurde im Rahmen der L-A1-Implementierung ausgeführt.
Make, Webflow und Airtable sind unverändert und laufen bis zur ausdrücklichen
Freigabe unten unangetastet weiter.

---

## 1. Ausdrückliche Freigabe durch Xandi

Diese Cutover-Schritte erst nach explizitem Go von Xandi beginnen.

## 2. Kontaktvollständigkeit verifizieren

- Beim Preflight fiel eine aktive Band ohne `band_contacts`-Zeile in
  Supabase auf: **Gaudinockerl** (Slug `gaudinockerl`).
- Verifikation im Rahmen dieses Auftrags (read-only):
  - Supabase enthält für diese Band tatsächlich keine `band_contacts`-Zeile,
    keinen anderweitig zugeordneten Kontakt und kein E-Mail-Feld in
    `band_profiles`.
  - Der zugehörige Airtable-Banddatensatz (Feld „Ansprechpartner - E-Mail")
    ist **befüllt** — es handelt sich also um eine reale
    Datenübertragungslücke zwischen Airtable und Supabase, nicht um eine
    generell fehlende Kontaktadresse.
  - Die Mailadresse selbst wurde an keiner Stelle ausgegeben oder
    gespeichert.
- **Owner-Schritt:** fehlenden primären Anfragekontakt für Gaudinockerl
  kontrolliert im Band-Admin nachtragen (`/admin/bands/{id}` → Kontakt
  anlegen, `is_primary_inquiry` setzen — die dort bereits bestehende
  Aktion `createContactAction` reicht dafür aus, kein Sonderweg nötig).
- Danach folgende read-only Vollständigkeitsprüfung erneut ausführen
  (liefert `0`, wenn erledigt):

  ```sql
  select b.id, b.name, b.slug
  from public.bands b
  left join public.band_contacts bc
    on bc.band_id = b.id and bc.is_primary_inquiry = true and bc.email is not null
  where b.status = 'active' and bc.id is null;
  ```

- Diese Prüfung vor dem Production-Smoke-Test (Schritt 8) mit **0 Zeilen**
  bestehen lassen — sonst kann genau diese eine Band nicht sicher angefragt
  werden.

## 3. Production-Migration kontrolliert ausführen

Im Supabase SQL Editor, in dieser Reihenfolge:

1. `supabase/anfragesystem_native_migration.sql`
2. `supabase/fn_create_anfrage_with_bands.sql`
3. `supabase/fn_create_band_with_primary_contact.sql`

Alle drei sind idempotent im Sinne von „einmalig auszuführen, noch nicht
ausgeführt" — keine der Dateien wurde bisher gegen Production ausgeführt.

## 4. Migration verifizieren

- `select count(*) from public.anfragen;` → `0`
- `select count(*) from public.anfrage_bands;` → `0`
- RLS aktiv, kein `anon`/`authenticated`-Zugriff (z. B. mit dem
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` gegen `anfragen` lesen versuchen — muss
  leer/verweigert zurückkommen).
- `select proname from pg_proc where proname in ('create_anfrage_with_bands','create_band_with_primary_contact','check_and_consume_anfrage_rate_limit');`
  → alle drei vorhanden.

## 5. Resend-Env-Variablen in Vercel setzen

- `RESEND_API_KEY`
- `ANFRAGE_RATE_LIMIT_SALT` (langer, zufälliger Wert — nur zum Hashen der
  Rate-Limit-IP, kein Bezug zu bestehenden Secrets)
- Domain `proudleut.com` ist laut Owner-Information bei Resend bereits
  verifiziert — vor dem ersten echten Versand im Resend-Dashboard trotzdem
  gegenprüfen.

## 6. Deployment

Branch nach Review und Freigabe nach `main` mergen, Vercel deployt.

## 7. Testversand an kontrollierte eigene Empfänger

Vor jedem echten Bandkontakt: 1–2 Testanfragen mit eigenen
E-Mail-Adressen/offiziellen Resend-Testadressen senden. **Keine echte
Bandadresse als Ersatz-Testempfänger verwenden.**

## 8. Production-Smoke mit einer bewusst gewählten Band

Eine einzelne, bewusst ausgewählte, aktive Band mit vollständigem Kontakt
(nicht Gaudinockerl, außer Schritt 2 wurde für sie bereits erledigt) für
einen echten Anfragedurchlauf verwenden.

## 9. Prüfen

- DB-Eintrag in `anfragen`/`anfrage_bands` vollständig
- Band-Mail korrekt zugestellt
- `Reply-To` zeigt auf die Veranstalter-Adresse
- Veranstalter-Bestätigung korrekt zugestellt
- Admin-Protokoll (`/admin/anfragen/{id}`) zeigt alles korrekt an
- Resend-Message-IDs vorhanden
- Provider-Idempotency-Keys wie erwartet (`inquiry/{anfrage_id}/band/{anfrage_band_id}/v1` bzw. `.../confirmation/v1`)
- keine Doppelzustellung

## 10. Erst nach erfolgreichem Smoke den öffentlichen Weg freigeben

D. h. real mit Nutzern über das Frontend anfragen lassen.

## 11. Kein Dual-Send

Sicherstellen, dass zu keinem Zeitpunkt sowohl der alte Make-Webhook-Pfad
als auch der neue native Pfad gleichzeitig scharf sind. Der native Pfad in
`app/api/anfrage/route.ts` ruft `MAKE_ANFRAGE_WEBHOOK_URL` bereits seit
dieser Umsetzung nicht mehr auf — das alte Make-Szenario war laut Auftrag
ohnehin nie mit diesem Next.js-Formular verbunden. Vor der öffentlichen
Freigabe trotzdem einmal explizit bestätigen, dass kein anderer,
unbekannter Aufrufer denselben Make-Webhook parallel bedient.

## 12. Webflow-/Make-Altweg anschließend deaktivieren

Erst nachdem Schritt 8–10 erfolgreich bestätigt sind.

## 13. Make zunächst deaktiviert lassen, nicht löschen

Für eine kurze Beobachtungsphase.

## 14. Airtable als Altarchiv behalten

Die 182 historischen Anfragezeilen bleiben unangetastet und lesbar, werden
nicht migriert (Produktentscheidung 20).

## 15. Nach Beobachtungsfrist

- `MAKE_ANFRAGE_WEBHOOK_URL` aus Vercel entfernen
- Hinweis: `app/api/anfrage/route.ts` ruft diese Variable nach dieser
  Umsetzung bereits nicht mehr auf — der eigentliche Cleanup-Schritt ist
  hier nur noch das Entfernen der ungenutzten Vercel-Env-Variable selbst
- Altweg dokumentiert stilllegen (Make-Szenario, Webflow-Formular-Ziel)

---

## Zusätzlicher Owner-Hinweis (außerhalb der Auftrags-Checkliste, aber
sicherheitsrelevant für die neuen Mail-Templates)

Die neuen Band- und Bestätigungs-Mails verlinken auf
`https://proudleut.com/datenschutz` und `https://proudleut.com/impressum`
(gleiches Muster wie das bestehende `AnfrageModal`/`KontaktFormular`, siehe
`lib/anfrage/constants.ts`). Im Rahmen dieses Preflights wurde festgestellt,
dass **beide Seiten aktuell nicht existieren** (kein `app/datenschutz`, kein
`app/impressum`; der Impressum-Link im Footer ist derzeit ein Platzhalter
`href="#"`). Das ist ein bereits vor L-A1 bestehender Zustand, keine neue
Regression — aber vor dem öffentlichen Cutover sollten beide Seiten real
erreichbar sein, sonst verweisen alle neuen Transaktionsmails auf 404-Seiten.
Kein Bestandteil dieses Auftrags (Legal-Content-Erstellung), wird hier nur
als notwendiger Vorprüfpunkt festgehalten.
