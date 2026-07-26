"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckInCard() {
  const [done, setDone] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/checkin", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.done === "boolean") {
          setDone(d.done);
          setStreak(d.streak ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const checkIn = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "签到失败");
        if (data.error?.includes("已签到")) setDone(true);
        return;
      }
      setDone(true);
      setStreak(data.streak);
      setMsg(`签到成功，+${data.reward} 积分！已连续 ${data.streak} 天`);
      window.dispatchEvent(new Event("sr:credits-changed"));
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex items-center justify-between">
      <div>
        <h2 className="font-semibold text-slate-900">每日签到</h2>
        <p className="mt-1 text-sm text-slate-500">
          {streak > 0 ? `已连续签到 ${streak} 天，` : ""}
          连续签到奖励递增，别断签～
        </p>
        {msg && <p className="mt-1 text-sm text-green-600">{msg}</p>}
      </div>
      <button
        className="btn-primary shrink-0"
        onClick={checkIn}
        disabled={loading || done === true}
      >
        {done === true ? "今日已签到 ✓" : loading ? "签到中…" : "签到领积分"}
      </button>
    </div>
  );
}
