import type { EmailProvider, EmailMessage, SendResult } from "./provider";

/**
 * Resend implementation (https://resend.com) — a thin fetch wrapper, no SDK.
 * Chosen as the first real vendor because its API is a single POST. Postmark /
 * SendGrid can be added the same way behind this interface.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  constructor(private readonly apiKey: string) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async send(msg: EmailMessage): Promise<SendResult> {
    if (!this.isConfigured()) throw new Error("ResendEmailProvider: EMAIL_API_KEY is missing");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      throw new Error(`Resend send failed: ${res.status} ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as { id?: string };
    return { id: json.id ?? "unknown", delivered: true, provider: this.name };
  }
}
