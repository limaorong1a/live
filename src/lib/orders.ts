import { prisma } from "@/lib/db";

/**
 * 将订单标记为已支付并发放积分，全程原子且幂等：
 * 仅当订单当前为 pending 时才发放，防止回调/人工重复到账。
 * 返回 true 表示本次成功入账，false 表示订单不存在或已处理。
 */
export async function markOrderPaid(outTradeNo: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.order.updateMany({
      where: { outTradeNo, status: "pending" },
      data: { status: "paid", paidAt: new Date() },
    });
    if (claim.count === 0) return false;

    const order = await tx.order.findUnique({ where: { outTradeNo } });
    if (!order) return false;

    await tx.user.update({
      where: { id: order.userId },
      data: { credits: { increment: order.credits } },
    });
    await tx.auditLog.create({
      data: {
        type: "order_paid",
        userId: order.userId,
        detail: `${outTradeNo} +${order.credits}积分 ¥${(order.amountFen / 100).toFixed(2)}`,
      },
    });
    return true;
  });
}
