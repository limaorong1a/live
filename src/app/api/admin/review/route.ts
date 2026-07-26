import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

// 管理员审核创作者提交的技能
export async function POST(req: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { skillId, action } = await req.json().catch(() => ({}));
  if (typeof skillId !== "string" || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill) return NextResponse.json({ error: "技能不存在" }, { status: 404 });

  await prisma.skill.update({
    where: { id: skillId },
    data: { reviewStatus: action === "approve" ? "approved" : "rejected" },
  });
  return NextResponse.json({ ok: true });
}
