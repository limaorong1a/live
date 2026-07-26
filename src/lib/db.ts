import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaTuned?: boolean;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// SQLite 并发调优：WAL 允许读写并行，busy_timeout 避免瞬时锁冲突直接报错。
// 仅对 SQLite 生效且只执行一次；用户量上来后按 README 迁移 PostgreSQL。
if (!globalForPrisma.prismaTuned && (process.env.DATABASE_URL ?? "").startsWith("file:")) {
  globalForPrisma.prismaTuned = true;
  prisma
    .$executeRawUnsafe("PRAGMA journal_mode=WAL;")
    .then(() => prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000;"))
    .catch(() => {});
}
