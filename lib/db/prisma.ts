/**
 * BiteBuddy 2.0 — Production Prisma Client Singleton
 * 
 * Configured for serverless connection pooling (Neon, Supabase, AWS RDS).
 * Prevents multiple instances during development hot-reloading.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
