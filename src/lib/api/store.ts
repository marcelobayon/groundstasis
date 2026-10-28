// API v1 persistence for ApiKey + UsageRecord.
//
// Same hand-typed-delegate pattern as repository.ts (siteChecks/siteMilestones):
// the generated Prisma client gains `apiKey`/`usageRecord` once `prisma generate`
// runs in the Netlify build (which has engine egress); here we reach them through
// precise casts so writes are field-checked and this file typechecks without a
// regenerated client. No business logic lives in HTTP handlers.

import type { PrismaClient } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/db/client";

export interface ApiKeyRow {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  hashedKey: string;
  scopes: string[];
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}
interface ApiKeyCreateData {
  userId: string;
  name: string;
  prefix: string;
  hashedKey: string;
  scopes: string[];
}
interface ApiKeyDelegate {
  create(args: { data: ApiKeyCreateData }): Promise<ApiKeyRow>;
  findUnique(args: { where: { hashedKey?: string; id?: string } }): Promise<ApiKeyRow | null>;
  findMany(args: { where: { userId: string }; orderBy?: { createdAt: "desc" } }): Promise<ApiKeyRow[]>;
  update(args: { where: { id: string }; data: { lastUsedAt?: Date; revokedAt?: Date } }): Promise<ApiKeyRow>;
}
function apiKeys(db: PrismaClient): ApiKeyDelegate {
  return (db as unknown as { apiKey: ApiKeyDelegate }).apiKey;
}

export interface UsageRecordCreateData {
  userId: string;
  apiKeyId?: string | null;
  operation: string;
  idempotencyKey?: string | null;
  outcome: string;
  billableUnits?: number;
  priceVersion?: string | null;
  route?: string | null;
  status?: number | null;
}
interface UsageRecordDelegate {
  create(args: { data: UsageRecordCreateData }): Promise<{ id: string }>;
  count(args: { where: { apiKeyId?: string; userId?: string; createdAt?: { gte: Date } } }): Promise<number>;
}
function usageRecords(db: PrismaClient): UsageRecordDelegate {
  return (db as unknown as { usageRecord: UsageRecordDelegate }).usageRecord;
}

/** The API needs a database; mirrors getSiteRepository()'s guard. */
export function apiStoreAvailable(): boolean {
  return isDatabaseConfigured();
}

// --- API keys --------------------------------------------------------------

export async function createApiKey(input: {
  userId: string;
  name: string;
  prefix: string;
  hashedKey: string;
  scopes: string[];
}): Promise<ApiKeyRow> {
  return apiKeys(getPrisma()).create({ data: input });
}

export async function findApiKeyByHash(hashedKey: string): Promise<ApiKeyRow | null> {
  return apiKeys(getPrisma()).findUnique({ where: { hashedKey } });
}

export async function touchApiKeyLastUsed(id: string): Promise<void> {
  await apiKeys(getPrisma()).update({ where: { id }, data: { lastUsedAt: new Date() } });
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  return apiKeys(getPrisma()).findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

/** Revoke a key, but only if it belongs to the caller (tenant isolation). */
export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const db = getPrisma();
  const existing = await apiKeys(db).findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await apiKeys(db).update({ where: { id }, data: { revokedAt: new Date() } });
  return true;
}

// --- Usage ledger ----------------------------------------------------------

export async function recordUsage(data: UsageRecordCreateData): Promise<void> {
  await usageRecords(getPrisma()).create({ data });
}

export async function countUsageSince(apiKeyId: string, since: Date): Promise<number> {
  return usageRecords(getPrisma()).count({ where: { apiKeyId, createdAt: { gte: since } } });
}

export async function usageTotalSince(userId: string, since: Date): Promise<number> {
  return usageRecords(getPrisma()).count({ where: { userId, createdAt: { gte: since } } });
}
