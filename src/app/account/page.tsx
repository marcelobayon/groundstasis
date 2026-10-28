import type { Metadata } from "next";
import { verifyAccountToken } from "@/lib/account/session";
import { getSiteRepository } from "@/lib/db/repository";
import { apiStoreAvailable, listApiKeys } from "@/lib/api/store";
import { SignInForm } from "@/components/account/SignInForm";
import { PortfolioView } from "@/components/account/PortfolioView";
import { ApiKeysSection } from "@/components/account/ApiKeysSection";
import { WebhooksSection } from "@/components/account/WebhooksSection";
import { webhookStoreAvailable, listWebhookEndpoints } from "@/lib/api/webhooks/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

// The single authenticated account area. A valid `account`-scoped magic-link
// token (sub = userId) renders the portfolio + API keys; anything else shows the
// sign-in form. Per-site workspace links (/site, /s) are unaffected.
export default async function AccountPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : undefined;
  const userId = verifyAccountToken(token);
  const repo = getSiteRepository();

  let content: React.ReactNode;
  if (!userId) {
    content = <SignInForm />;
  } else if (!repo) {
    content = <p className="muted">Accounts aren&rsquo;t available in this environment yet.</p>;
  } else {
    const sites = await repo.getSitesForUser(userId);
    const keys = apiStoreAvailable()
      ? (await listApiKeys(userId))
          .filter((k) => !k.revokedAt)
          .map((k) => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            scopes: k.scopes,
            lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
            createdAt: k.createdAt ? k.createdAt.toISOString() : null,
          }))
      : [];
    // Webhook endpoints — wrapped so the account page stays up even if the
    // webhook tables aren't migrated yet (delegate/table may be absent).
    let webhooks: Array<{
      id: string;
      url: string;
      events: string[];
      active: boolean;
      description: string | null;
      createdAt: string | null;
    }> = [];
    if (webhookStoreAvailable()) {
      try {
        webhooks = (await listWebhookEndpoints(userId)).map((w) => ({
          id: w.id,
          url: w.url,
          events: w.events,
          active: w.active,
          description: w.description,
          createdAt: w.createdAt ? w.createdAt.toISOString() : null,
        }));
      } catch {
        webhooks = [];
      }
    }
    content = (
      <>
        <PortfolioView sites={sites} token={token as string} />
        <ApiKeysSection token={token as string} initialKeys={keys} />
        <WebhooksSection token={token as string} initialEndpoints={webhooks} />
      </>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 920 }}>
        {content}
      </div>
    </section>
  );
}
