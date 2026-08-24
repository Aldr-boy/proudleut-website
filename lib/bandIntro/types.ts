export type BandIntroSubmissionPayload = {
  idempotencyKey: string;
  bandName: string;
  region: string;
  websiteUrl: string;
  additionalLinks: string[];
  description: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  phone: string;
  datenschutz: boolean;
  firmaHidden: string;
  websiteHidden: string;
  openedAt: number;
};

export type NormalizedBandIntroInput = {
  idempotencyKey: string;
  bandName: string;
  region: string;
  websiteUrl: string | null;
  additionalLinks: string[];
  description: string;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
};

export type ParseFailureReason = 'bot' | 'validation';

export type ParseResult =
  | { ok: true; data: NormalizedBandIntroInput }
  | { ok: false; reason: 'bot' }
  | { ok: false; reason: 'validation'; message: string };

export type MailSendOutcome =
  | { status: 'gesendet'; messageId: string }
  | { status: 'fehlgeschlagen'; errorMessage: string }
  | { status: 'ungeklaert'; errorMessage: string };

export type SubmitBandIntroResult =
  | { kind: 'accepted'; id: string; confirmationMailSent: boolean }
  | { kind: 'bot_silent' }
  | { kind: 'validation_error'; message: string }
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  | { kind: 'temporarily_unavailable' }
  | { kind: 'server_error' };
