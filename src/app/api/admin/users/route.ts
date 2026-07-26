import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理员：查询用户列表（支持邮箱搜索）
export async function GET(req: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const users = await prisma.user.findMany({
    where: q ? { email: { contains: q } } : undefined,
    select: {
      id: true,
      email: true,
      credits: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ users });
}

// 管理员：手动调整用户积分（正数增加，负数扣减）
export async function POST(req: Request) {
  const admin = await getUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { userId, delta } = await req.json().catch(() => ({}));
  const d = Number(delta);
  if (typeof userId !== "string" || !Number.isInteger(d) || d === 0 || Math.abs(d) > 100000) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  if (target.credits + d < 0) {
    return NextResponse.json({ error: "扣减后余额不能为负" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: d } },
  });
  return NextResponse.json({ ok: true, credits: updated.credits });
}
