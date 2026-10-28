import { verifyMagicLinkToken } from "@/lib/auth/magic-link";
import { getMagicLinkSecrets } from "@/lib/env";

// Account-level session: resolve the userId from an `account`-scoped magic-link
// token. Shared by the /account page and the account API routes. Per-site
// tokens (site:read / site:workspace) are deliberately NOT accepted here.
export function verifyAccountToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const r = verifyMagicLinkToken(decodeURIComponent(token), getMagicLinkSecrets());
  return r.valid && r.payload.scope === "account" ? r.payload.sub : null;
}
