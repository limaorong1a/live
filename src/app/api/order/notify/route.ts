import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payment";
import { markOrderPaid } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 支付网关异步回调入口（真实网关模式使用；人工模式此路由不会被调用）
export async function POST(req: Request) {
  const provider = getProvider();
  const result = await provider.verifyNotify(req).catch((e) => {
    console.error("[notify] verify error:", e instanceof Error ? e.message : e);
    return null;
  });
  if (!result) {
    return NextResponse.json({ error: "验签失败" }, { status: 400 });
  }
  await markOrderPaid(result.outTradeNo).catch((e) => {
    console.error("[notify] markPaid error:", e instanceof Error ? e.message : e);
  });
  // 按网关要求返回成功报文（微信 JSON、支付宝纯文本 success）
  return provider.successResponse();
}
