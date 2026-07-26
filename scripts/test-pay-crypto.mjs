// 验证支付签名/验签/解密逻辑（用自签密钥模拟，不依赖真实网关）
import crypto from "crypto";

let pass = 0,
  fail = 0;
const ok = (name, cond) => {
  if (cond) {
    pass++;
    console.log("✅ " + name);
  } else {
    fail++;
    console.log("❌ " + name);
  }
};

// —— 复刻 sign.ts 的核心函数 ——
function rsaSign(message, privateKeyPem) {
  const s = crypto.createSign("RSA-SHA256");
  s.update(message, "utf8");
  return s.sign(privateKeyPem, "base64");
}
function rsaVerify(message, sigB64, publicKeyPem) {
  try {
    const v = crypto.createVerify("RSA-SHA256");
    v.update(message, "utf8");
    return v.verify(publicKeyPem, sigB64, "base64");
  } catch {
    return false;
  }
}
function aesGcmDecrypt(key, nonce, aad, ciphertextB64) {
  const ct = Buffer.from(ciphertextB64, "base64");
  const tag = ct.subarray(ct.length - 16);
  const data = ct.subarray(0, ct.length - 16);
  const d = crypto.createDecipheriv("aes-256-gcm", Buffer.from(key, "utf8"), Buffer.from(nonce, "utf8"));
  d.setAuthTag(tag);
  d.setAAD(Buffer.from(aad, "utf8"));
  return d.update(data, undefined, "utf8") + d.final("utf8");
}
function buildSignContent(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

// 1) RSA-SHA256 签名/验签 round-trip（微信 auth 签名 & 支付宝 RSA2 同此）
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const msg = "POST\n/v3/pay/transactions/native\n1700000000\nabcdef\n{\"a\":1}\n";
const sig = rsaSign(msg, privateKey);
ok("RSA-SHA256 签名可被公钥验签", rsaVerify(msg, sig, publicKey));
ok("篡改内容后验签失败", !rsaVerify(msg + "x", sig, publicKey));

// 2) AES-256-GCM 解密（微信回调解密）
const apiv3Key = "01234567890123456789012345678901"; // 32 位
const nonce = "abcdefghijkl"; // 12 位
const aad = "transaction";
const plaintext = JSON.stringify({ out_trade_no: "SRTEST123", trade_state: "SUCCESS" });
const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(apiv3Key, "utf8"), Buffer.from(nonce, "utf8"));
cipher.setAAD(Buffer.from(aad, "utf8"));
const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
const authTag = cipher.getAuthTag();
const ciphertextB64 = Buffer.concat([enc, authTag]).toString("base64");
const decrypted = aesGcmDecrypt(apiv3Key, nonce, aad, ciphertextB64);
ok("AES-256-GCM 解密还原明文", decrypted === plaintext);
ok("解密后能取到 out_trade_no", JSON.parse(decrypted).out_trade_no === "SRTEST123");

// 3) 模拟支付宝回调验签全流程
const notifyParams = {
  app_id: "2021000000000000",
  trade_status: "TRADE_SUCCESS",
  out_trade_no: "SRALIPAY999",
  total_amount: "9.90",
  gmt_payment: "2026-07-26 12:00:00",
};
const content = buildSignContent(notifyParams);
const alipaySign = rsaSign(content, privateKey); // 支付宝用应用私钥签，商户用支付宝公钥验
// 商户侧：剔除 sign/sign_type 后重建 content 验签
const received = { ...notifyParams, sign: alipaySign, sign_type: "RSA2" };
const { sign: _s, sign_type: _t, ...rest } = received;
const verified = rsaVerify(buildSignContent(rest), received.sign, publicKey);
ok("支付宝回调验签通过", verified);
ok("回调 trade_status 为成功", received.trade_status === "TRADE_SUCCESS");
ok("伪造 out_trade_no 后验签失败", !rsaVerify(buildSignContent({ ...rest, out_trade_no: "HACK" }), received.sign, publicKey));

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
