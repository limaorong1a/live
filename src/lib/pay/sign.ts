import crypto from "crypto";
import { readFileSync } from "fs";

// 支付网关通用的签名 / 验签 / 解密工具。
// 微信支付 v3 使用 RSA-SHA256（RSA2048）；支付宝 RSA2 同为 SHA256withRSA。

/**
 * 从环境变量读取 PEM 密钥：
 * - 以 "-----BEGIN" 开头：直接作为 PEM（支持用 \n 表示换行）
 * - 否则视为文件路径，读取文件内容
 */
export function loadKey(envValue: string | undefined): string {
  if (!envValue) throw new Error("密钥未配置");
  const v = envValue.trim();
  if (v.startsWith("-----BEGIN")) {
    return v.replace(/\\n/g, "\n");
  }
  return readFileSync(v, "utf8");
}

/** RSA-SHA256 签名，返回 base64 */
export function rsaSign(message: string, privateKeyPem: string): string {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(message, "utf8");
  return signer.sign(privateKeyPem, "base64");
}

/** RSA-SHA256 验签 */
export function rsaVerify(
  message: string,
  signatureB64: string,
  publicKeyPem: string
): boolean {
  try {
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(message, "utf8");
    return verifier.verify(publicKeyPem, signatureB64, "base64");
  } catch {
    return false;
  }
}

/**
 * 微信支付 v3 回调报文解密（AES-256-GCM）。
 * key 为 32 字节 APIv3 密钥；nonce/associatedData/ciphertext 来自回调 resource。
 */
export function aesGcmDecrypt(
  key: string,
  nonce: string,
  associatedData: string,
  ciphertextB64: string
): string {
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "utf8"),
    Buffer.from(nonce, "utf8")
  );
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}

export function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}
