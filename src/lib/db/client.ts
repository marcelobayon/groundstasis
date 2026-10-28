import { PrismaClient } from "@prisma/client";

// Lazily-constructed Prisma singleton. Constructed only when first used, so the
// app still boots in demo mode (no DATABASE_URL) without instantiating a client.
// In dev, reuse across HMR reloads to avoid exhausting connections.

let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (client) return client;
  const g = globalThis as unknown as { __gsPrisma?: PrismaClient };
  client = g.__gsPrisma ?? new PrismaClient({ log: ["warn", "error"] });
  if (process.env.NODE_ENV !== "production") g.__gsPrisma = client;
  return client;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
