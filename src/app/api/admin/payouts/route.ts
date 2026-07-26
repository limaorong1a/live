import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理员：查看提现申请
export async function GET(req: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const payouts = await prisma.payout.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const userIds = Array.from(new Set(payouts.map((p) => p.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const emailMap = new Map(users.map((u) => [u.id, u.email]));
  return NextResponse.json({
    payouts: payouts.map((p) => ({ ...p, email: emailMap.get(p.userId) ?? "未知" })),
  });
}

// 管理员：标记提现已打款 / 驳回（驳回则退回创作者余额）
export async function POST(req: Request) {
  const admin = await getUser();
  if (!admin?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { payoutId, action } = await req.json().catch(() => ({}));
  if (typeof payoutId !== "string" || (action !== "paid" && action !== "reject")) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout || payout.status !== "pending") {
    return NextResponse.json({ error: "提现单不存在或已处理" }, { status: 400 });
  }

  if (action === "paid") {
    await prisma.payout.update({
      where: { id: payoutId },
      data: { status: "paid", paidAt: new Date() },
    });
  } else {
    // 驳回：退回创作者可提现余额
    await prisma.$transaction([
      prisma.payout.update({ where: { id: payoutId }, data: { status: "rejected" } }),
      prisma.user.update({
        where: { id: payout.userId },
        data: { earningsFen: { increment: payout.amountFen } },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
