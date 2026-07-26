// 简单的内存滑动窗口限流器。单机部署够用；多实例部署时应换成 Redis。

const buckets = new Map<string, number[]>();

/** 返回 true 表示放行，false 表示触发限流 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    buckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  // 防止 Map 无限增长
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

// 只有当应用确实部署在自己可信的反向代理（如自建 Nginx）之后时，
// 才信任 X-Forwarded-For。设置环境变量 TRUSTED_PROXY=true 开启。
// 否则 XFF 完全由客户端伪造，用它做限流键等于没有限流。
const TRUST_PROXY = process.env.TRUSTED_PROXY === "true";

export function clientIp(req: Request): string {
  if (TRUST_PROXY) {
    const fwd = req.headers.get("x-forwarded-for");
    // 可信代理会把真实客户端 IP 追加为最右一跳
    const parts = fwd?.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts && parts.length > 0) return parts[parts.length - 1];
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}
