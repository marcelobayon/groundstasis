import type { EmailProvider } from "./provider";
import { ConsoleEmailProvider } from "./console-provider";
import { ResendEmailProvider } from "./resend-provider";

export * from "./provider";
export * from "./templates";
export { ConsoleEmailProvider } from "./console-provider";
export { ResendEmailProvider } from "./resend-provider";

/**
 * Select the email provider from EMAIL_PROVIDER. Defaults to the console
 * provider so alerts are visible without any vendor configured. "resend" is
 * wired; "postmark"/"sendgrid" are reserved and fall back to console with a
 * warning until implemented.
 */
export function getEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  const choice = (env.EMAIL_PROVIDER ?? "console").toLowerCase();
  switch (choice) {
    case "resend": {
      const p = new ResendEmailProvider(env.EMAIL_API_KEY ?? "");
      if (p.isConfigured()) return p;
      // eslint-disable-next-line no-console
      console.warn("[ground-stasis] EMAIL_PROVIDER=resend but EMAIL_API_KEY missing; using console.");
      return new ConsoleEmailProvider();
    }
    case "postmark":
    case "sendgrid":
      // eslint-disable-next-line no-console
      console.warn(`[ground-stasis] EMAIL_PROVIDER=${choice} not implemented yet; using console.`);
      return new ConsoleEmailProvider();
    case "console":
    default:
      return new ConsoleEmailProvider();
  }
}

export function getEmailFrom(env: NodeJS.ProcessEnv = process.env): string {
  return env.EMAIL_FROM ?? "alerts@groundstasis.com";
}
