// Webhook persistence: endpoints + the delivery outbox. Same hand-typed-delegate
// pattern as src/lib/api/store.ts — WebhookEndpoint/WebhookDelivery reach the
// generated client only after `prisma generate`, so we cast precisely and this
// file typechecks without a regenerated client.

import type { PrismaClient } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/db/client";

export interface WebhookEndpointRow {
  id: string;
  userId: string;
  url: string;
  secretCipher: string;
  events: string[];
  active: boolean;
  description: string | null;
  createdAt: Date;
  disabledAt: Date | null;
}

interface WebhookEndpointCreateData {
  userId: string;
  url: string;
  secretCipher: string;
  events: string[];
  description?: string | null;
}

interface WebhookEndpointDelegate {
  create(args: { data: WebhookEndpointCreateData }): Promise<WebhookEndpointRow>;
  findUnique(args: { where: { id: string } }): Promise<WebhookEndpointRow | null>;
  findMany(args: {
    where: { userId: string; active?: boolean };
    orderBy?: { createdAt: "desc" };
  }): Promise<WebhookEndpointRow[]>;
  update(args: { where: { id: string }; data: { active?: boolean; disabledAt?: Date } }): Promise<WebhookEndpointRow>;
}

function endpoints(db: PrismaClient): WebhookEndpointDelegate {
  return (db as unknown as { webhookEndpoint: WebhookEndpointDelegate }).webhookEndpoint;
}

// --- delivery outbox -------------------------------------------------------

export interface DueDelivery {
  id: string;
  event: string;
  payload: unknown;
  attempts: number;
  endpoint: { id: string; url: string; secretCipher: string; active: boolean } | null;
}

interface WebhookDeliveryDelegate {
  create(args: {
    data: { endpointId: string; event: string; payload: unknown; nextAttemptAt?: Date };
  }): Promise<{ id: string }>;
  findMany(args: {
    where: { status: string; nextAttemptAt: { lte: Date } };
    orderBy?: { nextAttemptAt: "asc" };
    take?: number;
    select: {
      id: true;
      event: true;
      payload: true;
      attempts: true;
      endpoint: { select: { id: true; url: true; secretCipher: true; active: true } };
    };
  }): Promise<DueDelivery[]>;
  update(args: {
    where: { id: string };
    data: {
      status?: string;
      attempts?: number;
      lastAttemptAt?: Date;
      nextAttemptAt?: Date;
      responseStatus?: number | null;
    };
  }): Promise<{ id: string }>;
}

function deliveries(db: PrismaClient): WebhookDeliveryDelegate {
  return (db as unknown as { webhookDelivery: WebhookDeliveryDelegate }).webhookDelivery;
}

export function webhookStoreAvailable(): boolean {
  return isDatabaseConfigured();
}

// --- endpoints -------------------------------------------------------------

export async function createWebhookEndpoint(input: WebhookEndpointCreateData): Promise<WebhookEndpointRow> {
  return endpoints(getPrisma()).create({ data: input });
}

export async function listWebhookEndpoints(userId: string): Promise<WebhookEndpointRow[]> {
  return endpoints(getPrisma()).findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

/** One endpoint, but only if it belongs to the caller. */
export async function getWebhookEndpoint(userId: string, id: string): Promise<WebhookEndpointRow | null> {
  const row = await endpoints(getPrisma()).findUnique({ where: { id } });
  return row && row.userId === userId ? row : null;
}

/** Active endpoints for a user subscribed to a given event. */
export async function listActiveEndpointsForEvent(userId: string, event: string): Promise<WebhookEndpointRow[]> {
  const rows = await endpoints(getPrisma()).findMany({ where: { userId, active: true } });
  return rows.filter((r) => r.events.includes(event));
}

/** All active endpoints for a user (emission filters by event in memory). */
export async function listActiveEndpoints(userId: string): Promise<WebhookEndpointRow[]> {
  return endpoints(getPrisma()).findMany({ where: { userId, active: true } });
}

/** Disable an endpoint, but only if it belongs to the caller (tenant isolation). */
export async function disableWebhookEndpoint(userId: string, id: string): Promise<boolean> {
  const db = getPrisma();
  const existing = await endpoints(db).findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await endpoints(db).update({ where: { id }, data: { active: false, disabledAt: new Date() } });
  return true;
}

// --- deliveries ------------------------------------------------------------

export async function enqueueDelivery(input: {
  endpointId: string;
  event: string;
  payload: unknown;
  nextAttemptAt?: Date;
}): Promise<void> {
  await deliveries(getPrisma()).create({ data: input });
}

/** Claim deliveries that are due (pending + nextAttemptAt in the past). */
export async function claimDueDeliveries(limit: number, now: Date): Promise<DueDelivery[]> {
  return deliveries(getPrisma()).findMany({
    where: { status: "pending", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: {
      id: true,
      event: true,
      payload: true,
      attempts: true,
      endpoint: { select: { id: true, url: true, secretCipher: true, active: true } },
    },
  });
}

export async function markDelivery(
  id: string,
  d: { status: string; attempts: number; responseStatus: number | null; nextAttemptAt?: Date; now: Date },
): Promise<void> {
  await deliveries(getPrisma()).update({
    where: { id },
    data: {
      status: d.status,
      attempts: d.attempts,
      lastAttemptAt: d.now,
      responseStatus: d.responseStatus,
      ...(d.nextAttemptAt ? { nextAttemptAt: d.nextAttemptAt } : {}),
    },
  });
}
