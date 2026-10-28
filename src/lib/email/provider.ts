export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  tags?: Record<string, string>;
}

export interface SendResult {
  id: string;
  delivered: boolean;
  provider: string;
}

/** The seam between Ground Stasis and any transactional email vendor. */
export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(msg: EmailMessage): Promise<SendResult>;
}
