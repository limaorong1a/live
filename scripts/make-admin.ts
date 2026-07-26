// 把指定邮箱的用户设为管理员：npm run admin -- you@example.com
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("用法: npm run admin -- <邮箱>");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { isAdmin: true },
  });
  console.log(`✅ ${user.email} 已设为管理员`);
}

main()
  .catch((e) => {
    console.error("失败：", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
