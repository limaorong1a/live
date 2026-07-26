import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

// 收藏 / 取消收藏（幂等切换）
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { skillId } = await req.json().catch(() => ({}));
  if (typeof skillId !== "string") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) return NextResponse.json({ error: "技能不存在" }, { status: 404 });

  const existing = await prisma.favorite.findUnique({
    where: { userId_skillId: { userId: user.id, skillId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, favorited: false });
  }
  await prisma.favorite.create({ data: { userId: user.id, skillId } });
  return NextResponse.json({ ok: true, favorited: true });
}
