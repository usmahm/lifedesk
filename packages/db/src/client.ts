import { PrismaNeon } from "@prisma/adapter-neon";

import "./env";

import { PrismaClient } from "./generated/client";

/**
 * The Prisma client, over Neon's serverless driver.
 *
 * Prisma 7 makes driver adapters mandatory — there is no built-in engine to
 * fall back to. `DATABASE_URL` must be Neon's *pooled* endpoint; migrations use
 * `DIRECT_URL` instead, because the pooler cannot run DDL.
 *
 * Cached on `globalThis` in development: Next re-evaluates modules on every
 * change, and without this each edit opens another pool until Neon refuses new
 * connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection strings.",
    );
  }

  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

function resolve(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) return existing;

  const created = createClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = created;
  return created;
}

/**
 * Constructed on first use, not on import.
 *
 * This matters beyond tidiness: `packages/api`'s repository factory imports
 * both implementations so it can choose between them at runtime. Building the
 * client eagerly would throw while that module was still loading, so the
 * memory fallback could never be reached — the escape hatch would be dead code
 * and a checkout with no `.env` would crash instead of degrading.
 *
 * Methods are bound to the real client so `this` survives the indirection;
 * `$transaction` and friends break without it.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = resolve();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
