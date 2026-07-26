import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payment";
import { markOrderPaid } from "@/lib/orders";

export const runtime = "nodejs";

// 支付网关异步回调入口（真实网关模式使用；人工模式此路由不会被调用）
export async function POST(req: Request) {
  const provider = getProvider();
  const result = await provider.verifyNotify(req).catch(() => null);
  if (!result) {
    return NextResponse.json({ error: "验签失败" }, { status: 400 });
  }
  await markOrderPaid(result.outTradeNo).catch(() => {});
  // 多数网关要求返回特定成功报文，实现真实 Provider 时按其要求调整
  return NextResponse.json({ ok: true });
}
