"use client";

import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  outTradeNo: string;
  email: string;
  credits: number;
  amountFen: number;
  status: string;
  provider: string;
  createdAt: string;
};

export default function OrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders?status=${s}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setOrders(data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const confirm = async (outTradeNo: string) => {
    if (!window.confirm(`确认订单 ${outTradeNo} 已收款并发放积分？`)) return;
    const res = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outTradeNo }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "操作失败");
      return;
    }
    load(status);
  };

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 text-sm">
        {[
          { k: "pending", label: "待确认" },
          { k: "paid", label: "已到账" },
          { k: "all", label: "全部" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setStatus(t.k)}
            className={`rounded-full px-3 py-1 ${
              status === t.k ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 pr-4">订单号</th>
              <th className="py-2 pr-4">用户</th>
              <th className="py-2 pr-4">积分</th>
              <th className="py-2 pr-4">金额</th>
              <th className="py-2 pr-4">状态</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-mono text-xs">{o.outTradeNo}</td>
                <td className="py-2 pr-4">{o.email}</td>
                <td className="py-2 pr-4">{o.credits}</td>
                <td className="py-2 pr-4">¥{(o.amountFen / 100).toFixed(2)}</td>
                <td className="py-2 pr-4">
                  {o.status === "paid" ? (
                    <span className="text-green-600">已到账</span>
                  ) : o.status === "pending" ? (
                    <span className="text-amber-600">待确认</span>
                  ) : (
                    <span className="text-slate-400">{o.status}</span>
                  )}
                </td>
                <td className="py-2">
                  {o.status === "pending" && (
                    <button
                      className="text-xs text-brand-600 hover:underline"
                      onClick={() => confirm(o.outTradeNo)}
                    >
                      确认到账
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !error && (
          <p className="py-4 text-sm text-slate-400">暂无订单</p>
        )}
      </div>
    </div>
  );
}
