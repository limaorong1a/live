import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

// 创作者管理自己的技能：上架 / 下架 / 删除（仅限没有运行记录的技能）
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { skillId, action } = await req.json().catch(() => ({}));
  if (
    typeof skillId !== "string" ||
    !["publish", "unpublish", "delete"].includes(action)
  ) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const skill = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!skill || skill.creatorId !== user.id) {
    return NextResponse.json({ error: "技能不存在" }, { status: 404 });
  }

  if (action === "delete") {
    const runCount = await prisma.run.count({ where: { skillId } });
    if (runCount > 0) {
      return NextResponse.json(
        { error: "该技能已有使用记录，只能下架不能删除" },
        { status: 400 }
      );
    }
    await prisma.skill.delete({ where: { id: skillId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.skill.update({
    where: { id: skillId },
    data: { published: action === "publish" },
  });
  return NextResponse.json({ ok: true });
}
