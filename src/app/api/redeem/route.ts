import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "请输入卡密" }, { status: 400 });
  }
  const normalized = code.trim().toUpperCase();

  try {
    const credits = await prisma.$transaction(async (tx) => {
      const redeem = await tx.redeemCode.findUnique({ where: { code: normalized } });
      if (!redeem) throw new Error("卡密不存在");

      // 条件更新：仅当尚未被使用时才占用，避免并发重复兑换
      const claim = await tx.redeemCode.updateMany({
        where: { code: normalized, usedById: null },
        data: { usedById: user.id, usedAt: new Date() },
      });
      if (claim.count === 0) throw new Error("卡密已被使用");

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { credits: { increment: redeem.credits } },
      });
      return { after: updated.credits, added: redeem.credits };
    });

    await prisma.auditLog
      .create({
        data: {
          type: "redeem",
          userId: user.id,
          ip: clientIp(req),
          detail: `${normalized} (+${credits.added})`,
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, credits: credits.after });
  } catch (e) {
    // 只透传自己抛出的业务错误，其余（如数据库异常）统一兜底文案
    const known = ["卡密不存在", "卡密已被使用"];
    const msg = e instanceof Error && known.includes(e.message) ? e.message : "兑换失败，请重试";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
