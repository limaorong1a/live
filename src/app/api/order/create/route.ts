import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { findPackage, genOutTradeNo, getProvider } from "@/lib/payment";

export const runtime = "nodejs";

// 创建充值订单，返回付款指引
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!rateLimit(`order:${user.id}`, 10, 60 * 1000)) {
    return NextResponse.json({ error: "操作太频繁，请稍后再试" }, { status: 429 });
  }

  const { packageId } = await req.json().catch(() => ({}));
  const pkg = typeof packageId === "string" ? findPackage(packageId) : undefined;
  if (!pkg) return NextResponse.json({ error: "充值档位不存在" }, { status: 400 });

  const provider = getProvider();
  const outTradeNo = genOutTradeNo();

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      credits: pkg.credits,
      amountFen: pkg.amountFen,
      provider: provider.name,
      outTradeNo,
    },
  });

  const payment = await provider.createPayment({
    outTradeNo,
    amountFen: pkg.amountFen,
    credits: pkg.credits,
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    outTradeNo,
    amountFen: pkg.amountFen,
    credits: pkg.credits,
    ...payment,
  });
}
