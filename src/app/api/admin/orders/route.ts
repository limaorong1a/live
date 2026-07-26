import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { markOrderPaid } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理员：查看待处理/近期订单
export async function GET(req: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";

  const orders = await prisma.order.findMany({
    where: status === "all" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  // 附带用户邮箱便于核对
  const userIds = Array.from(new Set(orders.map((o) => o.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const emailMap = new Map(users.map((u) => [u.id, u.email]));

  return NextResponse.json({
    orders: orders.map((o) => ({ ...o, email: emailMap.get(o.userId) ?? "未知" })),
  });
}

// 管理员：确认人工订单已到账（原子幂等发放积分）
export async function POST(req: Request) {
  const user = await getUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "无权限" }, { status: 403 });

  const { outTradeNo } = await req.json().catch(() => ({}));
  if (typeof outTradeNo !== "string" || !outTradeNo) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const ok = await markOrderPaid(outTradeNo);
  if (!ok) {
    return NextResponse.json({ error: "订单不存在或已处理" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
