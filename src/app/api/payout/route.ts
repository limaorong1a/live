import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { PAYOUT_MIN_FEN } from "@/lib/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 创作者：查询收益与提现记录
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const [earnings, payouts] = await Promise.all([
    prisma.creatorEarning.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.payout.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    earningsFen: user.earningsFen,
    minFen: PAYOUT_MIN_FEN,
    recentEarnings: earnings,
    payouts,
  });
}

// 创作者：申请提现（原子扣减可提现余额，生成待处理提现单）
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`payout:${user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "申请太频繁，请稍后再试" }, { status: 429 });
  }

  const { account } = await req.json().catch(() => ({}));
  if (typeof account !== "string" || account.trim().length < 4 || account.length > 100) {
    return NextResponse.json({ error: "请填写有效的收款账号" }, { status: 400 });
  }

  const amount = user.earningsFen;
  if (amount < PAYOUT_MIN_FEN) {
    return NextResponse.json(
      { error: `满 ¥${(PAYOUT_MIN_FEN / 100).toFixed(2)} 才可提现，当前 ¥${(amount / 100).toFixed(2)}` },
      { status: 400 }
    );
  }

  // 原子扣减：仅当余额仍等于读到的值时才提走，防并发重复提现
  const claim = await prisma.user.updateMany({
    where: { id: user.id, earningsFen: amount },
    data: { earningsFen: 0 },
  });
  if (claim.count === 0) {
    return NextResponse.json({ error: "余额有变动，请刷新后重试" }, { status: 409 });
  }

  await prisma.payout.create({
    data: { userId: user.id, amountFen: amount, account: account.trim() },
  });
  return NextResponse.json({ ok: true, amountFen: amount });
}
