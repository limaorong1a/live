import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

// 管理员批量生成充值卡密
export async function POST(req: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { count, credits } = await req.json().catch(() => ({}));
  const n = Number(count);
  const c = Number(credits);
  if (!Number.isInteger(n) || n < 1 || n > 100)
    return NextResponse.json({ error: "数量必须是 1-100 的整数" }, { status: 400 });
  if (!Number.isInteger(c) || c < 1 || c > 100000)
    return NextResponse.json({ error: "面值必须是 1-100000 的整数" }, { status: 400 });

  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = "SR-" + randomBytes(4).toString("hex").toUpperCase();
    await prisma.redeemCode.create({ data: { code, credits: c } });
    codes.push(code);
  }
  return NextResponse.json({ ok: true, codes });
}
