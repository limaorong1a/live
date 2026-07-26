import QRCode from "qrcode";
import type { CreatePaymentResult, PaymentProvider } from "../payment";
import { aesGcmDecrypt, loadKey, randomHex, rsaSign, rsaVerify } from "./sign";

// 微信支付 v3 · Native 扫码支付。
// 官方文档：https://pay.weixin.qq.com/docs/merchant/apis/native-payment/direct-jsapi.html
//
// 需要的环境变量：
//   WECHAT_APPID          公众号/小程序/APP 的 appid
//   WECHAT_MCHID          商户号
//   WECHAT_PRIVATE_KEY    商户 API 证书私钥（PEM 内容或文件路径）
//   WECHAT_SERIAL_NO      商户 API 证书序列号
//   WECHAT_APIV3_KEY      APIv3 密钥（32 位，用于回调解密）
//   WECHAT_PLATFORM_PUBLIC_KEY  微信支付平台证书公钥（PEM，可选；配置后校验回调签名）
//   （回调地址默认取 NEXT_PUBLIC_SITE_URL + /api/order/notify）

const HOST = "https://api.mch.weixin.qq.com";
const PATH = "/v3/pay/transactions/native";

function notifyUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}/api/order/notify`;
}

export class WechatProvider implements PaymentProvider {
  readonly name = "wechat";

  private cfg() {
    const appid = process.env.WECHAT_APPID;
    const mchid = process.env.WECHAT_MCHID;
    const serialNo = process.env.WECHAT_SERIAL_NO;
    const apiv3Key = process.env.WECHAT_APIV3_KEY;
    if (!appid || !mchid || !serialNo || !apiv3Key) {
      throw new Error("微信支付配置不完整，请检查 WECHAT_* 环境变量");
    }
    return {
      appid,
      mchid,
      serialNo,
      apiv3Key,
      privateKey: loadKey(process.env.WECHAT_PRIVATE_KEY),
    };
  }

  async createPayment(order: {
    outTradeNo: string;
    amountFen: number;
    credits: number;
  }): Promise<CreatePaymentResult> {
    const { appid, mchid, serialNo, privateKey } = this.cfg();
    const body = JSON.stringify({
      appid,
      mchid,
      description: `技能中转站充值 ${order.credits} 积分`,
      out_trade_no: order.outTradeNo,
      notify_url: notifyUrl(),
      amount: { total: order.amountFen, currency: "CNY" },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = randomHex(16);
    const message = `POST\n${PATH}\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = rsaSign(message, privateKey);
    const auth =
      `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",` +
      `signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;

    const res = await fetch(`${HOST}${PATH}`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.code_url) {
      throw new Error(`微信下单失败：${json.message || res.status}`);
    }

    // Native 支付返回 code_url，需渲染为二维码供用户扫码
    const qrData = await QRCode.toDataURL(json.code_url, { margin: 1, width: 240 });
    return { provider: this.name, qrData };
  }

  async verifyNotify(req: Request): Promise<{ outTradeNo: string } | null> {
    const { apiv3Key } = this.cfg();
    const bodyText = await req.text();

    // 若配置了平台公钥，则校验回调签名，进一步防伪造
    const platformKey = process.env.WECHAT_PLATFORM_PUBLIC_KEY;
    if (platformKey) {
      const ts = req.headers.get("Wechatpay-Timestamp") ?? "";
      const nonce = req.headers.get("Wechatpay-Nonce") ?? "";
      const sig = req.headers.get("Wechatpay-Signature") ?? "";
      const message = `${ts}\n${nonce}\n${bodyText}\n`;
      if (!rsaVerify(message, sig, loadKey(platformKey))) return null;
    }

    let payload: {
      resource?: { ciphertext: string; nonce: string; associated_data: string };
    };
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return null;
    }
    const r = payload.resource;
    if (!r) return null;

    try {
      const decrypted = aesGcmDecrypt(apiv3Key, r.nonce, r.associated_data, r.ciphertext);
      const data = JSON.parse(decrypted) as {
        out_trade_no?: string;
        trade_state?: string;
      };
      if (data.trade_state === "SUCCESS" && data.out_trade_no) {
        return { outTradeNo: data.out_trade_no };
      }
    } catch {
      return null;
    }
    return null;
  }

  successResponse(): Response {
    return new Response(JSON.stringify({ code: "SUCCESS", message: "成功" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
