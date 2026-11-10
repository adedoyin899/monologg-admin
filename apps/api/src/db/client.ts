import { PrismaClient } from "@prisma/client";

// Uses DATABASE_URL (the pooled/transaction-pooler connection) at runtime — the app never
// talks to the direct/session-pooler connection, which is reserved for `prisma migrate`.
export const prisma = new PrismaClient();
