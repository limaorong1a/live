import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "请输入卡密" }, { status: 400 });
  }

  try {
    const credits = await prisma.$transaction(async (tx) => {
      const redeem = await tx.redeemCode.findUnique({
        where: { code: code.trim().toUpperCase() },
      });
      if (!redeem) throw new Error("卡密不存在");
      if (redeem.usedById) throw new Error("卡密已被使用");
      await tx.redeemCode.update({
        where: { id: redeem.id },
        data: { usedById: user.id, usedAt: new Date() },
      });
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { credits: { increment: redeem.credits } },
      });
      return updated.credits;
    });
    return NextResponse.json({ ok: true, credits });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "兑换失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
