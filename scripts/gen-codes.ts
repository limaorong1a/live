// 生成充值卡密：npm run codes -- <数量> <面值积分>
// 例：npm run codes -- 10 50  → 生成 10 张 50 积分的卡密
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const count = parseInt(process.argv[2] ?? "5", 10);
  const credits = parseInt(process.argv[3] ?? "100", 10);
  if (!Number.isFinite(count) || !Number.isFinite(credits) || count <= 0 || credits <= 0) {
    console.error("用法: npm run codes -- <数量> <面值积分>");
    process.exit(1);
  }
  console.log(`生成 ${count} 张 ${credits} 积分卡密：`);
  for (let i = 0; i < count; i++) {
    const code = "SR-" + randomBytes(4).toString("hex").toUpperCase();
    await prisma.redeemCode.create({ data: { code, credits } });
    console.log("  " + code);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
