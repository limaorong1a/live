"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Pkg = { id: string; credits: number; amountFen: number; label?: string };

const PACKAGES: Pkg[] = [
  { id: "p100", credits: 100, amountFen: 990 },
  { id: "p300", credits: 300, amountFen: 2500 },
  { id: "p600", credits: 600, amountFen: 4500, label: "超值" },
  { id: "p1500", credits: 1500, amountFen: 9900, label: "最划算" },
];

type OrderInfo = {
  orderId: string;
  outTradeNo: string;
  amountFen: number;
  credits: number;
  instructions?: string;
  payUrl?: string;
};

export default function RechargeCard() {
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const buy = async (pkg: Pkg) => {
    setError(null);
    setPaid(false);
    setLoading(pkg.id);
    try {
      const res = await fetch("/api/order/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "下单失败");
      setOrder(data);
      // 真实网关：若返回支付链接则跳转
      if (data.payUrl) window.location.href = data.payUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "下单失败");
    } finally {
      setLoading(null);
    }
  };

  // 有未支付订单时轮询到账状态
  useEffect(() => {
    if (!order || paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/order/status?id=${order.orderId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.status === "paid") {
          setPaid(true);
          window.dispatchEvent(new Event("sr:credits-changed"));
          router.refresh();
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // ignore
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [order, paid, router]);

  return (
    <div className="card">
      <h2 className="mb-3 font-semibold text-slate-900">充值积分</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PACKAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => buy(p)}
            disabled={loading !== null}
            className="relative rounded-lg border border-slate-200 p-3 text-center transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
          >
            {p.label && (
              <span className="absolute -top-2 right-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                {p.label}
              </span>
            )}
            <p className="text-lg font-bold text-amber-600">{p.credits}</p>
            <p className="text-xs text-slate-400">积分</p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              ¥{(p.amountFen / 100).toFixed(2)}
            </p>
            {loading === p.id && <p className="mt-1 text-xs text-slate-400">下单中…</p>}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {order && !paid && (
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-800">
            订单已创建：{order.credits} 积分 / ¥{(order.amountFen / 100).toFixed(2)}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            订单号：{order.outTradeNo}
          </p>
          {order.instructions && (
            <p className="mt-2 text-slate-600">{order.instructions}</p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            付款完成后本页会自动刷新到账（也可稍后回到本页查看余额）。
          </p>
        </div>
      )}

      {paid && (
        <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          ✅ 充值成功，积分已到账！
        </div>
      )}
    </div>
  );
}
