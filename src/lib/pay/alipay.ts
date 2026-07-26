import type { CreatePaymentResult, PaymentProvider } from "../payment";
import { loadKey, rsaSign, rsaVerify } from "./sign";

// 支付宝 · 电脑网站支付（alipay.trade.page.pay），RSA2 签名。
// 官方文档：https://opendocs.alipay.com/open/270/105898
//
// 需要的环境变量：
//   ALIPAY_APP_ID       应用 APPID
//   ALIPAY_PRIVATE_KEY  应用私钥（PEM 内容或文件路径，RSA2）
//   ALIPAY_PUBLIC_KEY   支付宝公钥（PEM，用于校验回调签名）
//   ALIPAY_GATEWAY      网关地址（默认 https://openapi.alipay.com/gateway.do）
//   （回调地址默认取 NEXT_PUBLIC_SITE_URL + /api/order/notify）

function gateway(): string {
  return process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do";
}
function notifyUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/order/notify`;
}
function returnUrl(): string {
  return `${process.env.NEXT_PUBLIC_SITE_URL || ""}/account`;
}

// 支付宝要求时间戳格式 yyyy-MM-dd HH:mm:ss（东八区）
function cnTimestamp(): string {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

// 按 key 升序拼接 k=v&k=v（值为原始未编码值），用于签名/验签
function buildSignContent(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export class AlipayProvider implements PaymentProvider {
  readonly name = "alipay";

  private cfg() {
    const appId = process.env.ALIPAY_APP_ID;
    if (!appId) throw new Error("支付宝配置不完整，请检查 ALIPAY_* 环境变量");
    return { appId, privateKey: loadKey(process.env.ALIPAY_PRIVATE_KEY) };
  }

  async createPayment(order: {
    outTradeNo: string;
    amountFen: number;
    credits: number;
  }): Promise<CreatePaymentResult> {
    const { appId, privateKey } = this.cfg();
    const bizContent = JSON.stringify({
      out_trade_no: order.outTradeNo,
      total_amount: (order.amountFen / 100).toFixed(2),
      subject: `技能中转站充值 ${order.credits} 积分`,
      product_code: "FAST_INSTANT_TRADE_PAY",
    });

    const params: Record<string, string> = {
      app_id: appId,
      method: "alipay.trade.page.pay",
      format: "JSON",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: cnTimestamp(),
      version: "1.0",
      notify_url: notifyUrl(),
      return_url: returnUrl(),
      biz_content: bizContent,
    };

    const sign = rsaSign(buildSignContent(params), privateKey);
    params.sign = sign;

    const query = Object.keys(params)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");

    // 电脑网站支付：跳转到该链接进入支付宝收银台
    return { provider: this.name, payUrl: `${gateway()}?${query}` };
  }

  async verifyNotify(req: Request): Promise<{ outTradeNo: string } | null> {
    const publicKeyEnv = process.env.ALIPAY_PUBLIC_KEY;
    if (!publicKeyEnv) return null;

    const bodyText = await req.text();
    const parsed = new URLSearchParams(bodyText);
    const params: Record<string, string> = {};
    parsed.forEach((v, k) => (params[k] = v));

    const sign = params.sign;
    if (!sign) return null;
    // 验签内容需剔除 sign 和 sign_type
    const { sign: _s, sign_type: _t, ...rest } = params;
    void _s;
    void _t;
    const content = buildSignContent(rest);
    if (!rsaVerify(content, sign, loadKey(publicKeyEnv))) return null;

    if (params.trade_status === "TRADE_SUCCESS" || params.trade_status === "TRADE_FINISHED") {
      if (params.out_trade_no) return { outTradeNo: params.out_trade_no };
    }
    return null;
  }

  successResponse(): Response {
    // 支付宝要求回调处理成功后返回纯文本 success
    return new Response("success", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
