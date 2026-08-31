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

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
