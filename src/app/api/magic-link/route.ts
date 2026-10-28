import { NextResponse } from "next/server";
import { createMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets, getMagicLinkTtlMinutes } from "@/lib/env";
import { getEmailProvider, getEmailFrom, renderMagicLink } from "@/lib/email";
import { getSiteRepository } from "@/lib/db/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Account sign-in: email a passwordless link to the account dashboard (/account).
// The link is `account`-scoped with the user id as subject. We mint it only for
// an EXISTING account and always respond identically, so the endpoint never
// reveals whether an email has an account. Per-site magic links (alerts, CDI
// workspace) are minted elsewhere and are unaffected by this route.
//
// Rate limiting should wrap this route at the edge/middleware in production.
export async function POST(request: Request) {
  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required" }, { status: 400 });
  }

  const secrets = getMagicLinkSecrets();
  const repo = getSiteRepository();

  if (secrets.length > 0 && repo) {
    try {
      const user = await repo.findUserByEmail(email);
      if (user) {
        const token = createMagicLinkToken(user.id, secrets[0], {
          ttlMinutes: getMagicLinkTtlMinutes(),
          scope: "account",
        });
        const appUrl = process.env.APP_URL ?? "https://groundstasis.com";
        const viewUrl = `${appUrl}/account?token=${encodeURIComponent(token)}`;
        const rendered = renderMagicLink(undefined, viewUrl);
        await getEmailProvider().send({
          to: email,
          from: getEmailFrom(),
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
      }
    } catch {
      // Never surface internal errors to the caller (no enumeration signal).
    }
  }

  // Always the same response, whether or not the account exists.
  return NextResponse.json({
    ok: true,
    message: "If that email has a Ground Stasis account, a sign-in link is on its way.",
  });
}
