import type { EmailProvider, EmailMessage, SendResult } from "./provider";

/**
 * Logs emails to the server console instead of sending them. The default in
 * development and whenever no vendor is configured — so alerts are visible
 * end-to-end without any credentials.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  isConfigured(): boolean {
    return true;
  }
  async send(msg: EmailMessage): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.log(
      `\n──── EMAIL (console) ────\nTo: ${msg.to}\nFrom: ${msg.from}\nSubject: ${msg.subject}\n\n${msg.text}\n─────────────────────────\n`
    );
    return { id: `console-${Date.now()}`, delivered: true, provider: this.name };
  }
}
