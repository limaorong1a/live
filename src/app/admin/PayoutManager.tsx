"use client";

import { useCallback, useEffect, useState } from "react";

type Payout = {
  id: string;
  email: string;
  amountFen: number;
  account: string;
  status: string;
  createdAt: string;
};

const yuan = (fen: number) => (fen / 100).toFixed(2);

export default function PayoutManager() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [status, setStatus] = useState("pending");

  const load = useCallback(async (s: string) => {
    try {
      const res = await fetch(`/api/admin/payouts?status=${s}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setPayouts(data.payouts);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [load, status]);

  const act = async (payoutId: string, action: "paid" | "reject") => {
    const label = action === "paid" ? "确认已打款" : "驳回并退回余额";
    if (!window.confirm(`${label}？`)) return;
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutId, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "操作失败");
    }
    load(status);
  };

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 text-sm">
        {[
          { k: "pending", label: "待打款" },
          { k: "paid", label: "已打款" },
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
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="py-2 pr-4">创作者</th>
              <th className="py-2 pr-4">金额</th>
              <th className="py-2 pr-4">收款账号</th>
              <th className="py-2 pr-4">状态</th>
              <th className="py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">{p.email}</td>
                <td className="py-2 pr-4 font-medium text-green-600">¥{yuan(p.amountFen)}</td>
                <td className="py-2 pr-4">{p.account}</td>
                <td className="py-2 pr-4">
                  {p.status === "paid" ? (
                    <span className="text-green-600">已打款</span>
                  ) : p.status === "pending" ? (
                    <span className="text-amber-600">待打款</span>
                  ) : (
                    <span className="text-slate-400">已驳回</span>
                  )}
                </td>
                <td className="py-2">
                  {p.status === "pending" && (
                    <span className="flex gap-2 text-xs">
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => act(p.id, "paid")}
                      >
                        已打款
                      </button>
                      <button
                        className="text-red-500 hover:underline"
                        onClick={() => act(p.id, "reject")}
                      >
                        驳回
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payouts.length === 0 && <p className="py-4 text-sm text-slate-400">暂无提现申请</p>}
      </div>
    </div>
  );
}
