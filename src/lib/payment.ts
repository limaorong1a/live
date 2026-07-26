// 支付层：可插拔网关。默认「人工确认」模式（先跑通业务、无需资质即可运营），
// 拿到微信/支付宝商户号后，实现对应 Provider 并在 getProvider 里切换即可，
// 上层订单流程（下单、到账、加积分）完全不用改。

import { randomBytes } from "crypto";

export type RechargePackage = {
  id: string;
  credits: number;
  amountFen: number; // 价格（分）
  label?: string;
};

// 充值档位（与账户页价目表一致）。金额单位为分。
export const PACKAGES: RechargePackage[] = [
  { id: "p100", credits: 100, amountFen: 990 },
  { id: "p300", credits: 300, amountFen: 2500 },
  { id: "p600", credits: 600, amountFen: 4500, label: "超值" },
  { id: "p1500", credits: 1500, amountFen: 9900, label: "最划算" },
];

export function findPackage(id: string): RechargePackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

export function genOutTradeNo(): string {
  return "SR" + Date.now().toString(36).toUpperCase() + randomBytes(3).toString("hex").toUpperCase();
}

export function yuan(amountFen: number): string {
  return (amountFen / 100).toFixed(2);
}

export type CreatePaymentResult = {
  provider: string;
  // 人工模式：展示给用户的付款指引文案
  instructions?: string;
  // 真实网关：跳转支付的链接或二维码内容
  payUrl?: string;
  qrData?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(order: {
    outTradeNo: string;
    amountFen: number;
    credits: number;
  }): Promise<CreatePaymentResult>;
  /** 校验支付回调，返回商户订单号（验签通过且支付成功）或 null */
  verifyNotify(req: Request): Promise<{ outTradeNo: string } | null>;
}

// 人工确认模式：下单后展示客服联系方式与订单号，用户线下付款、管理员后台确认到账
class ManualProvider implements PaymentProvider {
  readonly name = "manual";
  async createPayment(order: { outTradeNo: string; amountFen: number }) {
    const contact = process.env.NEXT_PUBLIC_SUPPORT_CONTACT || "客服微信：skillrelay";
    return {
      provider: this.name,
      instructions:
        `请通过「${contact}」联系客服，备注订单号 ${order.outTradeNo}，` +
        `支付 ¥${yuan(order.amountFen)} 后由客服确认，积分将自动到账。`,
    };
  }
  async verifyNotify() {
    // 人工模式无回调，由管理员在后台手动确认
    return null;
  }
}

// TODO: 实现真实网关（示意）。拿到商户号后填充并在 getProvider 切换。
// class WechatProvider implements PaymentProvider { ... 统一下单 + 验签回调 ... }
// class AlipayProvider implements PaymentProvider { ... }

export function getProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    // case "wechat": return new WechatProvider();
    // case "alipay": return new AlipayProvider();
    default:
      return new ManualProvider();
  }
}
