"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Earning = { id: string; amountFen: number; createdAt: string };
type Payout = { id: string; amountFen: number; account: string; status: string; createdAt: string };
type Info = {
  earningsFen: number;
  minFen: number;
  recentEarnings: Earning[];
  payouts: Payout[];
};

const yuan = (fen: number) => (fen / 100).toFixed(2);
const statusText: Record<string, string> = {
  pending: "处理中",
  paid: "已打款",
  rejected: "已驳回(退回)",
};

export default function EarningsCard() {
  const [info, setInfo] = useState<Info | null>(null);
  const [account, setAccount] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/payout", { cache: "no-store" });
      if (!res.ok) return;
      setInfo(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "申请失败");
      setMsg({ ok: true, text: `已提交提现申请 ¥${yuan(data.amountFen)}，等待打款` });
      setAccount("");
      load();
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "申请失败" });
    } finally {
      setLoading(false);
    }
  };

  // 无收益且无历史则不展示（非创作者用户）
  if (!info || (info.earningsFen === 0 && info.recentEarnings.length === 0 && info.payouts.length === 0)) {
    return null;
  }

  const canWithdraw = info.earningsFen >= info.minFen;

  return (
    <div className="card">
      <h2 className="mb-1 font-semibold text-slate-900">创作收益</h2>
      <p className="text-3xl font-bold text-green-600">
        ¥{yuan(info.earningsFen)}
        <span className="ml-1 text-sm font-normal text-slate-500">可提现</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        用户每次使用你的技能，你都会获得分成。满 ¥{yuan(info.minFen)} 可提现。
      </p>

      <div className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          placeholder="收款账号（微信/支付宝，或姓名+账号）"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
        <button
          className="btn-primary shrink-0"
          onClick={withdraw}
          disabled={loading || !canWithdraw || !account.trim()}
        >
          {loading ? "提交中…" : "申请提现"}
        </button>
      </div>
      {!canWithdraw && info.earningsFen > 0 && (
        <p className="mt-1 text-xs text-amber-600">
          还差 ¥{yuan(info.minFen - info.earningsFen)} 达到提现门槛
        </p>
      )}
      {msg && (
        <p className={`mt-2 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      {info.payouts.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-slate-500">提现记录</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {info.payouts.map((p) => (
              <li key={p.id} className="flex justify-between py-1.5">
                <span>¥{yuan(p.amountFen)}</span>
                <span className="text-slate-400">
                  {statusText[p.status] ?? p.status} ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
