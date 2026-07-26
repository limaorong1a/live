import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { computeCheckIn, dayKey } from "@/lib/checkin";

export const runtime = "nodejs";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`checkin:${user.id}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "操作太频繁" }, { status: 429 });
  }

  const now = new Date();
  const result = computeCheckIn(now, user.lastCheckInAt, user.streak);
  if (result.alreadyDone) {
    return NextResponse.json({ error: "今天已签到，明天再来" }, { status: 400 });
  }

  // 条件更新防并发重复签到：仅当 lastCheckInAt 仍是读到的值时才写入
  const updated = await prisma.user.updateMany({
    where: {
      id: user.id,
      lastCheckInAt: user.lastCheckInAt,
    },
    data: {
      credits: { increment: result.reward },
      streak: result.newStreak,
      maxStreak: Math.max(user.maxStreak, result.newStreak),
      lastCheckInAt: now,
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "今天已签到，明天再来" }, { status: 400 });
  }

  const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  return NextResponse.json({
    ok: true,
    reward: result.reward,
    streak: result.newStreak,
    credits: fresh.credits,
  });
}

// 查询今日是否可签到及连续天数
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ user: null });
  const done =
    !!user.lastCheckInAt && dayKey(user.lastCheckInAt) === dayKey(new Date());
  return NextResponse.json({ done, streak: user.streak });
}
